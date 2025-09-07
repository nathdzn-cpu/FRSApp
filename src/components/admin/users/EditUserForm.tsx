"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Profile } from '@/utils/mockData';

const editUserFormSchema = z.object({
  full_name: z.string().min(1, { message: 'Full name is required.' }),
  dob: z.date().optional().nullable(),
  phone: z.string().min(1, { message: 'Contact number is required.' }).optional().or(z.literal('')),
  role: z.enum(['driver', 'office', 'admin'], { required_error: 'Role is required.' }),
  user_id: z.string().min(1, { message: 'Internal User ID is required.' }).optional().or(z.literal('')),
  truck_reg: z.string().optional().or(z.literal('')),
  trailer_no: z.string().optional().or(z.literal('')),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserFormProps {
  onSubmit: (values: EditUserFormValues) => void;
  defaultValues: Profile;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ onSubmit, defaultValues }) => {
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      full_name: defaultValues.full_name,
      dob: defaultValues.dob ? parseISO(defaultValues.dob) : undefined,
      phone: defaultValues.phone || '',
      role: defaultValues.role,
      user_id: defaultValues.user_id || '',
      truck_reg: defaultValues.truck_reg || '',
      trailer_no: defaultValues.trailer_no || '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">User Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white shadow-sm rounded-xl">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="office">Office</SelectItem>
                      <SelectItem value="driver">Driver</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-700">Date of Birth (Optional)</FormLabel>
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
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        captionLayout="dropdown"
                        fromYear={1900}
                        toYear={new Date().getFullYear()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., +447123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Internal User ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., auth_user_id_123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch('role') === 'driver' && (
              <>
                <FormField
                  control={form.control}
                  name="truck_reg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Truck Registration</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., AB12 CDE" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trailer_no"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Trailer Number</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., TRL-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
          </CardContent>
        </Card>
        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Save Changes</Button>
      </form>
    </Form>
  );
};

export default EditUserForm;