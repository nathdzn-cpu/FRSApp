"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, MapPin, CheckCircle, Camera } from 'lucide-react'; // Import Camera icon
import { Job, JobStop, Profile, JobProgressLog, Document } from '@/utils/mockData';
import { updateJobProgress } from '@/lib/api/jobs';
import { toast } from 'sonner';
import ProgressActionDialog from './ProgressActionDialog';
import PodUploadDialog from './PodUploadDialog';
import ImageUploadDialog from './ImageUploadDialog'; // Import new ImageUploadDialog
import { computeNextDriverAction, NextDriverAction } from '@/utils/driverNextAction'; // Import the new utility
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import DriverCompletedJobView from './DriverCompletedJobView'; // Import the new component

interface DriverJobDetailViewProps {
  job: Job;
  stops: JobStop[];
  progressLogs: JobProgressLog[];
  documents: Document[]; // Pass documents to driver view
  currentProfile: Profile;
  currentOrgId: string;
  userRole: 'driver';
  refetchJobData: () => void;
}

const DriverJobDetailView: React.FC<DriverJobDetailViewProps> = ({
  job,
  stops,
  progressLogs,
  documents, // Receive documents
  currentProfile,
  currentOrgId,
  userRole,
  refetchJobData,
}) => {
  const navigate = useNavigate();
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  const [nextAction, setNextAction] = useState<NextDriverAction | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isPodUploadDialogOpen, setIsPodUploadDialogOpen] = useState(false);
  const [isImageUploadDialogOpen, setIsImageUploadDialogOpen] = useState(false); // New state for image upload dialog
  const [isUploadingImage, setIsUploadingImage] = useState(false); // New state for image upload loading

  useEffect(() => {
    if (job && stops && progressLogs && currentProfile) {
      const action = computeNextDriverAction(job, stops, progressLogs, currentProfile.id);
      setNextAction(action);
    }
  }, [job, stops, progressLogs, currentProfile]);

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
      toast.success(`${nextAction?.label || 'Action'} logged successfully!`);
    } catch (err: any) {
      console.error("Error updating job progress:", err);
      toast.error(`Failed to log ${nextAction?.label || 'action'}: ${err.message || String(err)}`);
      throw err; // Re-throw to allow dialog to handle its own error state
    } finally {
      setIsUpdatingProgress(false);
    }
  };

  const handlePodUploadSuccess = () => {
    refetchJobData(); // Refetch after POD upload to update job status
    toast.success("POD uploaded successfully!");
  };

  const handleImageUploadSuccess = () => {
    refetchJobData(); // Refetch after image upload to update document list
    toast.success("Image uploaded successfully!");
  };

  const handleNextActionButtonClick = () => {
    if (!nextAction) return;

    if (nextAction.nextStatus === 'pod_received') {
      setIsPodUploadDialogOpen(true);
    } else {
      setIsProgressDialogOpen(true);
    }
  };

  const renderStopDetails = (stop: JobStop) => (
    <div key={stop.id} className={`p-4 shadow-sm rounded-md ${stop.type === 'collection' ? 'border-l-4 border-blue-500' : 'border-l-4 border-green-500'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 ${stop.type === 'collection' ? 'text-blue-600' : 'text-green-600'}`} />
          <h4 className="font-semibold text-lg text-gray-900">{formatAddressPart(stop.name)} ({stop.seq})</h4>
        </div>
      </div>
      <p className="text-gray-700">{formatAddressPart(stop.address_line1)}</p>
      {stop.address_line2 && <p className="text-gray-700">{formatAddressPart(stop.address_line2)}</p>}
      <p className="text-gray-700">{formatAddressPart(stop.city)}, {formatPostcode(stop.postcode)}</p>
      {(stop.window_from || stop.window_to) && (
        <p className="text-sm text-gray-600 mt-1">Window: {stop.window_from || 'Anytime'} - {stop.window_to || 'Anytime'}</p>
      )}
      {stop.notes && (
        <p className="text-sm text-gray-600 mt-1">Notes: {stop.notes}</p>
      )}
    </div>
  );

  const currentStopForAction = nextAction ? stops.find(s => s.id === nextAction.stopId) : undefined;

  // Check if the job is completed (delivered or POD received)
  const isJobCompleted = job.status === 'delivered' || job.status === 'pod_received';

  return (
    <div className="min-h-screen bg-[var(--saas-background)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        {isJobCompleted ? (
          <DriverCompletedJobView
            job={job}
            progressLogs={progressLogs}
            documents={documents}
            currentProfile={currentProfile}
            currentOrgId={currentOrgId}
            refetchJobData={refetchJobData}
          />
        ) : (
          <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-2xl font-bold text-gray-900">Job: {job.order_number}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-4 space-y-4">
              <div>
                <p className="font-medium text-gray-900">Notes:</p>
                <p className="text-gray-700">{job.notes || '-'}</p>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Job Progress</h3>

              {nextAction ? (
                <>
                  {nextAction.stopId && (
                    <p className="text-sm text-gray-600 mb-2">
                      Next action for: <span className="font-medium text-gray-800">{nextAction.stopContext}</span>
                    </p>
                  )}
                  {currentStopForAction && renderStopDetails(currentStopForAction)}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4">
                    <Button
                      onClick={handleNextActionButtonClick}
                      disabled={isUpdatingProgress || isUploadingImage}
                      className="flex-1 bg-blue-600 text-white hover:bg-blue-700 text-lg py-3 h-auto"
                      data-testid="driver-next-action-btn"
                    >
                      {isUpdatingProgress ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                      {nextAction.label}
                    </Button>
                    {nextAction.nextStatus !== 'pod_received' && ( // Only show Upload Image if not the POD step
                      <Button
                        onClick={() => setIsImageUploadDialogOpen(true)}
                        disabled={isUpdatingProgress || isUploadingImage}
                        variant="outline"
                        className="flex-1 text-gray-700 hover:bg-gray-100 text-lg py-3 h-auto"
                      >
                        {isUploadingImage ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Camera className="h-5 w-5 mr-2" />}
                        Upload Image
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-gray-800">Job Complete!</p>
                  <p className="text-gray-600">All stops have been processed.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {nextAction && nextAction.nextStatus !== 'pod_received' && (
        <ProgressActionDialog
          open={isProgressDialogOpen}
          onOpenChange={setIsProgressDialogOpen}
          title={`Log ${nextAction.promptLabel}`}
          description={`Enter the date and time for the "${nextAction.promptLabel}" action.`}
          actionLabel={`Log ${nextAction.label}`}
          onSubmit={(dateTime, notes) => handleUpdateProgress(nextAction.nextStatus, dateTime, notes, nextAction.stopId)}
          isLoading={isUpdatingProgress}
        />
      )}

      {nextAction && nextAction.nextStatus === 'pod_received' && (
        <PodUploadDialog
          open={isPodUploadDialogOpen}
          onOpenChange={setIsPodUploadDialogOpen}
          job={job}
          stopId={nextAction.stopId}
          currentProfile={currentProfile}
          onUploadSuccess={handlePodUploadSuccess}
          isLoading={isUpdatingProgress}
          setIsLoading={setIsUpdatingProgress} // Pass setter for internal loading state
        />
      )}

      <ImageUploadDialog
        open={isImageUploadDialogOpen}
        onOpenChange={setIsImageUploadDialogOpen}
        job={job}
        stopId={currentStopForAction?.id} // Pass the current stop ID if applicable
        currentProfile={currentProfile}
        onUploadSuccess={handleImageUploadSuccess}
        isLoading={isUploadingImage}
        setIsLoading={setIsUploadingImage}
      />
    </div>
  );
};

export default DriverJobDetailView;