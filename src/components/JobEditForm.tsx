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
import { CalendarIcon, PlusCircle, Trash2, Loader2, Search } from 'lucide-react'; // Added Search icon
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Job, JobStop, Profile } from '@/utils/mockData';
import { useAuth } from '@/context/AuthContext';
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import the new utility
import { formatGBPDisplay, parseCurrencyInput, formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils'; // Import new utilities
import AddressSearchDialog from '@/components/AddressSearchDialog'; // Import AddressSearchDialog
import { FullAddress } from '@/lib/supabase'; // Import FullAddress type

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
  id: z.string().optional(), // Optional for new stops
  name: z.string().min(1, { message: 'Stop name is required.' }),
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

  const form = useForm<JobFormValues>({
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

  const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState<number | null>(null);
  const [currentStopType, setCurrentStopType] = useState<'collections' | 'deliveries' | null>(null);

  const handleOpenAddressSearch = (index: number, type: 'collections' | 'deliveries') => {
    setCurrentStopIndex(index);
    setCurrentStopType(type);
    setIsAddressSearchOpen(true);
  };

  const handleAddressSelect = (fullAddress: FullAddress) => {
    if (currentStopIndex !== null && currentStopType) {
      const addressLine1 = fullAddress.line_1 || fullAddress.thoroughfare || fullAddress.formatted_address[0] || '';
      const addressLine2 = fullAddress.line_2 || fullAddress.formatted_address[1] || '';
      const city = fullAddress.town_or_city || fullAddress.locality || '';
      const postcode = fullAddress.postcode || '';
      const name = fullAddress.building_name || fullAddress.sub_building_name || addressLine1;

      const updatedStop = {
        id: form.getValues(`${currentStopType}.${currentStopIndex}.id`), // Preserve existing ID
        name: formatAddressPart(name),
        address_line1: formatAddressPart(addressLine1),
        address_line2: formatAddressPart(addressLine2) || null,
        city: formatAddressPart(city),
        postcode: formatPostcode(postcode),
        window_from: form.getValues(`${currentStopType}.${currentStopIndex}.window_from`) || '',
        window_to: form.getValues(`${currentStopType}.${currentStopIndex}.window_to`) || '',
        notes: form.getValues(`${currentStopType}.${currentStopIndex}.notes`) || null,
        type: currentStopType === 'collections' ? 'collection' : 'delivery',
      };

      if (currentStopType === 'collections') {
        updateCollection(currentStopIndex, updatedStop);
      } else {
        updateDelivery(currentStopIndex, updatedStop);
      }
    }
  };

  // Disable fields based on user role
  const disableAllButDriverFields = isDriver;
  const disableStopDetailsForDriver = isDriver; // Driver can only edit window_from/to and notes

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-white shadow-sm rounded-xl p-6">
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
                  <FormLabel className="text-gray-700">Order Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ORDER-XXX"
                      {...field}
                      value={field.value || ''}
                      disabled={disableAllButDriverFields}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger disabled={isSubmitting}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white shadow-sm rounded-xl">
                      {['planned', 'assigned', 'accepted', 'on_route_collection', 'at_collection', 'loaded', 'on_route_delivery', 'at_delivery', 'delivered', 'pod_received', 'cancelled'].map(status => (
                        <SelectItem key={status} value={status}>
                          {getDisplayStatus(status as Job['status'])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                          disabled={disableAllButDriverFields}
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
                        disabled={disableAllButDriverFields || isSubmitting}
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
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={disableAllButDriverFields}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white shadow-sm rounded-xl">
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
                    <Textarea placeholder="Any general notes for this job..." {...field} value={field.value || ''} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Collection Points */}
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Collection Points</CardTitle>
            {isOfficeOrAdmin && (
              <Button type="button" variant="outline" size="sm" onClick={() => appendCollection({ id: uuidv4(), name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '', type: 'collection' })} disabled={isSubmitting}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Collection
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-4">
            {collectionFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 shadow-sm rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg text-gray-900">Collection #{index + 1}</h4>
                  {isOfficeOrAdmin && (
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeCollection(index)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`collections.${index}.name`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Supplier Warehouse" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., 123 Industrial Road" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., Unit 4" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., London" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                              disabled={disableStopDetailsForDriver || isSubmitting}
                            />
                          </FormControl>
                          <Button type="button" variant="outline" size="icon" onClick={() => handleOpenAddressSearch(index, 'collections')} disabled={disableStopDetailsForDriver || isSubmitting}>
                            <Search className="h-4 w-4" />
                          </Button>
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
                              disabled={isSubmitting}
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
                              disabled={isSubmitting}
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
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} value={stopField.value || ''} disabled={isSubmitting} />
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
            {isOfficeOrAdmin && (
              <Button type="button" variant="outline" size="sm" onClick={() => appendDelivery({ id: uuidv4(), name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '', type: 'delivery' })} disabled={isSubmitting}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Delivery
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4 p-0 pt-4">
            {deliveryFields.map((field, index) => (
              <Card key={field.id} className="p-4 border-l-4 border-green-500 bg-gray-50 shadow-sm rounded-md">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-lg text-gray-900">Delivery #{index + 1}</h4>
                  {isOfficeOrAdmin && (
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeDelivery(index)} disabled={isSubmitting}>
                      <Trash2 className="h-4 w-4" /> Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`deliveries.${index}.name`}
                    render={({ field: stopField }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700">Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Customer Site" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., 456 Retail Street" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., Loading Bay" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                          <Input placeholder="e.g., Manchester" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
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
                              disabled={disableStopDetailsForDriver || isSubmitting}
                            />
                          </FormControl>
                          <Button type="button" variant="outline" size="icon" onClick={() => handleOpenAddressSearch(index, 'deliveries')} disabled={disableStopDetailsForDriver || isSubmitting}>
                            <Search className="h-4 w-4" />
                          </Button>
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
                              disabled={isSubmitting}
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
                              disabled={isSubmitting}
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
                          <Textarea placeholder="Any specific instructions for this stop..." {...stopField} value={stopField.value || ''} disabled={isSubmitting} />
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

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Save Changes</Button>
      </form>

      <AddressSearchDialog
        open={isAddressSearchOpen}
        onOpenChange={setIsAddressSearchOpen}
        onAddressSelect={handleAddressSelect}
        initialQuery={currentStopIndex !== null && currentStopType ? form.getValues(`${currentStopType}.${currentStopIndex}.postcode`) || '' : ''}
      />
    </Form>
  );
};

export default JobEditForm;