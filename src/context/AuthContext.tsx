"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { Profile } from '@/utils/mockData';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { getOrganisationDetails } from '@/lib/api/organisation';

type UserRole = 'admin' | 'office' | 'driver' | undefined;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  userRole: UserRole;
  isLoadingAuth: boolean;
  login: (userIdOrEmail: string, password: string, orgKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_TOKEN_KEY = 'app_session_token';

export const AuthContextProvider = ({ children, initialSession, initialUser }: { children: ReactNode; initialSession: Session | null; initialUser: User | null }) => {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(undefined);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [activeSessionToken, setActiveSessionToken] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setUserRole(undefined);
      return;
    }
    try {
      const { data: fetchedProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        toast.error("Failed to load user profile.");
      } else if (fetchedProfile) {
        const { data: publicUrlData } = supabase.storage.from('profile-pictures').getPublicUrl(`${currentUser.id}.png`);
        setProfile({ ...fetchedProfile as Profile, avatar_url: publicUrlData?.publicUrl || null });
        setUserRole((fetchedProfile as Profile).role || undefined);
      } else {
        toast.error("No user profile found. Please contact an administrator.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while fetching profile.");
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user);
  }, [user, fetchProfile]);

  const silentLogout = useCallback(() => {
    supabase.auth.signOut();
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserRole(undefined);
    setActiveSessionToken(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session || null);
        setUser(data.session?.user || null);
        if (data.session) {
          setActiveSessionToken(sessionStorage.getItem(SESSION_TOKEN_KEY));
        }
        setIsLoadingAuth(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem(SESSION_TOKEN_KEY);
          setActiveSessionToken(null);
          setProfile(null);
          setUserRole(undefined);
        }
        if (event === 'SIGNED_IN') {
          setIsLoadingAuth(false);
        }
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // Realtime check for single session
  useEffect(() => {
    if (!user || !activeSessionToken) return;

    const channel = supabase
      .channel(`profile-session-check:${user.id}`)
      .on<Profile>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newDbToken = payload.new.active_session_token;
          if (newDbToken && newDbToken !== activeSessionToken) {
            toast.warning("You have been logged out because you signed in on another device.", { duration: 5000 });
            silentLogout();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeSessionToken, silentLogout]);

  useEffect(() => {
    if (user && !isLoadingAuth) {
      fetchProfile(user);
    } else if (!user) {
      setProfile(null);
      setUserRole(undefined);
    }
  }, [user, fetchProfile, isLoadingAuth]);

  useEffect(() => {
    if (!isLoadingAuth && user) {
      if (location.pathname === '/login') {
        const target = userRole === 'admin' ? '/admin/users' : '/';
        navigate(target);
      }
    } else if (!isLoadingAuth && !user && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isLoadingAuth, user, userRole, navigate, location.pathname]);

  const login = async (userIdOrEmail: string, password: string, orgKey: string) => {
    let emailToLogin = userIdOrEmail.includes('@') ? userIdOrEmail : `${userIdOrEmail.toLowerCase().replace(/\s+/g, '.')}@frs-haulage.local`;

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: emailToLogin, password });
    if (error) {
      toast.error(error.message);
      return { success: false, error: error.message };
    }

    if (signInData.user) {
      try {
        const { data: userProfile, error: profileError } = await supabase.from('profiles').select('org_id').eq('id', signInData.user.id).single();
        if (profileError || !userProfile) {
          await supabase.auth.signOut();
          const message = "Could not verify user profile.";
          toast.error(message);
          return { success: false, error: message };
        }

        const organisation = await getOrganisationDetails(userProfile.org_id);
        if (!organisation || organisation.display_id !== orgKey) {
          await supabase.auth.signOut();
          const message = "Invalid Organisation Key.";
          toast.error(message);
          return { success: false, error: message };
        }

        const newSessionToken = crypto.randomUUID();
        const { error: updateError } = await supabase.from('profiles').update({ active_session_token: newSessionToken }).eq('id', signInData.user.id);
        if (updateError) {
          await supabase.auth.signOut();
          toast.error("Failed to initialize session. Please try again.");
          return { success: false, error: "Failed to initialize session." };
        }

        sessionStorage.setItem(SESSION_TOKEN_KEY, newSessionToken);
        setActiveSessionToken(newSessionToken);
        setSession(signInData.session);
        setUser(signInData.user);

      } catch (validationError: any) {
        await supabase.auth.signOut();
        const message = validationError.message || "An error occurred during organisation validation.";
        toast.error(message);
        return { success: false, error: message };
      }
    }

    toast.success("Logged in successfully!");
    return { success: true };
  };

  const logout = useCallback(async () => {
    if (user) {
      await supabase.from('profiles').update({ active_session_token: null }).eq('id', user.id);
    }
    await supabase.auth.signOut();
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    setActiveSessionToken(null);
    toast.info("Logged out.");
  }, [user]);

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