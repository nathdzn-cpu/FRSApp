"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Job, JobStop, JobProgressLog, Profile } from '@/utils/mockData';
import { getJobById, getJobStops, getJobProgressLogs, updateJobStatus } from '@/lib/api/jobs';
import { getProfiles } from '@/lib/api/profiles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, MapPin, Package, CheckCircle, Truck, ArrowRight, Signature } from 'lucide-react';
import { format } from 'date-fns';
import { getNextActionForDriver, getJobStatusColor } from '@/lib/utils/statusUtils';
import ProgressActionDialog from '@/components/driver/ProgressActionDialog';
import SignatureCaptureDialog from '@/components/SignatureCaptureDialog'; // Import the new component
import { uploadFile } from '@/lib/utils/uploadFile'; // Import the upload utility
import { toast } from 'sonner';

const DriverJobDetailView: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [currentStopForAction, setCurrentStopForAction] = useState<JobStop | null>(null);
  const [actionType, setActionType] = useState<'arrive' | 'depart' | 'complete' | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
        if (error) {
          console.error('Error fetching profile:', error);
          toast.error('Failed to load user profile.');
        } else {
          setUserProfile(data);
        }
      }
    };
    fetchProfile();
  }, []);

  const { data: job, isLoading: isLoadingJob, error: jobError } = useQuery<Job, Error>({
    queryKey: ['job', jobId],
    queryFn: () => getJobById(jobId!),
    enabled: !!jobId,
  });

  const { data: stops, isLoading: isLoadingStops, error: stopsError } = useQuery<JobStop[], Error>({
    queryKey: ['jobStops', jobId],
    queryFn: () => getJobStops(jobId!),
    enabled: !!jobId,
  });

  const { data: progressLogs, isLoading: isLoadingLogs, error: logsError } = useQuery<JobProgressLog[], Error>({
    queryKey: ['jobProgressLogs', jobId],
    queryFn: () => getJobProgressLogs(jobId!),
    enabled: !!jobId,
  });

  const { data: profiles, isLoading: isLoadingProfiles, error: profilesError } = useQuery<Profile[], Error>({
    queryKey: ['profiles'],
    queryFn: getProfiles,
  });

  const isLoading = isLoadingJob || isLoadingStops || isLoadingLogs || isLoadingProfiles || !userProfile;
  const error = jobError || stopsError || logsError || profilesError;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading job details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        Error: {error.message}
      </div>
    );
  }

  if (!job || !stops || !progressLogs || !userProfile) {
    return <div className="text-center p-4">Job not found or profile not loaded.</div>;
  }

  const nextAction = getNextActionForDriver(job, stops, progressLogs);

  const handleActionClick = (stop: JobStop, action: 'arrive' | 'depart' | 'complete') => {
    setCurrentStopForAction(stop);
    setActionType(action);
    if (action === 'complete' && stop.type === 'delivery') {
      setIsSignatureDialogOpen(true); // Open signature dialog for delivery completion
    } else {
      setIsProgressDialogOpen(true); // Open general progress dialog
    }
  };

  const handleUpdateJobStatus = async (notes?: string, signatureDataUrl?: string, recipientName?: string) => {
    if (!currentStopForAction || !actionType || !userProfile) return;

    let signatureUrl: string | null = null;
    let signatureName: string | null = null;

    if (signatureDataUrl && recipientName) {
      try {
        const blob = await (await fetch(signatureDataUrl)).blob();
        const filePath = `${userProfile.org_id}/${job.id}/signatures/${currentStopForAction.id}-${Date.now()}.png`;
        signatureUrl = await uploadFile('documents', filePath, blob, { contentType: 'image/png' });
        signatureName = recipientName;
        toast.success('Signature uploaded successfully!');
      } catch (uploadError: any) {
        console.error('Error uploading signature:', uploadError);
        toast.error(`Failed to upload signature: ${uploadError.message}`);
        return; // Stop if signature upload fails
      }
    }

    try {
      await updateJobStatus({
        jobId: job.id,
        stopId: currentStopForAction.id,
        orgId: userProfile.org_id!,
        actorId: userProfile.id,
        actorRole: userProfile.role,
        action: actionType,
        notes,
        signatureUrl,
        signatureName,
      });
      toast.success(`Job status updated to ${actionType}!`);
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobStops', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobProgressLogs', jobId] });
      setIsProgressDialogOpen(false);
      setIsSignatureDialogOpen(false);
      setCurrentStopForAction(null);
      setActionType(null);
    } catch (err: any) {
      console.error('Error updating job status:', err);
      toast.error(`Failed to update job status: ${err.message}`);
    }
  };

  const handleSignatureSave = (signatureDataUrl: string, recipientName: string) => {
    handleUpdateJobStatus(undefined, signatureDataUrl, recipientName);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto">
      <Button variant="outline" onClick={() => navigate('/driver/jobs')} className="mb-4">
        &larr; Back to Jobs
      </Button>

      <Card className="mb-6 bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-2xl font-bold text-gray-900">Job: {job.order_number}</CardTitle>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getJobStatusColor(job.status)}`}>
            {job.status}
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-2">Created: {format(new Date(job.created_at), 'dd MMM yyyy HH:mm')}</p>
          {job.notes && <p className="text-gray-700 mb-2">Notes: {job.notes}</p>}
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-lg text-gray-800 flex items-center mb-2">
                <MapPin className="h-5 w-5 mr-2 text-blue-500" />Collection
              </h3>
              <p>{job.collection_name}</p>
              <p>{job.collection_city}, {job.collection_postcode}</p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-800 flex items-center mb-2">
                <Truck className="h-5 w-5 mr-2 text-green-500" />Delivery
              </h3>
              <p>{job.delivery_name}</p>
              <p>{job.delivery_city}, {job.delivery_postcode}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4 text-gray-900">Job Stops</h2>
      <div className="space-y-4">
        {stops.map((stop, index) => {
          const isCompleted = progressLogs.some(log => log.stop_id === stop.id && log.action_type === 'pod_received');
          const hasArrived = progressLogs.some(log => log.stop_id === stop.id && log.action_type === 'arrived_at_stop');
          const hasDeparted = progressLogs.some(log => log.stop_id === stop.id && log.action_type === 'departed_from_stop');

          return (
            <Card key={stop.id} className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-gray-800 flex items-center">
                    {stop.type === 'collection' ? <Package className="h-5 w-5 mr-2 text-purple-500" /> : <Truck className="h-5 w-5 mr-2 text-green-500" />}
                    {index + 1}. {stop.name} ({stop.type})
                  </h3>
                  {isCompleted && <CheckCircle className="h-6 w-6 text-green-500" />}
                </div>
                <p>{stop.address_line1}, {stop.city}, {stop.postcode}</p>
                {stop.window_from && stop.window_to && (
                  <p className="text-sm text-gray-500">Window: {stop.window_from} - {stop.window_to}</p>
                )}
                {stop.notes && <p className="text-sm text-gray-600">Notes: {stop.notes}</p>}

                <div className="mt-4 flex flex-wrap gap-2">
                  {!hasArrived && (
                    <Button onClick={() => handleActionClick(stop, 'arrive')} className="bg-blue-500 hover:bg-blue-600 text-white">
                      Arrive
                    </Button>
                  )}
                  {hasArrived && !hasDeparted && (
                    <Button onClick={() => handleActionClick(stop, 'depart')} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                      Depart
                    </Button>
                  )}
                  {hasDeparted && !isCompleted && stop.type === 'collection' && (
                    <Button onClick={() => handleActionClick(stop, 'complete')} className="bg-purple-500 hover:bg-purple-600 text-white">
                      Complete Collection
                    </Button>
                  )}
                  {hasDeparted && !isCompleted && stop.type === 'delivery' && (
                    <Button onClick={() => handleActionClick(stop, 'complete')} className="bg-green-500 hover:bg-green-600 text-white flex items-center">
                      <Signature className="h-4 w-4 mr-2" /> Capture POD
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {nextAction && (
        <Card className="mt-6 bg-[var(--saas-card-bg)] shadow-sm rounded-xl border-l-4 border-blue-500">
          <CardContent className="p-4 flex items-center justify-between">
            <p className="text-lg font-semibold text-gray-800">Next Action: {nextAction.description}</p>
            {nextAction.stop && (
              <Button onClick={() => handleActionClick(nextAction.stop!, nextAction.action!)} className="flex items-center">
                {nextAction.action === 'arrive' && 'Arrive'}
                {nextAction.action === 'depart' && 'Depart'}
                {nextAction.action === 'complete' && nextAction.stop.type === 'collection' && 'Complete Collection'}
                {nextAction.action === 'complete' && nextAction.stop.type === 'delivery' && <><Signature className="h-4 w-4 mr-2" /> Capture POD</>}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ProgressActionDialog
        open={isProgressDialogOpen}
        onOpenChange={setIsProgressDialogOpen}
        onConfirm={handleUpdateJobStatus}
        actionType={actionType}
        stop={currentStopForAction}
      />

      <SignatureCaptureDialog
        open={isSignatureDialogOpen}
        onOpenChange={setIsSignatureDialogOpen}
        onSave={handleSignatureSave}
      />
    </div>
  );
};

export default DriverJobDetailView;