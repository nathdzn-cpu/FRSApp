"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, PartyPopper, Copy } from 'lucide-react';
import { toast } from 'sonner';

const loginSchema = z.object({
  organisationKey: z.string().length(4, 'Organisation Key must be 4 digits.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const signUpSchema = z.object({
  fullName: z.string().min(1, 'Your full name is required.'),
  companyName: z.string().min(1, 'Company name is required.'),
  contactNumber: z.string().min(10, 'Please enter a valid contact number.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  fleetSize: z.string({ required_error: 'Please select your fleet size.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

const LoginPage: React.FC = () => {
  const { user, login, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingSignUp, setIsSubmittingSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [newOrgKey, setNewOrgKey] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { organisationKey: '', email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', companyName: '', contactNumber: '', email: '', password: '' },
  });

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    setLoginError(null);
    setIsSubmittingLogin(true);
    const { success, error } = await login(values.organisationKey, values.email, values.password);
    if (!success && error) {
      setLoginError(error);
    }
    setIsSubmittingLogin(false);
  };

  const onSignUpSubmit = async (values: SignUpFormValues) => {
    setIsSubmittingSignUp(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-up`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(values),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign-up failed.');
      
      setNewOrgKey(result.organisation_key);
      setSignUpSuccess(true);
      toast.success('Organisation created successfully!');
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmittingSignUp(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newOrgKey);
    toast.success('Organisation Key copied to clipboard!');
  };

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <img src="/FRS_Logo_NO_BG.png" alt="HOSS Logo" className="mx-auto mb-4 h-24 w-auto" />
          <h1 className="text-4xl font-bold text-gray-800">Welcome to HOSS</h1>
          <p className="text-gray-500 mt-2">Your Haulage Operations & Support System</p>
        </div>

        <Card className="w-full shadow-xl rounded-2xl overflow-hidden">
          <div className="md:grid md:grid-cols-2">
            {/* LOGIN FORM */}
            <div className="p-8 border-b md:border-b-0 md:border-r border-gray-200">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Login to HOSS</CardTitle>
                <CardDescription className="text-gray-500">Enter your credentials to access the dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField control={loginForm.control} name="organisationKey" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organisation Key</FormLabel>
                        <FormControl><Input placeholder="1234" {...field} className="text-center font-mono text-lg tracking-widest" maxLength={4} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl><Input type="email" placeholder="you@company.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={loginForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmittingLogin}>
                      {isSubmittingLogin && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Log In
                    </Button>
                    {loginError && <p className="text-sm text-red-500 text-center">{loginError}</p>}
                  </form>
                </Form>
              </CardContent>
            </div>

            {/* SIGN UP FORM */}
            <div className="p-8 bg-gray-50">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">Sign Up for HOSS</CardTitle>
                <CardDescription className="text-gray-500">Create a new organisation account.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {signUpSuccess ? (
                  <Alert className="border-green-500 bg-green-50 text-green-900">
                    <PartyPopper className="h-5 w-5 text-green-600" />
                    <AlertTitle className="font-bold">Sign-Up Successful!</AlertTitle>
                    <AlertDescription>
                      <p className="mb-4">Your organisation is ready. Use this key to log in for the first time:</p>
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-100 rounded-lg">
                        <span className="text-2xl font-mono font-bold tracking-widest">{newOrgKey}</span>
                        <Button variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8 text-green-800 hover:bg-green-200">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-4 text-xs">Please switch to the Login tab to continue.</p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Form {...signUpForm}>
                    <form onSubmit={signUpForm.handleSubmit(onSignUpSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={signUpForm.control} name="fullName" render={({ field }) => (
                          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="companyName" render={({ field }) => (
                          <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="FRS Haulage" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                      <FormField control={signUpForm.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input type="email" placeholder="you@company.com" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={signUpForm.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="Minimum 8 characters" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField control={signUpForm.control} name="contactNumber" render={({ field }) => (
                          <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input placeholder="07123456789" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={signUpForm.control} name="fleetSize" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fleet Size</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select fleet size" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="1-10">1–10 vehicles</SelectItem>
                                <SelectItem value="10-25">10–25 vehicles</SelectItem>
                                <SelectItem value="25-50">25–50 vehicles</SelectItem>
                                <SelectItem value="50-100">50–100 vehicles</SelectItem>
                                <SelectItem value="100+">100+ vehicles</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <Button type="submit" className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-600" disabled={isSubmittingSignUp}>
                        {isSubmittingSignUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Organisation
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;