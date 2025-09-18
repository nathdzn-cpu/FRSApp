"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SignUpDialog from '@/components/auth/SignUpDialog';
import { supabase } from '@/lib/supabaseClient';

const LoginPage: React.FC = () => {
  const { user, login, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organisationKey, setOrganisationKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setIsSubmitting(true);

    if (!organisationKey || !email || !password) {
      setLocalError("Please enter Organisation Key, Email, and password.");
      setIsSubmitting(false);
      return;
    }

    const { success, error } = await login(organisationKey, email, password);
    if (!success && error) {
      setLocalError(error);
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading user profile...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-[var(--saas-background)] p-4">
        <Card className="w-full max-w-md shadow-xl rounded-xl p-8 bg-white">
          <CardHeader className="text-center">
            <img src="/FRS_Logo_NO_BG.png" alt="FRS Haulage Logo" className="mx-auto mb-4 h-24 w-auto" />
            <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">FRS Haulage Login</CardTitle>
            <CardDescription className="text-gray-500 text-sm">Enter your credentials to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="organisationKey">Organisation Key</Label>
                <Input
                  id="organisationKey"
                  type="text"
                  placeholder="e.g., 1234"
                  value={organisationKey}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (val.length <= 4) {
                      setOrganisationKey(val);
                    }
                  }}
                  required
                  disabled={isLoadingAuth}
                  maxLength={4}
                  pattern="\d{4}"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userIdOrEmail">User ID / Email</Label>
                <Input
                  id="userIdOrEmail"
                  type="text"
                  placeholder="e.g., admin@example.com or 1234"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoadingAuth}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoadingAuth}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isLoadingAuth || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log In
              </Button>
              {localError && <p className="text-red-500 text-sm text-center mt-2">{localError}</p>}
            </form>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setIsSignUpOpen(true)}>
                  Sign Up
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      <SignUpDialog open={isSignUpOpen} onOpenChange={setIsSignUpOpen} />
    </>
  );
};

export default LoginPage;