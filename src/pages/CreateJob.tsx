"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getProfiles, createJob } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import JobForm from '@/components/JobForm';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface JobFormValues {
  ref: string;
  scheduled_date: Date;
  price?: number;
  notes?: string;
  assigned_driver_id?: string;
  collections: Array<{
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    window_from?: string;
    window_to?: string;
    notes?: string;
  }>;
  deliveries: Array<{
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    window_from?: string;
    window_to?: string;
    notes?: string;
  }>;
}

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : 'auth_user_dave';
  const canAccess = userRole === 'admin' || userRole === 'office';
  const canSeePrice = canAccess; // Price visibility is tied to access for this page

  useEffect(() => {
    if (!canAccess) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [canAccess, navigate]);

  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentTenantId],
    queryFn: () => getProfiles(currentTenantId),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess, // Only fetch if user has access
  });

  const currentProfile = profiles.find(p => p.user_id === currentUserId);

  const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const newJobData = {
        ref: values.ref,
        scheduled_date: format(values.scheduled_date, 'yyyy-MM-dd'),
        price: canSeePrice ? values.price : undefined, // Only include price if user can see it
        notes: values.notes,
        assigned_driver_id: values.assigned_driver_id || undefined,
      };

      const newStopsData = [...values.collections, ...values.deliveries].map((stop, index) => ({
        ...stop,
        type: index < values.collections.length ? 'collection' : 'delivery',
        seq: index + 1,
      }));

      const promise = createJob(currentTenantId, newJobData, newStopsData, currentProfile.id);

      toast.promise(promise, {
        loading: 'Creating job...',
        success: (newJob) => {
          navigate(`/jobs/${newJob.id}`);
          return `Job ${newJob.ref} created successfully!`;
        },
        error: 'Failed to create job.',
      });
    } catch (err) {
      console.error("Error creating job:", err);
      toast.error("An unexpected error occurred while creating the job.");
    }
  };

  if (!canAccess) {
    return null; // Render nothing if access is denied, as a redirect will happen
  }

  if (isLoadingProfiles) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading profiles...</p>
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Error loading profiles: {profilesError.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Create New Job</h1>

        <JobForm onSubmit={handleSubmit} profiles={profiles} canSeePrice={canSeePrice} />
      </div>
    </div>
  );
};

export default CreateJob;