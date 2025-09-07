"use client";

import React, { useEffect, useState } from 'react';
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
import { CalendarIcon, PlusCircle, Trash2, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile } from '@/utils/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import { formatGBP } from '@/lib/money';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const stopSchema = z.object({
  name: z.string().min(1, { message: 'Stop name is required.' }),
  address_line1: z.string().min(1, { message: 'Address line 1 is required.' }),
  address_line2: z.string().optional(),
  city: z.string().min(1, { message: 'City is required.' }),
  postcode: z.string().min(1, { message: 'Postcode is required.' }),
  time: z.string().regex(timeRegex, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')), // Single time field
  notes: z.string().optional(),
});

const formSchema = z.object({
  ref: z.string().optional(), // Auto-generated or manual
  override_ref: z.boolean().optional(),
  manual_ref: z.string().optional(),
  date_created: z.date({ required_error: 'Date created is required.' }),
  price: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    return isNaN(num) ? null : num;
  }).nullable(),
  assigned_driver_id: z.string().optional().nullable(),
  notes: z.string().optional(),
  collections: z.array(stopSchema).min(0),
  deliveries: z.array(stopSchema).min(1, { message: 'At least one delivery point is required.' }),
});

type JobFormValues = z.infer<typeof formSchema>;

interface JobFormProps {
  onSubmit: (values: JobFormValues) => void;
  profiles: Profile[];
  generatedRef?: string;
}

const JobForm: React.FC<JobFormProps> = ({ onSubmit, profiles, generatedRef }) => {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date_created: new Date(),
      price: null,
      assigned_driver_id: null,
      notes: '',
      collections: [],
      deliveries: [{ name: '', address_line1: '', city: '', postcode: '', time: '', notes: '' }],
      override_ref: false,
      manual_ref: '',
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

  const overrideOrderNumber = form.watch('override_ref');
  const assignedDriverId = form.watch('assigned_driver_id');
  const [isDriverSelectOpen, setIsDriverSelectOpen] = useState(false);

  const driverProfiles = profiles.filter(p => p.role === 'driver');

  // Set generatedRef as default for 'ref' if not overridden
  useEffect(() => {
    if (generatedRef && !overrideOrderNumber && !form.getValues('manual_ref')) {
      form.setValue('ref', generatedRef);
    }
  }, [generatedRef, overrideOrderNumber, form]);

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow empty string or numbers, and a single decimal point
    const cleanedValue = rawValue.replace(/[^0-9.]/g, '');
    form.setValue('price', cleanedValue, { shouldValidate: true });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
            {/* Order Number */}
            <div>
              <FormItem>
                <FormLabel className="text-gray-700">Order Number</FormLabel>
                <FormControl>
                  <Input
                    value={overrideOrderNumber ? form.watch('manual_ref') : (generatedRef || 'Generating...')}
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
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 mt-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-gray-700">
                        Override auto-generated order number
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Date Created */}
            <FormField
              control={form.control}
              name="date_created"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-700">Date Created</FormLabel>
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
                    <PopoverContent className="w-auto p-0 bg-white shadow-sm rounded-xl" align="start">
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

            {/* Price */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Price (GBP)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 123.45"
                      value={field.value === null ? '' : field.value}
                      onChange={handlePriceChange}
                      onBlur={() => {
                        const numValue = parseFloat(field.value as string);
                        if (!isNaN(numValue)) {
                          form.setValue('price', numValue.toFixed(2));
                        }
                      }}
                      type="text" // Use text to allow custom formatting
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Assign Driver */}
            <FormField
              control={form.control}
              name="assigned_driver_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-700">Assign Driver (Optional)</FormLabel>
                  <Popover open={isDriverSelectOpen} onOpenChange={setIsDriverSelectOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? driverProfiles.find(
                                (driver) => driver.id === field.value
                              )?.full_name
                            : "Select driver"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-white shadow-sm rounded-xl">
                      <Command>
                        <CommandInput placeholder="Search driver..." />
                        <CommandList>
                          <CommandEmpty>No driver found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="unassigned"
                              onSelect={() => {
                                form.setValue("assigned_driver_id", null);
                                setIsDriverSelectOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !field.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              Unassigned
                            </CommandItem>
                            {driverProfiles.map((driver) => (
                              <CommandItem
                                value={driver.full_name}
                                key={driver.id}
                                onSelect={() => {
                                  form.setValue("assigned_driver_id", driver.id);
                                  setIsDriverSelectOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    driver.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {driver.full_name} ({driver.truck_reg || 'N/A'})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-gray-700">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add any general notes for this job..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Collection Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendCollection({ name: '', address_line1: '', city: '', postcode: '', time: '', notes: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Collection
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-4">
            {collectionFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 shadow-sm rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg text-gray-900">Collection #{index + 1}</h4>
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
                        <FormLabel className="text-gray-700">Name</FormLabel>
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
                        <FormLabel className="text-gray-700">Address Line 1</FormLabel>
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
                        <FormLabel className="text-gray-700">Address Line 2 (Optional)</FormLabel>
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
                        <FormLabel className="text-gray-700">City</FormLabel>
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
                        <FormLabel className="text-gray-700">Postcode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., SW1A 0AA" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.time`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Time (HH:MM, Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 09:00" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`collections.${index}.notes`}
                    render={({ field: stopField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-gray-700">Notes / Reference</FormLabel>
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
              <p className="text-gray-600 text-center">No collection points added yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Delivery Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendDelivery({ name: '', address_line1: '', city: '', postcode: '', time: '', notes: '' })}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Delivery
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-4">
            {deliveryFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-green-500 bg-gray-50 shadow-sm rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg text-gray-900">Delivery #{index + 1}</h4>
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
                        <FormLabel className="text-gray-700">Name</FormLabel>
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
                        <FormLabel className="text-gray-700">Address Line 1</FormLabel>
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
                        <FormLabel className="text-gray-700">Address Line 2 (Optional)</FormLabel>
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
                        <FormLabel className="text-gray-700">City</FormLabel>
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
                        <FormLabel className="text-gray-700">Postcode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., M1 1AA" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.time`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Time (HH:MM, Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 14:00" {...stopField} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.notes`}
                    render={({ field: stopField }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel className="text-gray-700">Notes / Reference</FormLabel>
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
              <p className="text-gray-600 text-center">No delivery points added yet.</p>
            )}
            <FormMessage>{form.formState.errors.deliveries?.message}</FormMessage>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Create Job</Button>
      </form>
    </Form>
  );
};

export default JobForm;