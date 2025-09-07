import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<Profile | undefined>(undefined);
  const [currentAdminProfile, setCurrentAdminProfile] = useState<Profile | undefined>(undefined);
  const [isResetPasswordBusy, setIsResetPasswordBusy] = useState(false);

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
        const fetchedTenants = await getTenants();
        const defaultOrgId = profile?.org_id || fetchedTenants[0]?.id;
        if (defaultOrgId && user) {
          const allProfiles = await getProfiles(defaultOrgId);
          setCurrentAdminProfile(allProfiles.find(p => p.user_id === user.id));
          setUserToEdit(allProfiles.find(p => p.id === id));
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);
        setError(err.message || "Failed to load user data. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, [user, profile, userRole, isLoadingAuth, navigate, id]);

  const handleSubmit = async (values: any) => {
    if (!userToEdit || !currentAdminProfile) {
      toast.error("User to edit or admin profile not found. Cannot update user.");
      return;
    }

    try {
      const updates: Partial<Profile> = {
        full_name: values.full_name,
        dob: values.dob ? values.dob.toISOString().split('T')[0] : undefined,
        phone: values.phone || undefined,
        role: values.role,
        user_id: values.user_id || undefined,
        truck_reg: values.truck_reg || undefined,
        trailer_no: values.trailer_no || undefined,
      };

      const promise = updateUser(currentOrgId, userToEdit.id, updates, currentAdminProfile.id);
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
    }
  };

  const handleResetPassword = async () => {
    if (!userToEdit || !currentAdminProfile) {
      toast.error("User to edit or admin profile not found. Cannot reset password.");
      return;
    }
    try {
      setIsResetPasswordBusy(true);
      const promise = resetUserPassword(currentOrgId, userToEdit.user_id, currentAdminProfile.id);
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

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading user data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!userToEdit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-700 text-lg mb-4">User not found.</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Edit User: {userToEdit.full_name}</h1>
        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardContent className="p-0">
            <EditUserForm onSubmit={handleSubmit} defaultValues={userToEdit} />
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm rounded-xl p-6 mt-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">User Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
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