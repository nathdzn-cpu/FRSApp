"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import JobTimeline from '@/components/JobTimeline';
import JobStopsTable from '@/components/JobStopsTable';
import JobPodsGrid from '@/components/JobPodsGrid';
import { JobProgressLog, JobStop, Document, Profile } from '@/utils/mockData';

interface JobDetailTabsProps {
  progressLogs: JobProgressLog[];
  allProfiles: Profile[];
  stops: JobStop[];
  documents: Document[];
}

const JobDetailTabs: React.FC<JobDetailTabsProps> = ({ progressLogs, allProfiles, stops, documents }) => {
  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm rounded-xl p-1">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="stops">Stops Table</TabsTrigger>
        <TabsTrigger value="pods">PODs</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobTimeline progressLogs={progressLogs} profiles={allProfiles} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="stops" className="mt-4">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Stops Table</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobStopsTable stops={stops} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="pods" className="mt-4">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Proof of Delivery (PODs)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobPodsGrid documents={documents} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default JobDetailTabs;