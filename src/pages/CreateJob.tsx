"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, createJob } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import JobForm from '@/components/JobForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card'; // Import Card components
import { usePersistentForm } from '@/hooks/usePersistentForm'; // Import usePersistentForm

interface JobFormValues {
  ref?: string;
  override_ref?: boolean;
  manual_ref?: string;
  pickup_eta?: string;
  delivery_eta?: string;
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
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  const canAccess = userRole === 'admin' || userRole === 'office';

  // For clearing the persistent form state
  const [, setPersistedFormState] = usePersistentForm<Partial<JobFormValues>>("jobFormState", {});

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || !canAccess) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, canAccess, navigate, isLoadingAuth]);

  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth,
  });

  const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const newJobData = {
        ref: values.override_ref ? values.manual_ref : undefined,
        status: 'planned' as const,
        pickup_eta: values.pickup_eta || null,
        delivery_eta: values.delivery_eta || null,
      };

      const newStopsData = [...values.collections, ...values.deliveries].map((stop, index) => ({
        ...stop,
        type: index < values.collections.length ? 'collection' : 'delivery',
        seq: index + 1,
      }));

      const promise = createJob(currentOrgId, newJobData, newStopsData, currentProfile.id);

      toast.promise(promise, {
        loading: 'Creating job...',
        success: (newJob) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          setPersistedFormState({}); // Clear the persisted form state on success
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading profiles...</p>
      </div>
    );
  }

  if (profilesError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error loading profiles: {profilesError.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || !canAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Job</h1>

        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardContent className="p-0">
            <JobForm onSubmit={handleSubmit} profiles={profiles} canSeePrice={false} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJob;