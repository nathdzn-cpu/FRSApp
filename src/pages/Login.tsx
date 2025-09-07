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
import { useSession } from '@supabase/auth-helpers-react'; // Import useSession

const LoginPage: React.FC = () => {
  const [userIdOrEmail, setUserIdOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { isLoading: isSessionLoading } = useSession(); // Use useSession for global loading state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userIdOrEmail || !password) {
      toast.error("Please enter both User ID/Email and password.");
      return;
    }

    await login(userIdOrEmail, password);
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Log In</CardTitle>
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
                disabled={isSessionLoading}
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
                disabled={isSessionLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSessionLoading}>
              {isSessionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;