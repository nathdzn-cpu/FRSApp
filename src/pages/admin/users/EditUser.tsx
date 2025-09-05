import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getTenants, getProfiles, updateUser, resetUserPassword } from '@/lib/supabase';
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

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Profile ID
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<Profile | undefined>(undefined);
  const [currentProfile, setCurrentProfile] = useState<Profile | undefined>(undefined);
  const [isResetPasswordBusy, setIsResetPasswordBusy] = useState(false);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : userRole === 'driver' ? 'auth_user_dave' : 'unknown';

  useEffect(() => {
    if (userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedTenants = await getTenants();
        const defaultTenantId = fetchedTenants[0]?.id;
        if (defaultTenantId) {
          const profiles = await getProfiles(defaultTenantId);
          setCurrentProfile(profiles.find(p => p.user_id === currentUserId));
          setUserToEdit(profiles.find(p => p.id === id));
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load user data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userRole, navigate, currentUserId, id]);

  const handleSubmit = async (values: any) => {
    if (!userToEdit || !currentProfile) {
      toast.error("User to edit or admin profile not found. Cannot update user.");
      return;
    }

    try {
      const updates: Partial<Profile> = {
        full_name: values.full_name,
        dob: values.dob ? values.dob.toISOString().split('T')[0] : undefined,
        phone: values.phone,
        role: values.role,
        user_id: values.user_id,
        truck_reg: values.truck_reg,
        trailer_no: values.trailer_no,
      };

      const promise = updateUser(currentTenantId, userToEdit.id, updates, currentProfile.id);
      toast.promise(promise, {
        loading: `Updating ${userToEdit.full_name}...`,
        success: 'User updated successfully!',
        error: (err) => `Failed to update user: ${err.message}`,
      });
      const result = await promise;
      if (result) {
        navigate('/admin/users'); // Navigate back to the list page
      } else {
        toast.error(`Failed to update ${userToEdit.full_name}: User not found or could not be updated.`);
      }
    } catch (err: any) {
      console.error("Error updating user:", err);
      toast.error("An unexpected error occurred while updating the user.");
    }
  };

  const handleResetPassword = async () => {
    if (!userToEdit || !currentProfile) {
      toast.error("User to edit or admin profile not found. Cannot reset password.");
      return;
    }
    // In a real app, you'd need the user's email to send a reset link.
    // For this mock, we'll just simulate the action.
    try {
      setIsResetPasswordBusy(true);
      const promise = resetUserPassword(currentTenantId, userToEdit.user_id, currentProfile.id);
      toast.promise(promise, {
        loading: `Sending password reset to ${userToEdit.full_name}...`,
        success: `Password reset email sent to ${userToEdit.full_name}! (Simulated)`,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!userToEdit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">User not found.</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Edit User: {userToEdit.full_name}</h1>
        <EditUserForm onSubmit={handleSubmit} defaultValues={userToEdit} />

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>User Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full" disabled={isResetPasswordBusy}>
                  <Mail className="h-4 w-4 mr-2" /> Send Password Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Password Reset for {userToEdit.full_name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send a password reset email to the user's registered email address (simulated).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetPassword} disabled={isResetPasswordBusy}>Send Reset Email</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditUser;