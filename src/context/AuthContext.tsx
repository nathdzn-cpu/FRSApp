"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Profile } from '@/utils/mockData';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

type UserRole = 'admin' | 'office' | 'driver' | undefined;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: 'admin' | 'office' | 'driver' | undefined;
  isAdmin: boolean;
  isOffice: boolean;
  isOfficeOrAdmin: boolean;
  isDriver: boolean;
  isLoadingAuth: boolean;
  logout: () => Promise<void>;
  currentOrgId: string | undefined;
  refreshProfile: () => Promise<void>;
  login: (organisationKey: string, userIdOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children, initialSession, initialUser }: { children: ReactNode; initialSession: Session | null; initialUser: User | null }) => {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = userRole === 'admin';
  const isOffice = userRole === 'office';
  const isOfficeOrAdmin = userRole === 'admin' || userRole === 'office';
  const isDriver = userRole === 'driver';

  const currentUserIdRef = useRef<string | null>(initialUser?.id || null);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    console.log("AuthContextProvider: fetchProfile called for user:", currentUser?.id);
    setProfile(null);
    setUserRole(undefined);
    if (!currentUser) {
      console.log("AuthContextProvider: No current user, skipping profile fetch.");
      return;
    }

    try {
      const { data: fetchedProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("AuthContextProvider: Error fetching profile from DB:", profileError);
        toast.error("Failed to load user profile.");
        setProfile(null);
        setUserRole(undefined);
      } else if (fetchedProfile) {
        console.log("AuthContextProvider: Profile fetched successfully:", fetchedProfile);
        // Fetch avatar URL
        const { data: publicUrlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(`${currentUser.id}.png`); // Assuming .png extension

        const avatarUrl = publicUrlData?.publicUrl || null;

        const fullProfile = { ...fetchedProfile as Profile, avatar_url: avatarUrl };
        setProfile(fullProfile);
        setUserRole(fullProfile.role);
      } else {
        console.log("AuthContextProvider: No profile row found for this user.");
        toast.error("No user profile found. Please contact an administrator.");
        setProfile(null);
        setUserRole(undefined);
      }
    } catch (error) {
      console.error("AuthContextProvider: Unexpected error fetching profile:", error);
      toast.error("An unexpected error occurred while fetching profile.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  // Effect for initial session load and auth state changes
  useEffect(() => {
    let mounted = true;
    console.log("AuthContextProvider: useEffect for auth state changes mounted.");

    // Hydrate session once on mount
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        console.log("AuthContextProvider: Initial getSession data:", data);
        setSession(data.session || null);
        setUser(data.session?.user || null);
        currentUserIdRef.current = data.session?.user?.id || null;
        setIsLoadingAuth(false);
      }
    }).catch(err => {
      console.error("AuthContextProvider: Error during initial getSession:", err);
      setIsLoadingAuth(false); // Ensure loading state is cleared even on error
    });

    // Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log("AuthContextProvider: Supabase auth event:", event, "Session user ID:", session?.user?.id);
      if (mounted) {
        if (event === 'SIGNED_IN') {
          if (session?.user?.id && session.user.id !== currentUserIdRef.current) {
            console.log("AuthContextProvider: SIGNED_IN - New user detected.");
            setSession(session);
            setUser(session.user);
            currentUserIdRef.current = session.user.id;
            setIsLoadingAuth(false);
          } else if (!session?.user?.id && currentUserIdRef.current) {
            console.log("AuthContextProvider: SIGNED_IN with no user, but ref had one. Treating as sign out.");
            setSession(null);
            setUser(null);
            currentUserIdRef.current = null;
            setIsLoadingAuth(false);
          } else {
            console.log("AuthContextProvider: SIGNED_IN - Same user, no state change.");
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthContextProvider: SIGNED_OUT event.");
          setSession(null);
          setUser(null);
          currentUserIdRef.current = null;
          setIsLoadingAuth(false);
        } else {
          console.log(`AuthContextProvider: Auth event '${event}' - no explicit state change.`);
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      console.log("AuthContextProvider: useEffect for auth state changes unmounted.");
    };
  }, []);

  useEffect(() => {
    console.log("AuthContextProvider: useEffect for user/profile changes. User:", user?.id, "isLoadingAuth:", isLoadingAuth);
    if (user && !isLoadingAuth) {
      fetchProfile(user);
    } else if (!user) {
      console.log("AuthContextProvider: No user, clearing profile/role.");
      setProfile(null);
      setUserRole(undefined);
    }
  }, [user, fetchProfile, isLoadingAuth]);

  // Redirection logic based on profile/role
  useEffect(() => {
    console.log("AuthContextProvider: useEffect for redirection. isLoadingAuth:", isLoadingAuth, "User:", user?.id, "UserRole:", userRole, "Path:", location.pathname);
    if (!isLoadingAuth && user) {
      if (location.pathname === '/login') {
        if (userRole === 'admin') {
          console.log("AuthContextProvider: Redirecting to /admin/users (admin).");
          navigate('/admin/users');
        } else if (userRole === 'office' || userRole === 'driver') {
          console.log("AuthContextProvider: Redirecting to / (office/driver).");
          navigate('/');
        } else {
          console.log("AuthContextProvider: Redirecting to / (logged in, no specific role).");
          navigate('/');
        }
      }
    } else if (!isLoadingAuth && !user && location.pathname !== '/login') {
      console.log("AuthContextProvider: Not logged in, redirecting to /login.");
      navigate('/login');
    }
  }, [isLoadingAuth, user, userRole, navigate, location.pathname]);

  // Effect for single-session enforcement
  useEffect(() => {
    if (!session || !user) {
      return;
    }

    const intervalId = setInterval(async () => {
      if (!document.hidden) { // Only check if the tab is active
        try {
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('active_session_token')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error("Single-session check: Error fetching active session token:", error);
            return;
          }

          // If a token is set in DB and it doesn't match the current one, log out.
          if (profileData && profileData.active_session_token && profileData.active_session_token !== session.access_token) {
            clearInterval(intervalId);
            await supabase.auth.signOut();
            toast.error("You have been logged out because your account was accessed from another device.");
          }
        } catch (e) {
          console.error("Single-session check: Error in validation interval:", e);
        }
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(intervalId);
  }, [session, user]);

  const login = async (organisationKey: string, userIdOrEmail: string, password: string) => {
    console.log("AuthContextProvider: login called with fetch for:", userIdOrEmail);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ orgKey: organisationKey, username: userIdOrEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || 'An unknown error occurred during login.';
        console.error("AuthContextProvider: Login function failed:", errorMessage);
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      // On success, data is the sessionData object from Supabase
      const { session, user } = data;

      if (session && user) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });

        if (setSessionError) {
          console.error("AuthContextProvider: Failed to set session:", setSessionError);
          toast.error("Login succeeded but failed to set session.");
          return { success: false, error: "Failed to set session." };
        }

        console.log("AuthContextProvider: Login successful.");
        toast.success("Logged in successfully!");
        return { success: true };
      } else {
        throw new Error("Login response was invalid or missing session/user data.");
      }
    } catch (error: any) {
      console.error("AuthContextProvider: Login failed with network or unexpected error:", error.message);
      const errorMessage = error.message || "An unexpected network error occurred.";
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    console.log("AuthContextProvider: logout called.");
    // Clear the active session token on manual logout
    if (user) {
      await supabase
        .from('profiles')
        .update({ active_session_token: null })
        .eq('id', user.id);
    }
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthContextProvider: Logout failed:", error.message);
      toast.error("Failed to log out: " + error.message);
    } else {
      console.log("AuthContextProvider: Logout successful.");
      toast.info("Logged out.");
    }
  };

  const value = {
    session,
    user,
    profile,
    userRole,
    isAdmin,
    isOffice,
    isOfficeOrAdmin,
    isDriver,
    isLoadingAuth,
    logout: logout,
    currentOrgId: profile?.org_id,
    refreshProfile,
    login,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};