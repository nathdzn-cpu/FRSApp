"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, createJob, getJobs } from '@/lib/supabase'; // Added getJobs
import { Profile, Job } from '@/utils/mockData'; // Added Job
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import JobForm from '@/components/JobForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card'; // Import Card components

interface JobFormValues {
  override_ref?: boolean;
  manual_ref?: string;
  date_created: Date;
  price: number | null;
  assigned_driver_id: string | null;
  notes: string | null;
  collections: Array<{
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
  }>;
  deliveries: Array<{
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
  }>;
}

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [generatedOrderNumber, setGeneratedOrderNumber] = useState<string>('Generating...');

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  const canAccess = userRole === 'admin' || userRole === 'office';

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || !canAccess) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
    }
  }, [user, canAccess, navigate, isLoadingAuth]);

  // Fetch all profiles to get drivers
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth,
  });

  const drivers = allProfiles.filter(p => p.role === 'driver');

  // Fetch existing jobs to generate the next order number
  const { data: existingJobs = [], isLoading: isLoadingExistingJobs, error: existingJobsError } = useQuery<Job[], Error>({
    queryKey: ['allJobRefs', currentOrgId],
    queryFn: () => getJobs(currentOrgId, 'admin'), // Fetch all jobs as admin to get all refs
    staleTime: 0, // Always refetch to get latest refs
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth,
    onSuccess: (data) => {
      const existingRefNumbers = new Set(
        data
          .filter(job => job.ref.startsWith('FRS-'))
          .map(job => parseInt(job.ref.substring(4), 10))
          .filter(num => !isNaN(num))
      );

      let nextNumber = 1;
      while (existingRefNumbers.has(nextNumber)) {
        nextNumber++;
      }
      setGeneratedOrderNumber(`FRS-${nextNumber.toString().padStart(3, '0')}`);
    },
    onError: (err) => {
      console.error("Failed to fetch existing job references:", err);
      setGeneratedOrderNumber('Error generating ref');
    }
  });

  const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const jobRef = values.override_ref && values.manual_ref ? values.manual_ref : generatedOrderNumber;

      const newJobData = {
        ref: jobRef,
        status: 'planned' as const,
        date_created: values.date_created.toISOString().split('T')[0], // Format as YYYY-MM-DD
        price: values.price,
        assigned_driver_id: values.assigned_driver_id === 'null' ? null : values.assigned_driver_id,
        notes: values.notes,
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
          queryClient.invalidateQueries({ queryKey: ['jobs'] }); // Invalidate general jobs list
          queryClient.invalidateQueries({ queryKey: ['allJobRefs'] }); // Invalidate job refs for new generation
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

  const isLoading = isLoadingAuth || isLoadingAllProfiles || isLoadingExistingJobs;
  const error = allProfilesError || existingJobsError;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading job creation data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error loading data: {error.message}</p>
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
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => { navigate('/'); }} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Job</h1>

        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardContent className="p-0">
            <JobForm onSubmit={handleSubmit} drivers={drivers} generatedRef={generatedOrderNumber} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJob;