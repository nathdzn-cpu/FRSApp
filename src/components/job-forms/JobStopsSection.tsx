"use client";

import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SavedAddress } from '@/utils/mockData';
import { formatPostcode, toTitleCase } from '@/lib/utils/formatUtils';
import AddressSearchInput from '@/components/AddressSearchInput';
import { v4 as uuidv4 } from 'uuid'; // Import uuid for new stop IDs

interface JobStopsSectionProps {
  type: 'collections' | 'deliveries';
  title: string;
  borderColorClass: string;
  isOfficeOrAdmin: boolean;
  disableStopDetailsForDriver: boolean;
  isSubmitting: boolean;
}

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

const JobStopsSection: React.FC<JobStopsSectionProps> = ({
  type,
  title,
  borderColorClass,
  isOfficeOrAdmin,
  disableStopDetailsForDriver,
  isSubmitting,
}) => {
  const { control, setValue, trigger } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: type,
  });

  const handleAddressSelect = (index: number, address: SavedAddress) => {
    const fieldNamePrefix = `${type}.${index}`;
    setValue(`${fieldNamePrefix}.name`, address.name || toTitleCase(address.line_1), { shouldDirty: true });
    setValue(`${fieldNamePrefix}.address_line1`, address.line_1, { shouldDirty: true });
    setValue(`${fieldNamePrefix}.address_line2`, address.line_2, { shouldDirty: true });
    setValue(`${fieldNamePrefix}.city`, address.town_or_city, { shouldDirty: true });
    setValue(`${fieldNamePrefix}.postcode`, address.postcode, { shouldDirty: true });
    trigger(`${fieldNamePrefix}.address_line1`); // Trigger validation
    trigger(`${fieldNamePrefix}.city`);
    trigger(`${fieldNamePrefix}.postcode`);
  };

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6">
      <div className="flex flex-row items-center justify-between p-0 pb-4">
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        {isOfficeOrAdmin && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ id: uuidv4(), name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '', type: type === 'collections' ? 'collection' : 'delivery' })}
            disabled={isSubmitting}
          >
            <PlusCircle className="h-4 w-4 mr-2" /> Add {type === 'collections' ? 'Collection' : 'Delivery'}
          </Button>
        )}
      </div>
      <div className="space-y-4 p-0 pt-4">
        {fields.map((field, index) => (
          <Card key={field.id} className={`p-4 ${borderColorClass} bg-gray-50 shadow-sm rounded-md`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-gray-900">{type === 'collections' ? 'Collection' : 'Delivery'} #{index + 1}</h4>
              {isOfficeOrAdmin && (
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={isSubmitting}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={control}
                name={`${type}.${index}.name`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Supplier Warehouse" {...stopField} disabled={disableStopDetailsForDriver || isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${type}.${index}.address_line1`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Address Line 1</FormLabel>
                    <FormControl>
                      <AddressSearchInput
                        placeholder="Start typing address or postcode..."
                        value={stopField.value}
                        onValueChange={stopField.onChange}
                        onAddressSelect={(address) => handleAddressSelect(index, address)}
                        disabled={disableStopDetailsForDriver || isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`${type}.${index}.address_line2`}
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
                control={control}
                name={`${type}.${index}.city`}
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
                control={control}
                name={`${type}.${index}.postcode`}
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
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={control}
                  name={`${type}.${index}.window_from`}
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
                  control={control}
                  name={`${type}.${index}.window_to`}
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
                control={control}
                name={`${type}.${index}.notes`}
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
        {fields.length === 0 && (
          <p className="text-gray-600 text-center">No {type === 'collections' ? 'collection' : 'delivery'} points added yet.</p>
        )}
        <FormMessage>{control._formState.errors[type]?.message}</FormMessage>
      </div>
    </Card>
  );
};

export default JobStopsSection;