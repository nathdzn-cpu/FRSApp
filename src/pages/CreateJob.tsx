"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getProfiles, createJob, getJobs } from '@/lib/supabase'; // Import getJobs
import { Profile } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import JobForm from '@/components/JobForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card'; // Import Card components

interface JobFormValues {
  ref?: string;
  override_ref?: boolean;
  manual_ref?: string;
  date_created: Date;
  price: number | null;
  assigned_driver_id: string | null;
  notes?: string;
  collections: Array<{
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    time?: string;
    notes?: string;
  }>;
  deliveries: Array<{
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    postcode: string;
    time?: string;
    notes?: string;
  }>;
}

const CreateJob: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();
  const [generatedRef, setGeneratedRef] = useState<string | undefined>(undefined);

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

  // Fetch profiles (drivers)
  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth,
  });

  // Generate unique order number
  useEffect(() => {
    const generateOrderNumber = async () => {
      if (!currentOrgId) return;

      try {
        const existingJobs = await getJobs(currentOrgId, userRole!); // Fetch all jobs to find existing refs
        const existingRefs = new Set(
          existingJobs
            .map(job => {
              const match = job.ref.match(/^ORDER-(\d+)$/);
              return match ? parseInt(match[1], 10) : null;
            })
            .filter((num): num is number => num !== null)
        );

        let nextNumber = 1;
        while (existingRefs.has(nextNumber)) {
          nextNumber++;
        }
        setGeneratedRef(`ORDER-${String(nextNumber).padStart(3, '0')}`);
      } catch (error) {
        console.error("Failed to generate order number:", error);
        toast.error("Failed to generate order number.");
        setGeneratedRef('ERROR-GEN'); // Fallback
      }
    };

    if (canAccess && currentOrgId && userRole && !isLoadingAuth) {
      generateOrderNumber();
    }
  }, [canAccess, currentOrgId, userRole, isLoadingAuth]);


  const handleSubmit = async (values: JobFormValues) => {
    if (!currentProfile) {
      toast.error("User profile not found. Cannot create job.");
      return;
    }

    try {
      const jobRef = values.override_ref && values.manual_ref ? values.manual_ref : generatedRef;
      if (!jobRef) {
        toast.error("Order number could not be determined. Please try again.");
        return;
      }

      const newJobData = {
        ref: jobRef,
        status: 'planned' as const,
        date_created: values.date_created.toISOString().split('T')[0], // Format to YYYY-MM-DD
        price: values.price,
        assigned_driver_id: values.assigned_driver_id,
        notes: values.notes || null,
      };

      const newStopsData = [...values.collections, ...values.deliveries].map((stop, index) => ({
        ...stop,
        type: index < values.collections.length ? 'collection' : 'delivery',
        seq: index + 1,
        time: stop.time || null, // Ensure time is passed
      }));

      const promise = createJob(currentOrgId, newJobData, newStopsData, currentProfile.id);

      toast.promise(promise, {
        loading: 'Creating job...',
        success: (newJob) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
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

  if (isLoadingAuth || isLoadingProfiles || !generatedRef) { // Wait for generatedRef
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading profiles and generating order number...</p>
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
        <div className="flex justify-between items-center mb-6">
          <Button onClick={() => { navigate('/'); }} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </Button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Job</h1>

        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardContent className="p-0">
            <JobForm onSubmit={handleSubmit} profiles={profiles} generatedRef={generatedRef} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateJob;