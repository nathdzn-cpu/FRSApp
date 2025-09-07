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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Loading state for profile/role
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    setIsLoadingAuth(true);
    setProfile(null);
    setUserRole(undefined);
    if (!currentUser) {
      setIsLoadingAuth(false);
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
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile(initialUser);
  }, [initialUser, fetchProfile]);

  // Redirection logic based on profile/role
  useEffect(() => {
    if (!isLoadingAuth && initialUser) { // Only redirect if profile loading is done and user is present
      if (location.pathname === '/login') {
        if (userRole === 'admin') {
          navigate('/admin/users');
        } else if (userRole === 'office' || userRole === 'driver') {
          navigate('/');
        } else {
          navigate('/'); // Logged in but no role, go to home
        }
      }
    }
  }, [isLoadingAuth, initialUser, userRole, navigate, location.pathname]);

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
    <AuthContext.Provider value={{ session: initialSession, user: initialUser, profile, userRole, isLoadingAuth, login, logout }}>
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