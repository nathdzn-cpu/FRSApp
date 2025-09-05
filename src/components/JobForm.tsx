"use client";

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile } from '@/utils/mockData';
import { formatGBP } from '@/lib/money';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

const stopSchema = z.object({
  name: z.string().min(1, { message: 'Stop name is required.' }),
  address_line1: z.string().min(1, { message: 'Address line 1 is required.' }),
  address_line2: z.string().optional(),
  city: z.string().min(1, { message: 'City is required.' }),
  postcode: z.string().min(1, { message: 'Postcode is required.' }),
  window_from: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  window_to: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  notes: z.string().optional(),
});

const formSchema = z.object({
  ref: z.string().optional(), // Now optional as it's auto-generated or overridden
  override_ref: z.boolean().optional(), // New field for override checkbox
  manual_ref: z.string().optional(), // New field for manual ref input
  scheduled_date: z.date({ required_error: 'Scheduled date is required.' }),
  price: z.number().min(0, { message: 'Price must be a positive number.' }).optional().nullable(), // Allow null for optional
  notes: z.string().optional(),
  assigned_driver_id: z.string().optional(),
  collections: z.array(stopSchema).min(0),
  deliveries: z.array(stopSchema).min(1, { message: 'At least one delivery point is required.' }),
});

type JobFormValues = z.infer<typeof formSchema>;

interface JobFormProps {
  onSubmit: (values: JobFormValues) => void;
  profiles: Profile[];
  canSeePrice: boolean;
  defaultValues?: Partial<JobFormValues>;
  generatedRef?: string; // New prop for displaying generated ref
}

const JobForm: React.FC<JobFormProps> = ({ onSubmit, profiles, canSeePrice, defaultValues, generatedRef }) => {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ref: '',
      override_ref: false,
      manual_ref: '',
      scheduled_date: new Date(),
      price: undefined,
      notes: '',
      assigned_driver_id: '',
      collections: [],
      deliveries: [],
      ...defaultValues,
    },
  });

  const { fields: collectionFields, append: appendCollection, remove: removeCollection } = useFieldArray({
    control: form.control,
    name: 'collections',
  });

  const { fields: deliveryFields, append: appendDelivery, remove: removeDelivery } = useFieldArray({
    control: form.control,
    name: 'deliveries',
  });

  const drivers = profiles.filter(p => p.role === 'driver');

  const overrideOrderNumber = form.watch('override_ref');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FormItem>
                <FormLabel>Order Number</FormLabel>
                <FormControl>
                  <Input
                    value={overrideOrderNumber ? form.watch('manual_ref') : (generatedRef || 'Generated on submit')}
                    readOnly={!overrideOrderNumber}
                    disabled={!overrideOrderNumber}
                    onChange={(e) => form.setValue('manual_ref', e.target.value, { shouldValidate: true })}
                    placeholder="e.g., FRS-001"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
              <FormField
                control={form.control}
                name="override_ref"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Override order number
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="scheduled_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Scheduled Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canSeePrice && (
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (GBP)</FormLabel>
                    <FormControl>
                      <Input
                        type="number" // Changed to number type
                        placeholder="e.g., 250.00"
                        {...field}
                        value={field.value === null || field.value === undefined ? '' : field.value} // Handle null/undefined for number input
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? undefined : value); // Set to undefined if not a valid number
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="assigned_driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Driver (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "unassigned-driver" ? undefined : value)}
                    value={field.value || "unassigned-driver"} // Set value to special string if undefined
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned-driver">Unassigned</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name} ({driver.truck_reg || 'N/A'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any special instructions for the job..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Collection Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendCollection({ name: '', address_line1: '', city: '', postcode: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Collection
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {collectionFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-blue-500 dark:border-blue-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg">Collection #{index + 1}</h4>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeCollection(index)}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`collections.${index}.name`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Supplier Warehouse" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.address_line1`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 123 Industrial Road" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.address_line2`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Unit 4" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.city`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., London" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.postcode`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Postcode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SW1A 0AA" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`collections.${index}.window_from`}
                      render={({ field: stopField }) => (
                        <FormItem>
                          <FormLabel>Window From (HH:MM)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 09:00" {...stopField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`collections.${index}.window_to`}
                      render={({ field: stopField }) => (
                        <FormItem>
                          <FormLabel>Window To (HH:MM)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 12:00" {...stopField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`collections.${index}.notes`}
                    render={({ field: stopField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes / Reference</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ))}
            {collectionFields.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center">No collection points added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Delivery Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendDelivery({ name: '', address_line1: '', city: '', postcode: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Delivery
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {deliveryFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-green-500 dark:border-green-700">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg">Delivery #{index + 1}</h4>
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeDelivery(index)}>
                    <Trash2 className="h-4 w-4" /> Remove
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.name`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Customer Site" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.address_line1`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 456 Retail Street" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.address_line2`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Loading Bay" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.city`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Manchester" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.postcode`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel>Postcode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., M1 1AA" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`deliveries.${index}.window_from`}
                      render={({ field: stopField }) => (
                        <FormItem>
                          <FormLabel>Window From (HH:MM)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 14:00" {...stopField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`deliveries.${index}.window_to`}
                      render={({ field: stopField }) => (
                        <FormItem>
                          <FormLabel>Window To (HH:MM)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 17:00" {...stopField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.notes`}
                    render={({ field: stopField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Notes / Reference</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ))}
            {deliveryFields.length === 0 && (
              <p className="text-gray-600 dark:text-gray-400 text-center">No delivery points added yet.</p>
            )}
            <FormMessage>{form.formState.errors.deliveries?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full">Create Job</Button>
      </form>
    </Form>
  );
};

export default JobForm;