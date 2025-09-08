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
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Profile, SavedAddress } from '@/utils/mockData';
import { Checkbox } from '@/components/ui/checkbox';
import { formatGBPDisplay, parseCurrencyInput, formatAddressPart, formatPostcode, toTitleCase } from '@/lib/utils/formatUtils';
import AddressSearchInput from './AddressSearchInput'; // Import new component

// Helper to format time input to HH:MM
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
  name: z.string().optional().nullable(), // Name is now optional, can be derived from line_1
  address_line1: z.string().min(1, { message: 'Address line 1 is required.' }),
  address_line2: z.string().optional().nullable(),
  city: z.string().min(1, { message: 'City is required.' }),
  postcode: z.string().min(1, { message: 'Postcode is required.' }),
  window_from: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  window_to: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'Invalid time format (HH:MM)' }).optional().or(z.literal('')),
  notes: z.string().optional().nullable(),
});

const formSchema = z.object({
  order_number: z.string().optional().or(z.literal('')), // Optional for auto-generation
  date_created: z.date({ required_error: 'Date Created is required.' }),
  price: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, { message: 'Price must be non-negative.' }).nullable().optional()
  ),
  assigned_driver_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  collections: z.array(stopSchema).min(0),
  deliveries: z.array(stopSchema).min(1, { message: 'At least one delivery point is required.' }),
});

type JobFormValues = z.infer<typeof formSchema>;

interface JobFormProps {
  onSubmit: (values: JobFormValues) => void;
  drivers: Profile[]; // Only drivers for assignment
}

const JobForm: React.FC<JobFormProps> = ({ onSubmit, drivers }) => {
  const form = useForm<JobFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      order_number: '', // Default to empty, trigger will generate if not provided
      date_created: new Date(), // Default to today
      price: null,
      assigned_driver_id: null,
      notes: '',
      collections: [], // Changed to empty array
      deliveries: [], // Changed to empty array
    },
  });

  // Local state for the price input string
  const [priceInputString, setPriceInputString] = useState<string>('');

  // Sync local state with form's price value
  useEffect(() => {
    const formPrice = form.getValues('price');
    if (formPrice !== null && formPrice !== undefined) {
      setPriceInputString(formPrice.toFixed(2)); // Format to 2 decimal places for display
    } else {
      setPriceInputString('');
    }
  }, [form.watch('price')]); // Watch the form's price field

  const { fields: collectionFields, append: appendCollection, remove: removeCollection, update: updateCollection } = useFieldArray({
    control: form.control,
    name: 'collections',
  });

  const { fields: deliveryFields, append: appendDelivery, remove: removeDelivery, update: updateDelivery } = useFieldArray({
    control: form.control,
    name: 'deliveries',
  });

  const handleAddressSelect = (index: number, type: 'collections' | 'deliveries', address: SavedAddress) => {
    const fieldNamePrefix = `${type}.${index}`;
    form.setValue(`${fieldNamePrefix}.name`, address.name || toTitleCase(address.line_1));
    form.setValue(`${fieldNamePrefix}.address_line1`, address.line_1);
    form.setValue(`${fieldNamePrefix}.address_line2`, address.line_2);
    form.setValue(`${fieldNamePrefix}.city`, address.town_or_city);
    form.setValue(`${fieldNamePrefix}.county`, address.county); // Added county
    form.setValue(`${fieldNamePrefix}.postcode`, address.postcode);
    form.trigger(`${fieldNamePrefix}.address_line1`); // Trigger validation
    form.trigger(`${fieldNamePrefix}.city`);
    form.trigger(`${fieldNamePrefix}.postcode`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
            {/* Order Number */}
            <FormField
              control={form.control}
              name="order_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Order Number (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Leave blank for auto-generate, or enter ORDER-XXX"
                      {...field}
                      value={field.value || ''} // Ensure controlled component
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <PopoverContent className="w-auto p-0 bg-[var(--saas-card-bg)] shadow-sm rounded-xl" align="start">
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
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                      <Input
                        type="text" // Use text type for custom formatting
                        placeholder="0.00"
                        value={priceInputString} // Controlled by local state
                        onChange={(e) => {
                          const rawInput = e.target.value;
                          setPriceInputString(rawInput); // Update local state instantly
                        }}
                        onBlur={() => {
                          const numericValue = parseCurrencyInput(priceInputString);
                          field.onChange(numericValue); // Update react-hook-form with numeric value
                          // After updating the form, re-sync local state to ensure full formatting
                          if (numericValue !== null) {
                            setPriceInputString(numericValue.toFixed(2)); // Ensure 2 decimal places on blur
                          } else {
                            setPriceInputString('');
                          }
                          field.onBlur(); // Call react-hook-form's onBlur
                        }}
                        className="pl-7" // Add left padding for the £ symbol
                        disabled={field.disabled}
                      />
                    </div>
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
                <FormItem>
                  <FormLabel className="text-gray-700">Assign Driver (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
                      <SelectItem value="null">Unassigned</SelectItem>
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

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="text-gray-700">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any general notes for this job..." {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Collection Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendCollection({ name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '' })}>
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
                        <FormLabel className="text-gray-700">Name (Optional)</FormLabel>
                        <FormControl>
                          <AddressSearchInput
                            placeholder="e.g., Supplier Warehouse"
                            value={stopField.value || ''}
                            onValueChange={stopField.onChange}
                            onAddressSelect={(address) => handleAddressSelect(index, 'collections', address)}
                          />
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
                          <Input
                            placeholder="e.g., 123 High Street"
                            {...stopField}
                          />
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
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="e.g., SW1A 0AA"
                              {...stopField}
                              value={formatPostcode(stopField.value)}
                              onBlur={(e) => {
                                stopField.onChange(formatPostcode(e.target.value));
                                stopField.onBlur();
                              }}
                            />
                          </FormControl>
                        </div>
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
                          <FormLabel className="text-gray-700">Window From (HH:MM)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 09:00"
                              {...stopField}
                              onBlur={(e) => {
                                stopField.onChange(formatTimeInput(e.target.value));
                                stopField.onBlur();
                              }}
                            />
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
                          <FormLabel className="text-gray-700">Window To (HH:MM)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 12:00"
                              {...stopField}
                              onBlur={(e) => {
                                stopField.onChange(formatTimeInput(e.target.value));
                                stopField.onBlur();
                              }}
                            />
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
                        <FormLabel className="text-gray-700">Notes / Reference</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} value={stopField.value || ''} />
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

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Delivery Points</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendDelivery({ name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '' })}>
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
                        <FormLabel className="text-gray-700">Name (Optional)</FormLabel>
                        <FormControl>
                          <AddressSearchInput
                            placeholder="e.g., Customer Site"
                            value={stopField.value || ''}
                            onValueChange={stopField.onChange}
                            onAddressSelect={(address) => handleAddressSelect(index, 'deliveries', address)}
                          />
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
                          <Input
                            placeholder="e.g., 123 High Street"
                            {...stopField}
                          />
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
                        <div className="flex gap-2">
                          <FormControl>
                            <Input
                              placeholder="e.g., M1 1AA"
                              {...stopField}
                              value={formatPostcode(stopField.value)}
                              onBlur={(e) => {
                                stopField.onChange(formatPostcode(e.target.value));
                                stopField.onBlur();
                              }}
                            />
                          </FormControl>
                        </div>
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
                          <FormLabel className="text-gray-700">Window From (HH:MM)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 14:00"
                              {...stopField}
                              onBlur={(e) => {
                                stopField.onChange(formatTimeInput(e.target.value));
                                stopField.onBlur();
                              }}
                            />
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
                          <FormLabel className="text-gray-700">Window To (HH:MM)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 17:00"
                              {...stopField}
                              onBlur={(e) => {
                                stopField.onChange(formatTimeInput(e.target.value));
                                stopField.onBlur();
                              }}
                            />
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
                        <FormLabel className="text-gray-700">Notes / Reference</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} value={stopField.value || ''} />
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