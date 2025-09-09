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
  userRole: UserRole;
  isLoadingAuth: boolean;
  login: (userIdOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      } else if (fetchedProfile) {
        console.log("AuthContextProvider: Profile fetched successfully:", fetchedProfile);
        // Fetch avatar URL
        const { data: publicUrlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(`${currentUser.id}.png`); // Assuming .png extension

        const avatarUrl = publicUrlData?.publicUrl || null;

        setProfile({ ...fetchedProfile as Profile, avatar_url: avatarUrl });
        setUserRole((fetchedProfile as Profile).role || undefined);
      } else {
        console.log("AuthContextProvider: No profile row found for this user.");
        toast.error("No user profile found. Please contact an administrator.");
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

  const login = async (userIdOrEmail: string, password: string) => {
    console.log("AuthContextProvider: login called for:", userIdOrEmail);
    let emailToLogin = userIdOrEmail;
    if (!userIdOrEmail.includes('@')) {
      emailToLogin = userIdOrEmail.toLowerCase().replace(/\s+/g, '.') + '@frs-haulage.local';
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
    if (error) {
      console.error("AuthContextProvider: Login failed:", error.message);
      toast.error(error.message);
      return { success: false, error: error.message };
    } else {
      console.log("AuthContextProvider: Login successful.");
      toast.success("Logged in successfully!");
      return { success: true };
    }
  };

  const logout = async () => {
    console.log("AuthContextProvider: logout called.");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("AuthContextProvider: Logout failed:", error.message);
      toast.error("Failed to log out: " + error.message);
    } else {
      console.log("AuthContextProvider: Logout successful.");
      toast.info("Logged out.");
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, userRole, isLoadingAuth, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthContextProvider');
  }
  return context;
};