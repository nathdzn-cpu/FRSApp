import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getJobById, getJobStops, getJobEvents, getJobDocuments, getProfiles, requestPod, generateJobPdf, cloneJob, cancelJob, assignDriverToJob } from '@/lib/supabase';
import { Job, JobStop, JobEvent, Document, Profile } from '@/utils/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FileDown, Copy, XCircle, UserPlus, FileText } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const JobDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [job, setJob] = useState<Job | undefined>(undefined);
  const [stops, setStops] = useState<JobStop[]>([]);
  const [events, setEvents] = useState<JobEvent[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssignDriverDialogOpen, setIsAssignDriverDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | undefined>(undefined);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : 'auth_user_dave';
  const currentProfile = profiles.find(p => p.user_id === currentUserId);

  const fetchJobData = async () => {
    if (!id || !currentTenantId || !currentProfile) return;

    setLoading(true);
    setError(null);
    try {
      const fetchedProfiles = await getProfiles(currentTenantId);
      setProfiles(fetchedProfiles);

      const fetchedJob = await getJobById(currentTenantId, id, userRole, currentProfile.id);
      if (!fetchedJob) {
        setError("Job not found or you don't have permission to view it.");
        setLoading(false);
        return;
      }
      setJob(fetchedJob);

      const fetchedStops = await getJobStops(currentTenantId, id);
      setStops(fetchedStops);

      const fetchedEvents = await getJobEvents(currentTenantId, id);
      setEvents(fetchedEvents);

      const fetchedDocuments = await getJobDocuments(currentTenantId, id);
      setDocuments(fetchedDocuments);

    } catch (err) {
      console.error("Failed to fetch job data:", err);
      setError("Failed to load job details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobData();
  }, [id, userRole, currentProfile?.id]);

  const getProfileName = (profileId?: string) => {
    const profile = profiles.find(p => p.id === profileId);
    return profile ? profile.full_name : 'N/A';
  };

  const handleRequestPod = async () => {
    if (!job || !currentProfile) return;
    const promise = requestPod(job.id, currentTenantId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Requesting POD...',
      success: 'POD request sent to driver!',
      error: 'Failed to request POD.',
    });
    await promise;
    fetchJobData(); // Refresh events
  };

  const handleExportPdf = async () => {
    if (!job || !currentProfile) return;
    const promise = generateJobPdf(job.id, currentTenantId, currentProfile.id);
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
    const promise = cloneJob(job.id, currentTenantId, currentProfile.id);
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
    const promise = cancelJob(job.id, currentTenantId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Cancelling job...',
      success: 'Job cancelled successfully!',
      error: 'Failed to cancel job.',
    });
    await promise;
    fetchJobData(); // Refresh job status
  };

  const handleAssignDriver = async () => {
    if (!job || !currentProfile || !selectedDriverId) return;
    const promise = assignDriverToJob(job.id, currentTenantId, selectedDriverId, currentProfile.id);
    toast.promise(promise, {
      loading: 'Assigning driver...',
      success: 'Driver assigned successfully!',
      error: 'Failed to assign driver.',
    });
    await promise;
    setIsAssignDriverDialogOpen(false);
    fetchJobData(); // Refresh job details
  };

  if (loading) {
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
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-gray-700 dark:text-gray-300 text-lg mb-4">Job data could not be loaded.</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const isOfficeOrAdmin = userRole === 'office' || userRole === 'admin';
  const drivers = profiles.filter(p => p.role === 'driver');

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
                  <Button variant="outline" onClick={() => setIsAssignDriverDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" /> Assign Driver
                  </Button>
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
                <p className="font-medium">Scheduled Date:</p>
                <p>{format(new Date(job.scheduled_date), 'PPP')}</p>
              </div>
              <div>
                <p className="font-medium">Assigned Driver:</p>
                <p>{getProfileName(job.assigned_driver_id)}</p>
              </div>
              {isOfficeOrAdmin && (
                <div>
                  <p className="font-medium">Price:</p>
                  <p>${job.price?.toFixed(2) || 'N/A'}</p>
                </div>
              )}
              <div>
                <p className="font-medium">Created By:</p>
                <p>{getProfileName(job.created_by)}</p>
              </div>
              {job.notes && (
                <div className="col-span-full">
                  <p className="font-medium">Notes:</p>
                  <p>{job.notes}</p>
                </div>
              )}
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
                <JobTimeline events={events} profiles={profiles} />
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

      <AlertDialog open={isAssignDriverDialogOpen} onOpenChange={setIsAssignDriverDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Driver to Job {job.ref}</AlertDialogTitle>
            <AlertDialogDescription>
              Select a driver from the list to assign them to this job.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedDriverId} value={selectedDriverId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {drivers.map(driver => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.full_name} ({driver.truck_reg || 'N/A'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignDriver} disabled={!selectedDriverId}>
              Assign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default JobDetail;