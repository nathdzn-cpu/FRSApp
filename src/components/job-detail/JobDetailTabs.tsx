"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import JobTimeline from '@/components/JobTimeline';
import JobAuditLog from '@/components/JobAuditLog';
import JobStopsTable from '@/components/JobStopsTable';
import JobPodsGrid from '@/components/JobPodsGrid';
import { JobProgressLog, JobStop, Document, Profile, Job } from '@/utils/mockData';
import { coreProgressActionTypes } from '@/lib/utils/statusUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getJobProgressLogs, getJobDocuments } from '@/lib/api/jobs';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export interface JobDetailTabsProps {
  job: Job;
  profiles?: Profile[];
  stops?: JobStop[];
}

const JobDetailTabs: React.FC<JobDetailTabsProps> = ({ job, profiles = [], stops = [] }) => {
  const { profile } = useAuth();
  const currentOrgId = profile?.org_id;
  const queryClient = useQueryClient();

  const { data: progressLogs = [], isLoading: isLoadingLogs } = useQuery<JobProgressLog[], Error>({
    queryKey: ['jobProgressLogs', job.id],
    queryFn: () => getJobProgressLogs(currentOrgId!, job.id),
    enabled: !!currentOrgId && !!job.id,
  });

  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<Document[], Error>({
    queryKey: ['jobDocuments', job.id],
    queryFn: () => getJobDocuments(currentOrgId!, job.id),
    enabled: !!currentOrgId && !!job.id,
  });

  const timelineLogs = progressLogs.filter(log => coreProgressActionTypes.includes(log.action_type));

  const handleLogVisibilityChange = () => {
    queryClient.invalidateQueries({ queryKey: ['jobProgressLogs', job.id] });
  };

  if (isLoadingLogs || isLoadingDocs) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-1">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="audit-log">Audit Log</TabsTrigger>
        <TabsTrigger value="stops">Stops Table</TabsTrigger>
        <TabsTrigger value="pods">PODs</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobTimeline
              progressLogs={timelineLogs}
              profiles={profiles}
              currentOrgId={currentOrgId!}
              onLogVisibilityChange={handleLogVisibilityChange}
              job={job}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="audit-log" className="mt-4">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobAuditLog progressLogs={progressLogs} profiles={profiles} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="stops" className="mt-4">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Stops Table</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobStopsTable stops={stops} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="pods" className="mt-4">
        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Proof of Delivery (PODs)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobPodsGrid documents={documents} job={job} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default JobDetailTabs;