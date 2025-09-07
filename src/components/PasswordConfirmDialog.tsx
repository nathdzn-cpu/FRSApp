"use client";

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface PasswordConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>; // This function will be called after password validation
  isConfirming: boolean; // External busy state for the action itself
  variant?: "default" | "destructive";
}

const PasswordConfirmDialog: React.FC<PasswordConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isConfirming,
  variant = "default",
}) => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePasswordConfirm = async () => {
    if (!user?.email) {
      setPasswordError("Logged-in user email not found. Cannot confirm password.");
      return;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      return;
    }

    setIsAuthenticating(true);
    setPasswordError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (error) {
        setPasswordError("Incorrect password. Please try again.");
        console.error("Password re-authentication failed:", error.message);
        toast.error("Password confirmation failed: Incorrect password.");
      } else {
        // Password confirmed, proceed with the actual action
        await onConfirm();
        onOpenChange(false); // Close dialog on success
      }
    } catch (err: any) {
      setPasswordError("An unexpected error occurred during password confirmation.");
      console.error("Unexpected error during password re-authentication:", err);
      toast.error("An unexpected error occurred during password confirmation.");
    } finally {
      setIsAuthenticating(false);
      setPassword(''); // Clear password input
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setPassword('');
      setPasswordError(null);
      setIsAuthenticating(false);
    }
    onOpenChange(openState);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="flex flex-col max-h-[90vh]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Your Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password to confirm"
                disabled={isAuthenticating || isConfirming}
              />
              {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isAuthenticating || isConfirming}>Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={variant}
              onClick={handlePasswordConfirm}
              disabled={isAuthenticating || isConfirming || !password}
            >
              {isAuthenticating || isConfirming ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PasswordConfirmDialog;