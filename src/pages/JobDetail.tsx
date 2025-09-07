import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getJobById, getJobStops, getJobEvents, getJobDocuments, getProfiles, requestPod, generateJobPdf, cloneJob, cancelJob, updateJob, getJobProgressLogs, updateJobProgress } from '@/lib/supabase';
import { Job, JobStop, JobEvent, Document, Profile, JobProgressLog } from '@/utils/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FileDown, Copy, XCircle, FileText, Edit, Clock, CheckCircle, UserPlus } from 'lucide-react';
import JobTimeline from '@/components/JobTimeline';
import JobStopsTable from '@/components/JobStopsTable';
import JobPodsGrid from '@/components/JobPodsGrid';
import JobProgressTimeline from '@/components/JobProgressTimeline';
import { format, parseISO } from 'date-fns';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import JobEditForm from '@/components/JobEditForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DateTimePicker from '@/components/DateTimePicker';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import AssignDriverDialog from '@/components/AssignDriverDialog';
import { getDisplayStatus } from '@/lib/utils/statusUtils'; // Import the new utility

interface JobFormValues {
  order_number?: string | null;
  date_created: Date;
  price: number | null;
  assigned_driver_id: string | null;
  notes: string | null;
  status: 'planned' | 'assigned' | 'accepted' | 'delivered' | 'cancelled' | 'on_route_collection' | 'at_collection' | 'loaded' | 'on_route_delivery' | 'at_delivery' | 'pod_received';
  collections: Array<{
    id?: string;
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
    type: 'collection';
  }>;
  deliveries: Array<{
    id?: string;
    name: string;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    postcode: string;
    window_from?: string | null;
    window_to?: string | null;
    notes?: string | null;
    type: 'delivery';
  }>;
}

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [isProgressUpdateDialogOpen, setIsProgressUpdateDialogOpen] = useState(false);
  const [selectedProgressStatus, setSelectedProgressStatus] = useState<Job['status'] | ''>('');
  const [progressUpdateDateTime, setProgressUpdateDateTime] = useState<Date | undefined>(new Date());
  const [progressUpdateNotes, setProgressUpdateNotes] = useState<string>('');
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  // Define all possible job statuses for the dropdown (using snake_case for values)
  const jobStatuses: Array<Job['status']> = [
    'planned',
    'assigned',
    'accepted',
    'on_route_collection',
    'at_collection',
    'loaded',
    'on_route_delivery',
    'at_delivery',
    'delivered',
    'pod_received',
    'cancelled',
  ];

  // Filter statuses for the progress update dropdown (exclude 'planned', 'assigned', 'cancelled' as direct updates)
  const progressUpdateStatuses = jobStatuses.filter(status =>
    !['planned', 'assigned', 'cancelled'].includes(status)
  );

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
    progressLogs: JobProgressLog[];
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
      const fetchedProgressLogs = await getJobProgressLogs(currentOrgId, id);

      console.log("DEBUG: JobDetail - fetchedJob:", fetchedJob);
      console.log("DEBUG: JobDetail - fetchedStops:", fetchedStops);
      console.log("DEBUG: JobDetail - fetchedEvents:", fetchedEvents);
      console.log("DEBUG: JobDetail - fetchedDocuments:", fetchedDocuments);
      console.log("DEBUG: JobDetail - fetchedProgressLogs:", fetchedProgressLogs);

      return {
        job: fetchedJob,
        stops: fetchedStops,
        events: fetchedEvents,
        documents: fetchedDocuments,
        progressLogs: fetchedProgressLogs,
      };
    },
    enabled: !!id && !!currentOrgId && !!currentProfile && !!userRole && !isLoadingAuth,
    retry: false,
  });

  const job = jobData?.job;
  const stops = jobData?.stops || [];
  const events = jobData?.events || [];
  const documents = jobData?.documents || [];
  const progressLogs = jobData?.progressLogs || [];

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
          return `Job ${clonedJob.order_number} cloned successfully!`;
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

  const handleEditSubmit = async (values: JobFormValues) => {
    if (!job || !currentProfile) {
      toast.error("Job or user profile not found. Cannot update job.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const originalStopsMap = new Map(stops.map(s => [s.id, s]));

      const allNewStops = [...values.collections, ...values.deliveries];

      const stops_to_add = allNewStops.filter(s => !s.id);
      const stops_to_update = allNewStops.filter(s => s.id && originalStopsMap.has(s.id));
      const stops_to_delete = stops.filter(s => !allNewStops.some(ns => ns.id === s.id)).map(s => s.id);

      const jobUpdates: Partial<Job> = {
        order_number: values.order_number || null,
        date_created: values.date_created.toISOString().split('T')[0],
        price: values.price,
        assigned_driver_id: values.assigned_driver_id === 'null' ? null : values.assigned_driver_id,
        notes: values.notes,
        status: values.status,
      };

      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        job_updates: jobUpdates,
        stops_to_add: stops_to_add.map((s, index) => ({ ...s, seq: index + 1 })),
        stops_to_update: stops_to_update.map((s, index) => ({ ...s, seq: index + 1 })),
        stops_to_delete: stops_to_delete,
      };

      const promise = updateJob(payload);
      toast.promise(promise, {
        loading: 'Updating job...',
        success: 'Job updated successfully!',
        error: (err) => `Failed to update job: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
      setIsEditDialogOpen(false);
    } catch (err: any) {
      console.error("Error updating job:", err);
      toast.error("An unexpected error occurred while updating the job.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleAssignDriver = async (driverId: string | null) => {
    if (!job || !currentProfile) {
      toast.error("Job or user profile not found. Cannot assign driver.");
      return;
    }
    setIsAssigningDriver(true);
    try {
      const jobUpdates: Partial<Job> = {
        assigned_driver_id: driverId,
      };

      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        job_updates: jobUpdates,
      };

      const promise = updateJob(payload);
      toast.promise(promise, {
        loading: driverId ? 'Assigning driver...' : 'Unassigning driver...',
        success: driverId ? 'Driver assigned successfully!' : 'Driver unassigned successfully!',
        error: (err) => `Failed to assign driver: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
    } catch (err: any) {
      console.error("Error assigning driver:", err);
      toast.error("An unexpected error occurred while assigning the driver.");
    } finally {
      setIsAssigningDriver(false);
    }
  };

  const handleProgressUpdate = async () => {
    if (!job || !currentProfile || !selectedProgressStatus || !progressUpdateDateTime) {
      toast.error("Please select a status, date, and time for the progress update.");
      return;
    }

    setIsUpdatingProgress(true);
    try {
      const payload = {
        job_id: job.id,
        org_id: currentOrgId,
        actor_id: currentProfile.id,
        new_status: selectedProgressStatus,
        timestamp: progressUpdateDateTime.toISOString(),
        notes: progressUpdateNotes.trim() || undefined,
      };

      const promise = updateJobProgress(payload);
      toast.promise(promise, {
        loading: `Updating job progress to ${getDisplayStatus(selectedProgressStatus)}...`,
        success: 'Job progress updated successfully!',
        error: (err) => `Failed to update job progress: ${err.message}`,
      });
      await promise;
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      refetchJobData();
      setIsProgressUpdateDialogOpen(false);
      setSelectedProgressStatus('');
      setProgressUpdateDateTime(new Date());
      setProgressUpdateNotes('');
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      toast.error("An unexpected error occurred while updating job progress.");
    } finally {
      setIsUpdatingProgress(false);
    }
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
  const isAssignedDriver = userRole === 'driver' && job.assigned_driver_id === user?.id;
  const canEditJob = isOfficeOrAdmin || isAssignedDriver;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              Job: {job.order_number}
              <Badge
                variant={
                  job.status === 'planned'
                    ? 'secondary'
                    : job.status === 'accepted' || job.status === 'assigned'
                    ? 'default'
                    : job.status === 'delivered'
                    ? 'outline'
                    : 'destructive'
                }
                className={job.status === 'delivered' ? 'bg-green-500 text-white hover:bg-green-600' : ''}
              >
                {getDisplayStatus(job.status)}
              </Badge>
            </CardTitle>
            <div className="flex space-x-2">
              {isOfficeOrAdmin && (
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" /> Edit Job
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-6 rounded-xl shadow-lg">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold text-gray-900">Edit Job: {job.order_number}</DialogTitle>
                    </DialogHeader>
                    <JobEditForm
                      initialJob={job}
                      initialStops={stops}
                      drivers={allProfiles.filter(p => p.role === 'driver')}
                      onSubmit={handleEditSubmit}
                      isSubmitting={isSubmittingEdit}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {isOfficeOrAdmin && (
                <Button variant="outline" onClick={() => setIsAssignDriverDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" /> Assign Driver
                </Button>
              )}
              {isOfficeOrAdmin && job.status !== 'cancelled' && job.status !== 'delivered' && (
                <>
                  <AlertDialog open={isProgressUpdateDialogOpen} onOpenChange={setIsProgressUpdateDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <CheckCircle className="h-4 w-4 mr-2" /> Update Progress
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md bg-white p-6 rounded-xl shadow-lg">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-semibold text-gray-900">Update Job Progress</AlertDialogTitle>
                        <AlertDialogDescription>
                          Log a new status update for this job.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="progress-status">New Status</Label>
                          <Select
                            value={selectedProgressStatus}
                            onValueChange={(value: Job['status']) => setSelectedProgressStatus(value)}
                            disabled={isUpdatingProgress}
                          >
                            <SelectTrigger id="progress-status">
                              <SelectValue placeholder="Select new status" />
                            </SelectTrigger>
                            <SelectContent className="bg-white shadow-sm rounded-xl">
                              {progressUpdateStatuses.map(status => (
                                <SelectItem key={status} value={status}>
                                  {getDisplayStatus(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DateTimePicker
                          label="Date and Time"
                          value={progressUpdateDateTime}
                          onChange={setProgressUpdateDateTime}
                          disabled={isUpdatingProgress}
                        />
                        <div className="space-y-2">
                          <Label htmlFor="progress-notes">Notes (Optional)</Label>
                          <Textarea
                            id="progress-notes"
                            value={progressUpdateNotes}
                            onChange={(e) => setProgressUpdateNotes(e.target.value)}
                            placeholder="Add any relevant notes for this update..."
                            disabled={isUpdatingProgress}
                          />
                        </div>
                      </div>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsProgressUpdateDialogOpen(false)} disabled={isUpdatingProgress}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleProgressUpdate} disabled={isUpdatingProgress || !selectedProgressStatus || !progressUpdateDateTime}>
                          {isUpdatingProgress ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save Progress
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <FileText className="h-4 w-4 mr-2" /> Request POD
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request Proof of Delivery (POD)?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will send a notification to the assigned driver to upload a Proof of Delivery for this job.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">Dismiss</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleRequestPod}>Request POD</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button variant="outline" onClick={handleExportPdf}>
                    <FileDown className="h-4 w-4 mr-2" /> Export PDF
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline">
                        <Copy className="h-4 w-4 mr-2" /> Clone Job
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clone this Job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will create a new job with all the same details and stops as this one. You can then edit the new job.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">Dismiss</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloneJob}>Clone Job</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <XCircle className="h-4 w-4 mr-2" /> Cancel Job
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure you want to cancel this job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently mark the job as cancelled and it will no longer appear in active job lists.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline">Dismiss</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancelJob} variant="destructive">Cancel Job</AlertDialogAction>
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
                <p className="font-medium text-gray-900">Date Created:</p>
                <p>{format(new Date(job.date_created), 'PPP')}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Assigned Driver:</p>
                <p>{job.assigned_driver_id ? allProfiles.find(p => p.id === job.assigned_driver_id)?.full_name || 'Unknown' : 'Unassigned'}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900">Price:</p>
                <p>{job.price ? `£${job.price.toFixed(2)}` : '-'}</p>
              </div>
              <div className="lg:col-span-1">
                <p className="font-medium text-gray-900">Notes:</p>
                <p>{job.notes || '-'}</p>
              </div>
              <div className="lg:col-span-1">
                <p className="font-medium text-gray-900">Last Status Update:</p>
                <p className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  {job.last_status_update_at ? format(parseISO(job.last_status_update_at), 'PPP HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm rounded-xl p-1">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="stops">Stops</TabsTrigger>
            <TabsTrigger value="pods">PODs</TabsTrigger>
            <TabsTrigger value="progress-log">Progress Log</TabsTrigger>
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
          <TabsContent value="progress-log" className="mt-4">
            <Card className="bg-white shadow-sm rounded-xl p-6">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Job Progress Log</CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                <JobProgressTimeline progressLogs={progressLogs} profiles={allProfiles} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Driver Dialog */}
        <AssignDriverDialog
          open={isAssignDriverDialogOpen}
          onOpenChange={setIsAssignDriverDialogOpen}
          drivers={allProfiles.filter(p => p.role === 'driver')}
          currentAssignedDriverId={job.assigned_driver_id}
          onAssign={handleAssignDriver}
          isAssigning={isAssigningDriver}
        />
      </div>
    </div>
  );
};

export default JobDetail;