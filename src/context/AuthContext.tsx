"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/utils/mockData';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

type UserRole = 'admin' | 'office' | 'driver' | undefined;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  isLoadingAuth: boolean; // Now specifically for profile/role loading
  login: (userIdOrEmail: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children, initialSession, initialUser }: { children: ReactNode; initialSession: Session | null; initialUser: User | null }) => {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Loading state for initial session and profile fetch
  const navigate = useNavigate();
  const location = useLocation();

  // Effect for initial session load and auth state changes
  useEffect(() => {
    let mounted = true;

    // Hydrate session once on mount
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setUser(data.session?.user || null); // Ensure user is set here
        setIsLoadingAuth(false); // Set to false after initial session check
      }
    });

    // Listen for login/logout events
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user || null); // Ensure user is set here
        // Do not flip back to true — just mark as loaded.
        // isLoadingAuth should already be false after initial load.
        // If it was true, this would set it to false.
        setIsLoadingAuth(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []); // Run only once on mount

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    // IMPORTANT: Removed setIsLoadingAuth(true) from here to prevent loop
    setProfile(null);
    setUserRole(undefined);
    if (!currentUser) {
      return;
    }

    try {
      const { data: fetchedProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.error("Error fetching profile from DB:", profileError);
        toast.error("Failed to load user profile.");
      } else if (fetchedProfile) {
        setProfile(fetchedProfile as Profile);
        setUserRole((fetchedProfile as Profile).role || undefined);
      } else {
        console.log("No profile row for this user.");
        toast.error("No user profile found. Please contact an administrator.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("An unexpected error occurred while fetching profile.");
    } finally {
      // IMPORTANT: Removed setIsLoadingAuth(false) from here.
      // The main useEffect for session will handle the final isLoadingAuth(false).
    }
  }, []);

  useEffect(() => {
    // This effect runs when 'user' changes.
    // The 'isLoadingAuth' in the dependency array ensures it waits for the initial session load to complete.
    if (user && !isLoadingAuth) {
      fetchProfile(user);
    } else if (!user) {
      // If no user, ensure profile and role are cleared.
      setProfile(null);
      setUserRole(undefined);
      // Do NOT set isLoadingAuth here. The session listener handles it.
    }
  }, [user, fetchProfile, isLoadingAuth]); // Re-run when user changes or initial isLoadingAuth changes

  // Redirection logic based on profile/role
  useEffect(() => {
    if (!isLoadingAuth && user) { // Only redirect if profile loading is done and user is present
      if (location.pathname === '/login') {
        if (userRole === 'admin') {
          navigate('/admin/users');
        } else if (userRole === 'office' || userRole === 'driver') {
          navigate('/');
        } else {
          navigate('/'); // Logged in but no role, go to home
        }
      }
    } else if (!isLoadingAuth && !user && location.pathname !== '/login') {
      // If not loading, no user, and not on login page, redirect to login
      navigate('/login');
    }
  }, [isLoadingAuth, user, userRole, navigate, location.pathname]);

  const login = async (userIdOrEmail: string, password: string) => {
    let emailToLogin = userIdOrEmail;
    if (!userIdOrEmail.includes('@')) {
      emailToLogin = `${userIdOrEmail}@login.local`;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
    if (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } else {
      toast.success("Logged in successfully!");
      return { success: true };
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to log out: " + error.message);
    } else {
      toast.info("Logged out.");
      // App.tsx will detect no session and redirect to login
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, userRole, isLoadingAuth, login, logout }}>
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