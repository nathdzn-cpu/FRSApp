"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { callFn } from '@/lib/callFunction';
import { supabase } from '@/lib/supabaseClient';

const signUpSchema = z.object({
  organisationName: z.string().min(1, { message: 'Organisation name is required.' }),
  fullName: z.string().min(1, { message: 'Your full name is required.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  contactNumber: z.string().optional(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SignUpDialog: React.FC<SignUpDialogProps> = ({ open, onOpenChange }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      organisationName: '',
      fullName: '',
      email: '',
      contactNumber: '',
      password: '',
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setIsSubmitting(true);
    try {
      const { session, error } = await callFn<{ session: any; error?: any }>('sign-up', values);

      if (error) {
        const errorMessage = typeof error === 'object' ? error.message : error;
        throw new Error(errorMessage || 'Sign-up failed.');
      }

      if (session) {
        const { error: setSessionError } = await supabase.auth.setSession(session);
        if (setSessionError) {
            throw setSessionError;
        }
        toast.success('Sign-up successful! Welcome.');
        onOpenChange(false);
      } else {
        throw new Error('Sign-up successful, but failed to create a session.');
      }
    } catch (err: any) {
      console.error("Sign-up error:", err);
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white shadow-xl rounded-xl p-6">
        <DialogHeader>
          <DialogTitle>Create a New Organisation</DialogTitle>
          <DialogDescription>
            Sign up to get started. You will be the administrator for your new organisation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="organisationName" render={({ field }) => (
              <FormItem>
                <FormLabel>Organisation Name</FormLabel>
                <FormControl><Input placeholder="e.g., FRS Haulage" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem>
                <FormLabel>Your Full Name</FormLabel>
                <FormControl><Input placeholder="e.g., John Doe" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Your Email</FormLabel>
                <FormControl><Input type="email" placeholder="you@company.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="contactNumber" render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Number (Optional)</FormLabel>
                <FormControl><Input placeholder="e.g., 07123456789" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full bg-blue-600 text-white rounded-md hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SignUpDialog;