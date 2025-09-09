"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import UserProfileSection from '@/components/settings/UserProfileSection';
import OrganisationDetailsSection from '@/components/settings/OrganisationDetailsSection';
import { useQuery } from '@tanstack/react-query';
import { getOrganisationDetails } from '@/lib/api/organisation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Settings: React.FC = () => {
  const { profile, userRole, isLoadingAuth } = useAuth();

  const { data: organisation, isLoading: isLoadingOrg } = useQuery({
    queryKey: ['organisation', profile?.org_id],
    queryFn: () => getOrganisationDetails(profile!.org_id!),
    enabled: !!profile?.org_id && userRole === 'admin',
  });

  if (isLoadingAuth || !profile) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
       <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Settings</CardTitle>
          </CardHeader>
        </Card>
      <UserProfileSection profile={profile} />
      {userRole === 'admin' && (
        isLoadingOrg ? (
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : organisation ? (
          <OrganisationDetailsSection organisation={organisation} />
        ) : (
          <p>Could not load organisation details.</p>
        )
      )}
    </div>
  );
};

export default Settings;