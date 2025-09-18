"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Profile } from '@/utils/mockData';
import { jobFormSchema, JobFormValues } from '@/lib/schemas/jobSchema';
import JobDetailsSection from './job-forms/JobDetailsSection';
import JobStopsSection from './job-forms/JobStopsSection';

interface JobFormProps {
  onSubmit: (values: JobFormValues) => void;
  drivers: Profile[];
  defaultValues?: Partial<JobFormValues>;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const JobForm: React.FC<JobFormProps> = ({
  onSubmit,
  drivers,
  defaultValues,
  isSubmitting = false,
  submitButtonText = 'Create Job'
}) => {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: defaultValues || {
      order_number: '',
      collection_date: new Date(),
      delivery_date: new Date(),
      price: null,
      assigned_driver_id: null,
      notes: '',
      collections: [],
      deliveries: [],
    },
  });

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues);
    }
  }, [defaultValues, form.reset]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <JobDetailsSection form={form} isSubmitting={isSubmitting} drivers={drivers} />

        <JobStopsSection type="collections" form={form} isSubmitting={isSubmitting} />

        <JobStopsSection type="deliveries" form={form} isSubmitting={isSubmitting} />

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</span>
          ) : (
            submitButtonText
          )}
        </Button>
      </form>
    </Form>
  );
};

export default JobForm;