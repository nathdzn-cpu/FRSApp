"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { getUsersForAdmin } from '@/lib/api/profiles';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Profile } from '@/utils/mockData';

const PRICE_PER_USER_GBP = 10;

const BillingPage: React.FC = () => {
  const { currentOrgId, userRole } = useAuth();

  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ['orgUsers', currentOrgId],
    queryFn: () => getUsersForAdmin(currentOrgId!),
    enabled: !!currentOrgId && userRole === 'admin',
  });

  if (userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 p-8">Error loading user data: {error.message}</div>;
  }

  const userCount = profiles?.length || 0;
  const monthlyBill = userCount * PRICE_PER_USER_GBP;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Billing & Usage</h1>
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You have <span className="font-bold text-blue-600">{userCount}</span> active users in your organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles && profiles.map(profile => (
                <TableRow key={profile.id}>
                  <TableCell>{profile.full_name}</TableCell>
                  <TableCell className="capitalize">{profile.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-end bg-gray-50 p-6 rounded-b-xl">
          <div className="text-right">
            <p className="text-sm text-gray-600">
              {userCount} users @ £{PRICE_PER_USER_GBP.toFixed(2)}/user
            </p>
            <p className="text-2xl font-bold">
              Total: £{monthlyBill.toFixed(2)} per month
            </p>
          </div>
        </CardFooter>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
          <CardDescription>Your previous invoices will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No billing history yet.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage;