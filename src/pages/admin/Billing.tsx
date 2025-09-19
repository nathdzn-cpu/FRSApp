"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfiles } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Users, PoundSterling, AlertTriangle } from 'lucide-react';
import { formatGBP } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const PRICE_PER_USER_MONTH = 10; // Placeholder price

const BillingPage = () => {
  const { profile, userRole, isLoadingAuth } = useAuth();
  const navigate = useNavigate();
  const currentOrgId = profile?.org_id;

  const { data: profiles = [], isLoading: isLoadingProfiles, error: profilesError } = useQuery({
    queryKey: ['profiles', currentOrgId, 'all_for_billing'],
    queryFn: () => getProfiles(currentOrgId!, userRole),
    enabled: !!currentOrgId && userRole === 'admin',
  });

  const activeUserCount = profiles.length;
  const monthlyBill = activeUserCount * PRICE_PER_USER_MONTH;

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Billing</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Billing Overview</CardTitle>
          <CardDescription>Your estimated monthly bill based on active users.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="ml-2">Loading billing details...</p>
            </div>
          ) : profilesError ? (
            <div className="text-red-600">Failed to load user data.</div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-gray-500" />
                  <span className="font-medium">Number of Active Users</span>
                </div>
                <span className="font-bold text-lg">{activeUserCount}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <PoundSterling className="h-5 w-5 mr-3 text-gray-500" />
                  <span className="font-medium">Price Per User / Month</span>
                </div>
                <span className="font-bold text-lg">{formatGBP(PRICE_PER_USER_MONTH)}</span>
              </div>
              <div className="border-t my-4"></div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <PoundSterling className="h-6 w-6 mr-3 text-blue-600" />
                  <span className="font-semibold text-blue-800">Total Estimated Monthly Bill</span>
                </div>
                <span className="font-bold text-2xl text-blue-800">{formatGBP(monthlyBill)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader className="flex-row items-center gap-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <div >
            <CardTitle className="text-yellow-800">Preview Mode</CardTitle>
            <CardDescription className="text-yellow-700">
              Billing is currently in preview mode. Stripe integration is coming soon for automated payments.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
};

export default BillingPage;