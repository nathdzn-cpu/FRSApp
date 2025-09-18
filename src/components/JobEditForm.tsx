"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Job, JobStop, Profile } from '@/utils/mockData';
import { useAuth } from '@/context/AuthContext';
import { parseISO } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { jobFormSchema, JobFormValues } from '@/lib/schemas/jobSchema';
import JobDetailsSection from './job-forms/JobDetailsSection';
import JobStopsSection from './job-forms/JobStopsSection';

interface JobEditFormProps {
  initialJob: Job;
  initialStops: JobStop[];
  drivers: Profile[];
  onSubmit: (values: JobFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const JobEditForm: React.FC<JobEditFormProps> = ({ initialJob, initialStops, drivers, onSubmit, isSubmitting }) => {
  const { isDriver } = useAuth();

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      order_number: initialJob.order_number || '',
      collection_date: initialJob.collection_date ? parseISO(initialJob.collection_date) : new Date(),
      delivery_date: initialJob.delivery_date ? parseISO(initialJob.delivery_date) : new Date(),
      price: initialJob.price,
      assigned_driver_id: initialJob.assigned_driver_id || null,
      notes: initialJob.notes || '',
      status: initialJob.status,
      collections: initialStops.filter(stop => stop.type === 'collection').map(stop => ({
        ...stop,
        window_from: stop.window_from || '',
        window_to: stop.window_to || '',
        notes: stop.notes || '',
      })),
      deliveries: initialStops.filter(stop => stop.type === 'delivery').map(stop => ({
        ...stop,
        window_from: stop.window_from || '',
        window_to: stop.window_to || '',
        notes: stop.notes || '',
      })),
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <JobDetailsSection
          form={form}
          drivers={drivers}
          isSubmitting={isSubmitting}
          disabled={isDriver}
        />

        <JobStopsSection
          type="collections"
          form={form}
          isSubmitting={isSubmitting}
          isDriver={isDriver}
        />

        <JobStopsSection
          type="deliveries"
          form={form}
          isSubmitting={isSubmitting}
          isDriver={isDriver}
        />

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</span> : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default JobEditForm;