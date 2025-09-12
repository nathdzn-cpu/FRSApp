"use client";

import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Job, JobStop, Profile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { parseISO } from 'date-fns';
import JobDetailsSection from './job-forms/JobDetailsSection';
import JobStopsSection from './job-forms/JobStopsSection';
import { Loader2 } from 'lucide-react'; // Import Loader2

// Helper to format time input to HH:MM (kept here as it's used in stopSchema)
const formatTimeInput = (value: string) => {
  if (!value) return '';
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned.length === 0) return '';
  if (cleaned.length === 1) return `0${cleaned}:00`;
  if (cleaned.length === 2) {
    const hour = parseInt(cleaned, 10);
    return `${String(hour).padStart(2, '0')}:00`;
  }
  if (cleaned.length === 3) {
    const hour = parseInt(cleaned.substring(0, 2), 10);
    const minute = parseInt(cleaned.substring(2, 3), 10);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const hour = parseInt(cleaned.substring(0, 2), 10);
  const minute = parseInt(cleaned.substring(2, 4), 10);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

const stopSchema = z.object({
  id: z.string().optional(), // Optional for new stops
  name: z.string().optional().nullable(),
  address_line1: z.string().min(1, { message: 'Address line 1 is required.' }),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, { message: 'City is required.' }),
  postcode: z.string().min(1, { message: 'Postcode is required.' }),
  window_from: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  window_to: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  notes: z.string().optional().nullable(),
  type: z.enum(['collection', 'delivery']), // Added type for internal use
});

const formSchema = z.object({
  order_number: z.string().optional().or(z.literal('')),
  date_created: z.date({ required_error: 'Date Created is required.' }),
  price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: 'Price must be non-negative.' }).nullable().optional()
  ),
  assigned_driver_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['planned', 'assigned', 'accepted', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery', 'delivered', 'pod_received', 'cancelled'], { required_error: 'Status is required.' }),
  collections: z.array(stopSchema).min(0),
  deliveries: z.array(stopSchema).min(1, { message: 'At least one delivery point is required.' }),
});

type JobFormValues = z.infer<typeof formSchema>;

interface JobEditFormProps {
  initialJob: Job;
  initialStops: JobStop[];
  drivers: Profile[];
  onSubmit: (values: JobFormValues) => Promise<void>;
  isSubmitting: boolean;
}

const JobEditForm: React.FC<JobEditFormProps> = ({ initialJob, initialStops, drivers, onSubmit, isSubmitting }) => {
  const { userRole } = useAuth();
  const isOfficeOrAdmin = userRole === 'admin' || userRole === 'office';
  const isDriver = userRole === 'driver';

  const formMethods = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_number: initialJob.order_number || '',
      date_created: parseISO(initialJob.date_created),
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

  // Disable fields based on user role
  const disableAllButDriverFields = isDriver;
  const disableStopDetailsForDriver = isDriver; // Driver can only edit window_from/to and notes

  return (
    <FormProvider {...formMethods}>
      <Form {...formMethods}>
        <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-xl font-semibold text-gray-900">Job Details</CardTitle>
            </CardHeader>
            <JobDetailsSection
              drivers={drivers}
              isSubmitting={isSubmitting}
              disableAllButDriverFields={disableAllButDriverFields}
            />
          </Card>

          <JobStopsSection
            type="collections"
            title="Collection Points"
            borderColorClass="border-l-4 border-blue-500"
            isOfficeOrAdmin={isOfficeOrAdmin}
            disableStopDetailsForDriver={disableStopDetailsForDriver}
            isSubmitting={isSubmitting}
          />

          <JobStopsSection
            type="deliveries"
            title="Delivery Points"
            borderColorClass="border-l-4 border-green-500"
            isOfficeOrAdmin={isOfficeOrAdmin}
            disableStopDetailsForDriver={disableStopDetailsForDriver}
            isSubmitting={isSubmitting}
          />

          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>
            {isSubmitting ? <span className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</span> : 'Save Changes'}
          </Button>
        </form>
      </Form>
    </FormProvider>
  );
};

export default JobEditForm;