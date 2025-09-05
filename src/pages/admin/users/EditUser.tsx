import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getTenants, getProfiles, updateUser } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import EditUserForm from '@/components/admin/users/EditUserForm';

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Profile ID
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userToEdit, setUserToEdit] = useState<Profile | undefined>(undefined);
  const [currentProfile, setCurrentProfile] = useState<Profile | undefined>(undefined);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : 'auth_user_dave';

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
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load user data. Please try again.");
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
        error: 'Failed to update user.',
      });
      await promise;
      navigate('/admin/users');
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("An unexpected error occurred while updating the user.");
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
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/admin/users')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to User Management
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
      </div>
    </div>
  );
};

export default EditUser;