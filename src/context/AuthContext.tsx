"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/utils/mockData'; // Assuming Profile is still used
// Removed: import { getProfileByAuthId } from '@/lib/supabase'; // No longer using mock function for auth profile fetch
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchSessionAndProfile = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user || null);

      console.log("Auth Session:", session?.user?.id || "no session"); // Log session.user.id or "no session"

      if (session?.user) {
        // Query profiles table directly using supabase client and the correct 'id' field
        const { data: fetchedProfile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        console.log("After querying profiles - Data:", fetchedProfile, "Error:", profileError); // Log data and error

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 is "No rows found"
          console.error("Error fetching profile from DB:", profileError);
          setProfile(null);
          setUserRole(undefined);
          console.log("No profile row for this user (DB error).");
        } else if (fetchedProfile) {
          setProfile(fetchedProfile as Profile);
          setUserRole((fetchedProfile as Profile).role || undefined);
          console.log("Loaded profile:", fetchedProfile); // Log the returned profile
          console.log("Setting role to:", (fetchedProfile as Profile).role); // Log role setting
        } else {
          setProfile(null);
          setUserRole(undefined);
          console.log("No profile row for this user."); // Log if profile is null
          console.log("Setting role to: null"); // Log role setting to null
        }
      } else {
        setProfile(null);
        setUserRole(undefined);
        console.log("No active session, profile reset.");
        console.log("Setting role to: null"); // Log role setting to null
      }
    } catch (error) {
      console.error("Error fetching session or profile:", error);
      setSession(null);
      setUser(null);
      setProfile(null);
      setUserRole(undefined);
      console.log("Setting role to: null"); // Log role setting to null
    } finally {
      setIsLoadingAuth(false);
      console.log("Finished loading"); // Log finished loading
    }
  }, []);

  useEffect(() => {
    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        fetchSessionAndProfile(); // Re-fetch profile on auth state change
      } else {
        setProfile(null);
        setUserRole(undefined);
        if (location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchSessionAndProfile, navigate, location.pathname]);

  useEffect(() => {
    if (!isLoadingAuth) {
      if (!user && location.pathname !== '/login') {
        navigate('/login');
      } else if (user && location.pathname === '/login') {
        if (userRole === 'admin') {
          navigate('/admin/users');
        } else if (userRole === 'office' || userRole === 'driver') {
          navigate('/');
        } else {
          // If user is logged in but has no assigned role, redirect to home
          // Index.tsx will then display "No role assigned"
          navigate('/');
        }
      }
    }
  }, [isLoadingAuth, user, userRole, navigate, location.pathname]);

  const login = async (userIdOrEmail: string, password: string) => {
    setIsLoadingAuth(true);
    let emailToLogin = userIdOrEmail;

    if (!userIdOrEmail.includes('@')) {
      emailToLogin = `${userIdOrEmail}@login.local`;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
    setIsLoadingAuth(false);

    if (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    } else {
      toast.success("Logged in successfully!");
      return { success: true };
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signOut();
    setIsLoadingAuth(false);
    if (error) {
      toast.error("Failed to log out: " + error.message);
    } else {
      toast.info("Logged out.");
      navigate('/login');
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