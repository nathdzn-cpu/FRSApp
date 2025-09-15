"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfiles, createJob } from '@/lib/supabase';
import { Job, JobStop, Profile } from '@/utils/mockData';
import JobForm from './JobForm';
import { parseISO } from 'date-fns';

interface CloneJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalJob: Job;
  originalStops: JobStop[];
  onCloneSuccess: (newJobOrderNumber: string) => void;
}

const CloneJobDialog: React.FC<CloneJobDialogProps> = ({
  open,
  onOpenChange,
  originalJob,
  originalStops,
  onCloneSuccess,
}) => {
  const { user, profile, userRole, isLoadingAuth, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  const canAccess = isOfficeOrAdmin;

  // Fetch all profiles to get drivers for the form
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId, userRole],
    queryFn: () => getProfiles(currentOrgId, userRole),
    staleTime: 5 * 60 * 1000,
    enabled: canAccess && !!user && !!currentProfile && !isLoadingAuth && open, // Only fetch when dialog is open
  });

  const drivers = allProfiles.filter(p => p.role === 'driver');

  const defaultFormValues = React.useMemo(() => {
    if (!originalJob) return undefined;

    return {
      order_number: '', // Always reset for auto-generation
      date_created: new Date(), // Default to today for cloned job
      price: originalJob.price,
      assigned_driver_id: originalJob.assigned_driver_id || null,
      notes: originalJob.notes,
      collections: originalStops.filter(s => s.type === 'collection').map(s => ({
        name: s.name || '',
        address_line1: s.address_line1,
        address_line2: s.address_line2 || null,
        city: s.city,
        postcode: s.postcode,
        window_from: s.window_from || '', // Default to empty string
        window_to: s.window_to || '',     // Default to empty string
        notes: s.notes || null,
      })),
      deliveries: originalStops.filter(s => s.type === 'delivery').map(s => ({
        name: s.name || '',
        address_line1: s.address_line1,
        address_line2: s.address_line2 || null,
        city: s.city,
        postcode: s.postcode,
        window_from: s.window_from || '', // Default to empty string
        window_to: s.window_to || '',     // Default to empty string
        notes: s.notes || null,
      })),
    };
  }, [originalJob, originalStops]);

  const handleSubmit = async (values: any) => {
    if (!currentProfile || !userRole) {
      toast.error("User profile or role not found. Cannot clone job.");
      return;
    }

    setIsSubmitting(true);
    try {
      const initialStatus = values.assigned_driver_id && values.assigned_driver_id !== 'null' ? 'accepted' : 'planned';

      const newJobData = {
        order_number: values.order_number || null,
        status: initialStatus,
        date_created: values.date_created.toISOString().split('T')[0],
        price: values.price,
        assigned_driver_id: values.assigned_driver_id === 'null' ? null : values.assigned_driver_id,
        notes: values.notes,
      };

      const newStopsData = [...values.collections, ...values.deliveries].map((stop: any, index: number) => ({
        ...stop,
        type: index < values.collections.length ? 'collection' : 'delivery',
        seq: index + 1,
      }));

      const promise = createJob(currentOrgId, newJobData, newStopsData, currentProfile.id, userRole);

      toast.promise(promise, {
        loading: 'Cloning job...',
        success: (newJob) => {
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          onCloneSuccess(newJob.order_number);
          onOpenChange(false);
          return `Job ${newJob.order_number} cloned successfully!`;
        },
        error: (err) => `Failed to clone job: ${err.message || String(err)}`,
      });
    } catch (err) {
      console.error("Error cloning job:", err);
      toast.error("An unexpected error occurred while cloning the job.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || isLoadingAllProfiles) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col bg-white shadow-xl rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Clone Job</DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="ml-2 text-gray-700">Loading data...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!user || !canAccess) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col bg-white shadow-xl rounded-xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Clone Job: {originalJob.order_number}</DialogTitle>
          <DialogDescription>
            Edit the details below to create a new job based on this one.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {defaultFormValues && (
            <JobForm
              onSubmit={handleSubmit}
              drivers={drivers}
              defaultValues={defaultFormValues}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CloneJobDialog;