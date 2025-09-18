"use client";

import React from 'react';
import { useFieldArray, UseFormReturn } from 'react-hook-form';
import { JobFormValues, formatTimeInput } from '@/lib/schemas/jobSchema';
import { SavedAddress } from '@/utils/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';
import { formatPostcode, toTitleCase } from '@/lib/utils/formatUtils';
import AddressSearchInput from '../AddressSearchInput';

interface JobStopsSectionProps {
  type: 'collections' | 'deliveries';
  form: UseFormReturn<JobFormValues>;
  isSubmitting: boolean;
  isDriver?: boolean;
}

const JobStopsSection: React.FC<JobStopsSectionProps> = ({ type, form, isSubmitting, isDriver }) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: type,
  });

  const handleAddressSelect = (index: number, address: SavedAddress) => {
    const fieldNamePrefix = `${type}.${index}`;
    form.setValue(`${fieldNamePrefix}.name` as any, address.name || toTitleCase(address.line_1));
    form.setValue(`${fieldNamePrefix}.address_line1` as any, address.line_1);
    form.setValue(`${fieldNamePrefix}.address_line2` as any, address.line_2 || null);
    form.setValue(`${fieldNamePrefix}.city` as any, address.town_or_city);
    form.setValue(`${fieldNamePrefix}.postcode` as any, address.postcode);
    form.trigger(`${fieldNamePrefix}.address_line1` as any);
    form.trigger(`${fieldNamePrefix}.city` as any);
    form.trigger(`${fieldNamePrefix}.postcode` as any);
  };

  const disableAddressFields = isSubmitting || isDriver;

  return (
    <Card className="bg-gray-50 shadow-sm rounded-xl p-6">
      <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
        <CardTitle className="text-xl font-semibold text-gray-900">{type === 'collections' ? 'Collection Points' : 'Delivery Points'}</CardTitle>
        {!isDriver && (
          <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '', address_line1: '', city: '', postcode: '', window_from: '', window_to: '', notes: '' })} disabled={isSubmitting}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add {type === 'collections' ? 'Collection' : 'Delivery'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-0 pt-4">
        {fields.map((field, index) => (
          <Card key={field.id} className={`p-4 border-l-4 ${type === 'collections' ? 'border-blue-500' : 'border-green-500'} shadow-sm rounded-md`}>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-lg text-gray-900">{type === 'collections' ? `Collection ${index + 1}` : `Delivery ${index + 1}`}</h4>
              {!isDriver && (
                <Button type="button" variant="destructive" size="sm" onClick={() => remove(index)} disabled={isSubmitting}>
                  <Trash2 className="h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={`${type}.${index}.name`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Name (Optional)</FormLabel>
                    <FormControl>
                      <AddressSearchInput
                        placeholder={type === 'collections' ? "e.g., Supplier Warehouse" : "e.g., Customer Site"}
                        value={stopField.value || ''}
                        onValueChange={stopField.onChange}
                        onAddressSelect={(address) => handleAddressSelect(index, address)}
                        disabled={disableAddressFields}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${type}.${index}.address_line1`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Address Line 1</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123 High Street" {...stopField} disabled={disableAddressFields} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${type}.${index}.address_line2`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Address Line 2 (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Unit 4" {...stopField} value={stopField.value || ''} disabled={disableAddressFields} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${type}.${index}.city`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., London" {...stopField} disabled={disableAddressFields} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`${type}.${index}.postcode`}
                render={({ field: stopField }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Postcode</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., SW1A 0AA"
                        {...stopField}
                        value={formatPostcode(stopField.value || '')}
                        onBlur={(e) => {
                          stopField.onChange(formatPostcode(e.target.value));
                          stopField.onBlur();
                        }}
                        disabled={disableAddressFields}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
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
                  control={form.control}
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
                control={form.control}
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
          <p className="text-gray-600 text-center">No {type} points added yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default JobStopsSection;