"use client";

import * as z from 'zod';

// Helper to format time input to HH:MM
export const formatTimeInput = (value: string) => {
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

export const stopSchema = z.object({
  name: z.string().optional().nullable(),
  address_line1: z.string().min(1, { message: 'Address line 1 is required.' }),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, { message: 'City is required.' }),
  postcode: z.string().min(1, { message: 'Postcode is required.' }),
  window_from: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  window_to: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

export const jobFormSchema = z.object({
  order_number: z.string().optional().or(z.literal('')),
  collection_date: z.date({ required_error: 'Collection Date is required.' }),
  delivery_date: z.date({ required_error: 'Delivery Date is required.' }),
  price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: 'Price must be non-negative.' }).nullable().optional()
  ),
  assigned_driver_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  collections: z.array(stopSchema).min(0),
  deliveries: z.array(stopSchema).min(1, { message: 'At least one delivery point is required.' }),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;