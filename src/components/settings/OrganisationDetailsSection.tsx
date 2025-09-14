"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Organisation } from '@/utils/mockData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateOrganisationDetails, uploadLogo } from '@/lib/api/organisation';
import { toast } from 'sonner';
import { Loader2, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const orgDetailsSchema = z.object({
  name: z.string().min(1, 'Company name is required.'),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  contact_number: z.string().optional().nullable(),
  website: z.string().url('Must be a valid URL').or(z.literal('')).optional().nullable(),
});

type OrgDetailsFormValues = z.infer<typeof orgDetailsSchema>;

interface OrganisationDetailsSectionProps {
  organisation: Organisation;
}

const OrganisationDetailsSection: React.FC<OrganisationDetailsSectionProps> = ({ organisation }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<OrgDetailsFormValues>({
    resolver: zodResolver(orgDetailsSchema),
    defaultValues: {
      name: organisation.name || '',
      address_line1: organisation.address_line1 || '',
      address_line2: organisation.address_line2 || '',
      city: organisation.city || '',
      postcode: organisation.postcode || '',
      contact_number: organisation.contact_number || '',
      website: organisation.website || '',
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: (values: Partial<Organisation>) => updateOrganisationDetails(organisation.id, values),
    onSuccess: () => {
      toast.success('Organisation details updated!');
      queryClient.invalidateQueries({ queryKey: ['organisation', organisation.id] });
    },
    onError: (error: any) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const logoUrl = await uploadLogo(organisation.id, file);
      updateOrgMutation.mutate({ logo_url: logoUrl });
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = (values: OrgDetailsFormValues) => {
    updateOrgMutation.mutate(values);
  };

  return (
    <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
      <CardHeader className="p-0 pb-4 flex flex-row justify-between items-center">
        <CardTitle className="text-2xl font-bold text-gray-900">Organisation Details</CardTitle>
        <div className="text-right">
          <p className="text-sm text-gray-500">Organisation Key</p>
          <p className="text-lg font-bold text-gray-800 tracking-widest">{organisation.organisation_key || 'N/A'}</p>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24 rounded-md">
                <AvatarImage src={organisation.logo_url || undefined} alt={organisation.name} className="object-contain" />
                <AvatarFallback className="rounded-md">{organisation.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg"
                  disabled={isUploading}
                />
                <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Change Logo
                </Button>
                <p className="text-xs text-gray-500 mt-2">PNG or JPG, max 2MB.</p>
              </div>
            </div>

            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address_line1" render={({ field }) => (
              <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="postcode" render={({ field }) => (
              <FormItem><FormLabel>Postcode</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contact_number" render={({ field }) => (
              <FormItem><FormLabel>Contact Number</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="website" render={({ field }) => (
              <FormItem><FormLabel>Website</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" disabled={updateOrgMutation.isPending}>
              {updateOrgMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default OrganisationDetailsSection;