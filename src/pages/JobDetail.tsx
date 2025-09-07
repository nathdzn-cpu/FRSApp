import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobById, getJobStops, getJobEvents, getJobDocuments, getProfiles, requestPod, generateJobPdf, cloneJob, cancelJob } from '@/lib/supabase';
import { Job, JobStop, JobEvent, Document, Profile } from '@/utils/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FileDown, Copy, XCircle, FileText } from 'lucide-react';
import JobTimeline from '@/components/JobTimeline';
import JobStopsTable from '@/components/JobStopsTable';
import JobPodsGrid from '@/components/JobPodsGrid';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuery } from '@tanstack/react-query';

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  // Removed isAssignDriverDialogOpen and selectedDriverId as driver assignment is removed from Job interface

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;
  // Removed canSeePrice as price is no longer in Job interface

  // Fetch profiles separately as they are needed for multiple queries and UI elements
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user && !!currentProfile, // Only fetch if user and profile are loaded
  });

  // Use useQuery for job details, stops, events, and documents
  const { data: jobData, isLoading: isLoadingJob, error: jobError, refetch: refetchJobData } = useQuery<{
    job: Job | undefined;
    stops: JobStop[];
    events: JobEvent[];
    documents: Document[];
  }, Error>({
    queryKey: ['jobDetail', id, userRole], // Removed currentProfile?.id as driverId is removed
    queryFn: async () => {
      if (!id || !currentOrgId || !currentProfile || !userRole) {
        throw new Error("Missing job ID, organization ID, current profile, or user role.");
      }

      const fetchedJob = await getJobById(currentOrgId, id, userRole);
      if (!fetchedJob) {
        throw new Error("Job not found or you don't have permission to view it.");
      }

      const fetchedStops = await getJobStops(currentOrgId, id);
      const fetchedEvents = await getJobEvents(currentOrgId, id);
      const fetchedDocuments = await getJobDocuments(currentOrgId, id);

      return {
        job: fetchedJob,
        stops: fetchedStops,
        events: fetchedEvents,
        documents: fetchedDocuments,
      };
    },
    enabled: !!id && !!currentOrgId && !!currentProfile && !!userRole && !isLoadingAuth, // Only run query if these are available and not loading auth
    retry: false, // Do not retry on failure, show error immediately
  });

  const job = jobData?.job;
  const stops = jobData?.stops || [];
  const events = jobData?.events || [];
  const documents = jobData?.documents || [];

  const isLoading = isLoadingAuth || isLoadingAllProfiles || isLoadingJob;
  const error = allProfilesError || jobError;

  // Removed getProfileName as created_by and assigned_driver_id are removed from Job interface.
  // If needed, this would be for actor_id in events or uploaded_by in documents.

  const handleRequestPod = async () => {
    if (!job || !currentProfile) return;
    const promise = requestPod(job.id, currentOrgId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Requesting POD...',
      success: 'POD request sent to driver!',
      error: 'Failed to request POD.',
    });
    await promise;
    refetchJobData(); // Refresh events
  };

  const handleExportPdf = async () => {
    if (!job || !currentProfile) return;
    const promise = generateJobPdf(job.id, currentOrgId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Generating PDF...',
      success: (url) => {
        if (url) {
          window.open(url, '_blank');
          return 'PDF generated and opened in new tab!';
        }
        return 'PDF generated, but no URL returned.';
      },
      error: 'Failed to generate PDF.',
    });
  };

  const handleCloneJob = async () => {
    if (!job || !currentProfile) return;
    const promise = cloneJob(job.id, currentOrgId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Cloning job...',
      success: (clonedJob) => {
        if (clonedJob) {
          navigate(`/jobs/${clonedJob.id}`);
          return `Job ${clonedJob.ref} cloned successfully!`;
        }
        return 'Job cloned, but no new job returned.';
      },
      error: 'Failed to clone job.',
    });
  };

  const handleCancelJob = async () => {
    if (!job || !currentProfile) return;
    const promise = cancelJob(job.id, currentOrgId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Cancelling job...',
      success: 'Job cancelled successfully!',
      error: 'Failed to cancel job.',
    });
    await promise;
    refetchJobData(); // Refresh job status
  };

  // Removed handleAssignDriver as assigned_driver_id is no longer in Job interface

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">No job found.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';
  // Removed drivers variable as assigned_driver_id is no longer in Job interface

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              Job: {job.ref}
              <Badge
                variant={
                  job.status === 'delivered'
                    ? 'secondary'
                    : job.status === 'cancelled'
                    ? 'destructive'
                    : job.status === 'in_progress'
                    ? 'default'
                    : 'outline'
                }
                className="capitalize"
              >
                {job.status.replace(/_/g, ' ')}
              </Badge>
            </CardTitle>
            <div className="flex space-x-2">
              {isOfficeOrAdmin && job.status !== 'cancelled' && job.status !== 'delivered' && (
                <>
                  {/* Removed Assign Driver Button */}
                  <Button variant="outline" onClick={handleRequestPod}>
                    <FileText className="h-4 w-4 mr-2" /> Request POD
                  </Button>
                  <Button variant="outline" onClick={handleExportPdf}>
                    <FileDown className="h-4 w-4 mr-2" /> Export PDF
                  </Button>
                  <Button variant="outline" onClick={handleCloneJob}>
                    <Copy className="h-4 w-4 mr-2" /> Clone Job
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <XCircle className="h-4 w-4 mr-2" /> Cancel Job
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will mark the job as cancelled.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Dismiss</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelJob}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <p className="font-medium">Pickup ETA:</p>
                <p>{job.pickup_eta || '-'}</p>
              </div>
              <div>
                <p className="font-medium">Delivery ETA:</p>
                <p>{job.delivery_eta || '-'}</p>
              </div>
              <div>
                <p className="font-medium">Created At:</p>
                <p>{format(new Date(job.created_at), 'PPP')}</p>
              </div>
              {/* Removed Price, Assigned Driver, and Notes fields */}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
            <TabsTrigger value="pods">PODs</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <JobTimeline events={events} profiles={allProfiles} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="stops" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Job Stops</CardTitle>
              </CardHeader>
              <CardContent>
                <JobStopsTable stops={stops} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="pods" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Proof of Delivery (PODs)</CardTitle>
              </CardHeader>
              <CardContent>
                <JobPodsGrid documents={documents} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Removed Assign Driver Dialog */}
    </div>
  );
};

export default JobDetail;