import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, updateUser, resetUserPassword } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import EditUserForm from '@/components/admin/users/EditUserForm';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog'; // Import the new component

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<Profile | undefined>(undefined);
  const [currentAdminProfile, setCurrentAdminProfile] = useState<Profile | undefined>(undefined);
  const [isResetPasswordBusy, setIsResetPasswordBusy] = useState(false);
  const [isUpdateRoleBusy, setIsUpdateRoleBusy] = useState(false); // New busy state for role update

  // State for password confirmation dialogs
  const [isResetPasswordConfirmOpen, setIsResetPasswordConfirmOpen] = useState(false);
  const [isRoleChangeConfirmOpen, setIsRoleChangeConfirmOpen] = useState(false);
  const [pendingRoleUpdateValues, setPendingRoleUpdateValues] = useState<any | null>(null); // Store form values for role change

  const currentOrgId = profile?.org_id || 'demo-tenant-id';

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const allProfiles = await getProfiles(currentOrgId, userRole); // Pass userRole
        setCurrentAdminProfile(allProfiles.find(p => p.user_id === user.id));
        setUserToEdit(allProfiles.find(p => p.id === id));
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load user data. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user, profile, userRole, isLoadingAuth, navigate, id, currentOrgId]);

  const handleSubmit = async (values: any) => {
    if (!userToEdit || !currentAdminProfile || !userRole) { // Ensure userRole is available
      toast.error("User to edit, admin profile, or role not found. Cannot update user.");
      return;
    }

    const updates: Partial<Profile> = {
      full_name: values.full_name,
      dob: values.dob ? values.dob.toISOString().split('T')[0] : undefined,
      phone: values.phone || undefined,
      role: values.role,
      // user_id removed from schema
      truck_reg: values.truck_reg || undefined,
      trailer_no: values.trailer_no || undefined,
    };

    // Check if role is being changed
    if (userToEdit.role !== values.role) {
      setPendingRoleUpdateValues(updates); // Store updates for confirmation
      setIsRoleChangeConfirmOpen(true);
    } else {
      // If role is not changing, proceed directly
      await performUpdateUser(updates);
    }
  };

  const performUpdateUser = async (updates: Partial<Profile>) => {
    if (!userToEdit || !currentAdminProfile || !userRole) { // Ensure userRole is available
      toast.error("User to edit, admin profile, or role not found. Cannot update user.");
      return;
    }
    setIsUpdateRoleBusy(true);
    try {
      const promise = updateUser(currentOrgId, userToEdit.id, updates, currentAdminProfile.id, userRole); // Pass userRole
      toast.promise(promise, {
        loading: `Updating ${userToEdit.full_name}...`,
        success: 'User updated successfully!',
        error: (err) => `Failed to update user: ${err.message}`,
      });
      const result = await promise;
      if (result) {
        navigate('/admin/users');
      } else {
        toast.error(`Failed to update ${userToEdit.full_name}: User not found or could not be updated.`);
      }
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error("An unexpected error occurred while updating the user.");
    } finally {
      setIsUpdateRoleBusy(false);
      setPendingRoleUpdateValues(null);
    }
  };

  const handleResetPasswordConfirmed = async () => {
    if (!userToEdit || !currentAdminProfile || !userRole) { // Ensure userRole is available
      toast.error("User to edit, admin profile, or role not found. Cannot reset password.");
      return;
    }
    try {
      setIsResetPasswordBusy(true);
      const promise = resetUserPassword(currentOrgId, userToEdit.user_id, currentAdminProfile.id, userRole); // Pass userRole
      toast.promise(promise, {
        loading: `Sending password reset to ${userToEdit.full_name}...`,
        success: `Password reset email sent to ${userToEdit.full_name}!`,
        error: (err) => `Failed to send password reset to ${userToEdit.full_name}: ${err.message}`,
      });
      await promise;
    } catch (err: any) {
      console.error("Error sending password reset:", err);
      toast.error("An unexpected error occurred while sending password reset.");
    } finally {
      setIsResetPasswordBusy(false);
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!userToEdit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-gray-700 text-lg mb-4">User not found.</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full"> {/* Removed min-h-screen and explicit padding, handled by App.tsx main */}
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit User: {userToEdit.full_name}</h1>
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardContent className="p-0">
            <EditUserForm onSubmit={handleSubmit} defaultValues={userToEdit} />
          </CardContent>
        </Card>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mt-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">User Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <Button variant="outline" className="w-full" onClick={() => setIsResetPasswordConfirmOpen(true)} disabled={isResetPasswordBusy}>
              <Mail className="h-4 w-4 mr-2" /> Send Password Reset
            </Button>
          </CardContent>
        </Card>

        {/* Password Confirmation Dialog for Reset Password */}
        <PasswordConfirmDialog
          open={isResetPasswordConfirmOpen}
          onOpenChange={setIsResetPasswordConfirmOpen}
          title={`Confirm Password Reset for ${userToEdit.full_name}`}
          description="This will send a password reset email to the user's registered email address. Please enter your password to confirm."
          confirmLabel="Send Reset Email"
          onConfirm={handleResetPasswordConfirmed}
          isConfirming={isResetPasswordBusy}
        />

        {/* Password Confirmation Dialog for Role Change */}
        {pendingRoleUpdateValues && (
          <PasswordConfirmDialog
            open={isRoleChangeConfirmOpen}
            onOpenChange={setIsRoleChangeConfirmOpen}
            title={`Confirm Role Change for ${userToEdit.full_name}`}
            description={`You are changing the role of ${userToEdit.full_name} from '${userToEdit.role}' to '${pendingRoleUpdateValues.role}'. This is a high-privilege action. Please enter your password to confirm.`}
            confirmLabel="Confirm Role Change"
            onConfirm={() => performUpdateUser(pendingRoleUpdateValues)}
            isConfirming={isUpdateRoleBusy}
          />
        )}
      </div>
    </div>
  );
};

export default EditUser;