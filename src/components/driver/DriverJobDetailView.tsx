"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Job, JobStop, Profile, JobProgressLog } from '@/utils/mockData';
import DriverJobStopCard from './DriverJobStopCard';
import { updateJobProgress } from '@/lib/api/jobs'; // Using jobs API for consistency
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components

interface DriverJobDetailViewProps {
  job: Job;
  stops: JobStop[];
  progressLogs: JobProgressLog[];
  currentProfile: Profile;
  currentOrgId: string;
  userRole: 'driver';
  refetchJobData: () => void;
}

const DriverJobDetailView: React.FC<DriverJobDetailViewProps> = ({
  job,
  stops,
  progressLogs,
  currentProfile,
  currentOrgId,
  userRole,
  refetchJobData,
}) => {
  const navigate = useNavigate();
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const sortedStops = [...stops].sort((a, b) => a.seq - b.seq);

  const handleUpdateProgress = async (
    newStatus: Job['status'],
    timestamp: Date,
    notes: string,
    stopId?: string
  ) => {
    setIsUpdatingProgress(true);
    try {
      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        actor_role: userRole,
        new_status: newStatus,
        timestamp: timestamp.toISOString(),
        notes: notes.trim() || undefined,
        stop_id: stopId,
      };
      await updateJobProgress(payload);
      refetchJobData(); // Refetch all job data to update logs and status
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      throw err; // Re-throw to allow dialog to handle its own error state
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handlePodUploadSuccess = () => {
    refetchJobData(); // Refetch after POD upload to update job status
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Job: {job.order_number}</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4 space-y-4">
            <div>
              <p className="font-medium text-gray-900">Notes:</p>
              <p className="text-gray-700">{job.notes || '-'}</p>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Job Stops</h3>
            {sortedStops.length === 0 ? (
              <p className="text-gray-600">No stops defined for this job.</p>
            ) : (
              <Tabs defaultValue={sortedStops[0].id} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 bg-gray-100 p-1 rounded-lg">
                  {sortedStops.map((stop) => (
                    <TabsTrigger key={stop.id} value={stop.id} data-testid="driver-stop-tab">
                      {stop.type === 'collection' ? 'Collection' : 'Delivery'} {stop.seq}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {sortedStops.map((stop) => (
                  <TabsContent key={stop.id} value={stop.id} className="mt-4">
                    <DriverJobStopCard
                      job={job}
                      stop={stop}
                      progressLogs={progressLogs}
                      currentProfile={currentProfile}
                      currentOrgId={currentOrgId}
                      onUpdateProgress={handleUpdateProgress}
                      onPodUploadSuccess={handlePodUploadSuccess}
                      isUpdatingProgress={isUpdatingProgress}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverJobDetailView;