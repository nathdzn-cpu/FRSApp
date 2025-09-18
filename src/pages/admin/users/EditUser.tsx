"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getProfileById, updateUser } from '@/lib/api/profiles';
import { Profile } from '@/utils/mockData';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import EditUserForm from '@/components/admin/users/EditUserForm';

const EditUser: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile: currentProfile, userRole, currentOrgId } = useAuth();

  const { data: userToEdit, isLoading, error } = useQuery<Profile | null, Error>({
    queryKey: ['profile', id, currentOrgId],
    queryFn: () => getProfileById(id!, currentOrgId!),
    enabled: !!id && !!currentOrgId,
  });

  const handleUpdateUser = async (values: any) => {
    if (!id || !currentOrgId || !currentProfile || !userRole) {
      toast.error("Cannot update user. Missing required information.");
      return;
    }

    const promise = updateUser(id, currentOrgId, currentProfile.id, userRole, values);

    toast.promise(promise, {
      loading: 'Updating user...',
      success: () => {
        queryClient.invalidateQueries({ queryKey: ['profiles', currentOrgId] });
        queryClient.invalidateQueries({ queryKey: ['profile', id] });
        navigate('/admin/users');
        return 'User updated successfully!';
      },
      error: (err) => `Failed to update user: ${err.message}`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading user details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error instanceof Error ? error.message : String(error)}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!userToEdit) {
    return (
      <div className="text-center">
        <p>User not found.</p>
        <Button onClick={() => navigate('/admin/users')} className="mt-4">Back to Users</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Button onClick={() => navigate('/admin/users')} variant="outline" className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
      </Button>
      <h1 className="text-2xl font-bold mb-6">Edit User: {userToEdit.full_name}</h1>
      <EditUserForm
        user={userToEdit}
        onSubmit={handleUpdateUser}
      />
    </div>
  );
};

export default EditUser;