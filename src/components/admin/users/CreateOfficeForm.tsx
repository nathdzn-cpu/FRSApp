"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Import Avatar

// Generate years for DOB dropdown (e.g., 1900 to current year)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (1900 + i).toString()).reverse();
const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));

const officeFormSchema = z.object({
  full_name: z.string().min(1, { message: 'Full name is required.' }),
  dob_year: z.string().min(1, { message: 'Year is required.' }),
  dob_month: z.string().min(1, { message: 'Month is required.' }),
  dob_day: z.string().min(1, { message: 'Day is required.' }),
  phone: z.string().min(1, { message: 'Contact number is required.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }),
});

type OfficeFormValues = z.infer<typeof officeFormSchema>;

interface CreateOfficeFormProps {
  onSubmit: (values: OfficeFormValues) => void;
}

const CreateOfficeForm: React.FC<CreateOfficeFormProps> = ({ onSubmit }) => {
  const form = useForm<OfficeFormValues>({
    resolver: zodResolver(officeFormSchema),
    defaultValues: {
      full_name: '',
      dob_year: '',
      dob_month: '',
      dob_day: '',
      phone: '',
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Office User Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-0 pt-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-2">
              <FormField
                control={form.control}
                name="dob_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl max-h-60 overflow-y-auto">
                        {years.map((year) => (
                          <SelectItem key={year} value={year}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob_month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Month</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </Trigger>
                      </FormControl>
                      <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
                        {months.map((month) => (
                          <SelectItem key={month} value={month}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Day</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
                        {days.map((day) => (
                          <SelectItem key={day} value={day}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="jane.doe@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">Create Office User</Button>
      </form>
    </Form>
  );
};

export default CreateOfficeForm;