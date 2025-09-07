"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null); // State for local error message
  const { login, isLoadingAuth } = useAuth(); // useAuth's isLoadingAuth indicates if profile is loading after session

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null); // Clear previous errors

    if (!userIdOrEmail || !password) {
      setLocalError("Please enter both User ID/Email and password.");
      return;
    }

    const { success, error } = await login(userIdOrEmail, password);
    if (!success && error) {
      setLocalError(error); // Set local error if login fails
    }
  };

  // isLoadingAuth from AuthContext primarily indicates if the user profile is being fetched after a session is established.
  // For the login form itself, we can use this to disable the form while an auth operation is in progress.
  // If the AuthContext's initial profile fetch is still ongoing, we show a loading state.
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading user profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">FRS Haulage Login</CardTitle>
          <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userIdOrEmail">User ID / Email</Label>
              <Input
                id="userIdOrEmail"
                type="text"
                placeholder="e.g., admin@example.com or 1234"
                value={userIdOrEmail}
                onChange={(e) => setUserIdOrEmail(e.target.value)}
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
            <Button type="submit" className="w-full" disabled={isLoadingAuth}>
              {isLoadingAuth && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
            {localError && <p className="text-red-500 text-sm text-center mt-2">{localError}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;