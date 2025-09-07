"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import JobTimeline from '@/components/JobTimeline';
import JobAuditLog from '@/components/JobAuditLog'; // Import the new Audit Log component
import JobStopsTable from '@/components/JobStopsTable';
import JobPodsGrid from '@/components/JobPodsGrid';
import { JobProgressLog, JobStop, Document, Profile } from '@/utils/mockData';
import { coreProgressActionTypes } from '@/lib/utils/statusUtils'; // Import coreProgressActionTypes

interface JobDetailTabsProps {
  progressLogs: JobProgressLog[];
  allProfiles: Profile[];
  stops: JobStop[];
  documents: Document[];
  currentOrgId: string; // Added currentOrgId
  onLogVisibilityChange: () => void; // Added onLogVisibilityChange
}

const JobDetailTabs: React.FC<JobDetailTabsProps> = ({ progressLogs, allProfiles, stops, documents, currentOrgId, onLogVisibilityChange }) => {
  // Filter logs for the Timeline tab (JobTimeline component will handle its own filtering for visible_in_timeline)
  const timelineLogs = progressLogs.filter(log => coreProgressActionTypes.includes(log.action_type));

  return (
    <Tabs defaultValue="timeline" className="w-full">
      <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm rounded-xl p-1"> {/* Changed to 4 columns */}
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="audit-log">Audit Log</TabsTrigger> {/* New Audit Log tab */}
        <TabsTrigger value="stops">Stops Table</TabsTrigger>
        <TabsTrigger value="pods">PODs</TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobTimeline
              progressLogs={timelineLogs}
              profiles={allProfiles}
              currentOrgId={currentOrgId}
              onLogVisibilityChange={onLogVisibilityChange}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="audit-log" className="mt-4"> {/* New Audit Log tab content */}
        <Card className="bg-white shadow-sm rounded-xl p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-xl font-semibold text-gray-900">Job Audit Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <JobAuditLog progressLogs={progressLogs} profiles={allProfiles} /> {/* Pass all logs */}
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