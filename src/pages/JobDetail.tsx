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

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  // Fetch profiles separately as they are needed for multiple queries and UI elements
  const { data: allProfiles = [], isLoading: isLoadingAllProfiles, error: allProfilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles', currentOrgId],
    queryFn: () => getProfiles(currentOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: !!user && !!currentProfile,
  });

  // Use useQuery for job details, stops, events, and documents
  const { data: jobData, isLoading: isLoadingJob, error: jobError, refetch: refetchJobData } = useQuery<{
    job: Job | undefined;
    stops: JobStop[];
    events: JobEvent[];
    documents: Document[];
  }, Error>({
    queryKey: ['jobDetail', id, userRole],
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
    enabled: !!id && !!currentOrgId && !!currentProfile && !!userRole && !isLoadingAuth,
    retry: false,
  });

  const job = jobData?.job;
  const stops = jobData?.stops || [];
  const events = jobData?.events || [];
  const documents = jobData?.documents || [];

  const isLoading = isLoadingAuth || isLoadingAllProfiles || isLoadingJob;
  const error = allProfilesError || jobError;

  const handleRequestPod = async () => {
    if (!job || !currentProfile) return;
    const promise = requestPod(job.id, currentOrgId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Requesting POD...',
      success: 'POD request sent to driver!',
      error: 'Failed to request POD.',
    });
    await promise;
    refetchJobData();
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
    refetchJobData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error.message}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-700 text-lg mb-4">No job found.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Job: {job.ref}
              <Badge
                variant={
                  job.status === 'planned'
                    ? 'secondary'
                    : job.status === 'in_progress' || job.status === 'assigned'
                    ? 'default'
                    : job.status === 'delivered'
                    ? 'outline'
                    : 'destructive'
                }
                className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
              >
                {job.status.replace(/_/g, ' ')}
              </Badge>
            </CardTitle>
            <div className="flex space-x-2">
              {isOfficeOrAdmin && job.status !== 'cancelled' && job.status !== 'delivered' && (
                <>
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
          <CardContent className="p-0 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-700">
              <div>
                <p className="font-medium text-gray-900">Pickup ETA:</p>
                <p>{job.pickup_eta || '-'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Delivery ETA:</p>
                <p>{job.delivery_eta || '-'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Created At:</p>
                <p>{format(new Date(job.created_at), 'PPP')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm rounded-xl p-1">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
            <TabsTrigger value="pods">PODs</TabsTrigger>
          </TabsList>
          <TabsContent value="timeline" className="mt-4">
            <Card className="bg-white shadow-sm rounded-xl p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Job Timeline</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <JobTimeline events={events} profiles={allProfiles} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="stops" className="mt-4">
            <Card className="bg-white shadow-sm rounded-xl p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Job Stops</CardTitle>
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
      </div>
    </div>
  );
};

export default JobDetail;