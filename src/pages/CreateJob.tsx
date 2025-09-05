"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // Updated import
import { getProfiles, createJob } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import JobForm from '@/components/JobForm';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface JobFormValues {
  ref?: string; // Now optional
  override_ref?: boolean; // New field
  manual_ref?: string; // New field
  scheduled_date: Date;
  price?: number | null; // Allow null
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
  const { user, profile, userRole, isLoadingAuth } = useAuth(); // Use useAuth

  const currentTenantId = profile?.tenant_id || 'demo-tenant-id'; // Use profile's tenant_id
  const currentProfile = profile; // Use profile from AuthContext
  const canAccess = userRole === 'admin' || userRole === 'office';
  const canSeePrice = canAccess; // Price visibility is tied to access for this page

  useEffect(() => {
    if (isLoadingAuth) return; // Wait for auth to load

    if (!user || !canAccess) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, canAccess, navigate, isLoadingAuth]);

  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentTenantId],
    queryFn: () => getProfiles(currentTenantId),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth, // Only fetch if user has access and auth is loaded
  });

  const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const newJobData = {
        ref: values.override_ref ? values.manual_ref : undefined, // Use manual_ref if override is checked, otherwise undefined for auto-generation
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

  if (isLoadingAuth || isLoadingProfiles) {
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

  if (!user || !canAccess) {
    return null; // Render nothing if access is denied, as a redirect will happen
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