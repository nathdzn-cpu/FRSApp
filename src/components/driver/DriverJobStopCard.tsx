"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Truck, Package, CheckCircle, Loader2, Clock } from 'lucide-react';
import { Job, JobStop, Profile, JobProgressLog } from '@/utils/mockData';
import { formatAddressPart, formatPostcode } from '@/lib/utils/formatUtils';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import ProgressActionDialog from './ProgressActionDialog';
import PodUploadDialog from './PodUploadDialog';
import { toast } from 'sonner';

interface DriverJobStopCardProps {
  job: Job;
  stop: JobStop;
  progressLogs: JobProgressLog[];
  currentProfile: Profile;
  currentOrgId: string;
  onUpdateProgress: (newStatus: Job['status'], timestamp: Date, notes: string, stopId?: string) => Promise<void>;
  onPodUploadSuccess: () => void;
  isUpdatingProgress: boolean;
}

type StopProgressState = 'pending' | 'on_route_collection' | 'at_collection' | 'loaded' | 'on_route_delivery' | 'at_delivery' | 'pod_uploaded';

const DriverJobStopCard: React.FC<DriverJobStopCardProps> = ({
  job,
  stop,
  progressLogs,
  currentProfile,
  currentOrgId,
  onUpdateProgress,
  onPodUploadSuccess,
  isUpdatingProgress,
}) => {
  const [currentStopState, setCurrentStopState] = useState<StopProgressState>('pending');
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const [isPodUploadDialogOpen, setIsPodUploadDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<{ status: Job['status']; label: string } | null>(null);

  const relevantLogs = useMemo(() => {
    return progressLogs
      .filter(log => log.stop_id === stop.id)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [progressLogs, stop.id]);

  useEffect(() => {
    // Determine the current state of this specific stop based on its logs
    let latestState: StopProgressState = 'pending';
    if (stop.type === 'collection') {
      if (relevantLogs.some(log => log.action_type === 'loaded')) latestState = 'loaded';
      else if (relevantLogs.some(log => log.action_type === 'at_collection')) latestState = 'at_collection';
      else if (relevantLogs.some(log => log.action_type === 'on_route_collection')) latestState = 'on_route_collection';
    } else { // delivery
      if (relevantLogs.some(log => log.action_type === 'pod_received')) latestState = 'pod_uploaded';
      else if (relevantLogs.some(log => log.action_type === 'at_delivery')) latestState = 'at_delivery';
      else if (relevantLogs.some(log => log.action_type === 'on_route_delivery')) latestState = 'on_route_delivery';
    }
    setCurrentStopState(latestState);
  }, [relevantLogs, stop.type]);

  const handleProgressSubmit = async (dateTime: Date, notes: string) => {
    if (!dialogAction) return;
    try {
      await onUpdateProgress(dialogAction.status, dateTime, notes, stop.id);
      toast.success(`${dialogAction.label} logged successfully!`);
      setIsProgressDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating progress:", error);
      toast.error(`Failed to log ${dialogAction.label}: ${error.message || String(error)}`);
    }
  };

  const handlePodUploadSubmit = () => {
    // onPodUploadSuccess will trigger refetch and update job status
    onPodUploadSuccess();
  };

  const renderActionButton = () => {
    const isJobCancelled = job.status === 'cancelled';
    const isJobDelivered = job.status === 'delivered' || job.status === 'pod_received';

    if (isJobCancelled || isJobDelivered) {
      return (
        <Button variant="outline" disabled className="w-full text-gray-500">
          <CheckCircle className="h-4 w-4 mr-2" /> Job {getDisplayStatus(job.status)}
        </Button>
      );
    }

    if (stop.type === 'collection') {
      switch (currentStopState) {
        case 'pending':
          return (
            <Button
              onClick={() => { setDialogAction({ status: 'on_route_collection', label: 'On Route to Collection' }); setIsProgressDialogOpen(true); }}
              disabled={isUpdatingProgress}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Truck className="h-4 w-4 mr-2" /> On Route to Collection
            </Button>
          );
        case 'on_route_collection':
          return (
            <Button
              onClick={() => { setDialogAction({ status: 'at_collection', label: 'Arrived at Collection' }); setIsProgressDialogOpen(true); }}
              disabled={isUpdatingProgress}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4 mr-2" /> Arrived at Collection
            </Button>
          );
        case 'at_collection':
          return (
            <Button
              onClick={() => { setDialogAction({ status: 'loaded', label: 'Loaded' }); setIsProgressDialogOpen(true); }}
              disabled={isUpdatingProgress}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Package className="h-4 w-4 mr-2" /> Loaded
            </Button>
          );
        case 'loaded':
          return (
            <Button variant="outline" disabled className="w-full text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" /> Collection Complete
            </Button>
          );
      }
    } else { // delivery
      switch (currentStopState) {
        case 'pending': // This state should ideally be 'loaded' from previous collection stop
          return (
            <Button
              onClick={() => { setDialogAction({ status: 'on_route_delivery', label: 'On Route to Delivery' }); setIsProgressDialogOpen(true); }}
              disabled={isUpdatingProgress}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <Truck className="h-4 w-4 mr-2" /> On Route to Delivery
            </Button>
          );
        case 'on_route_delivery':
          return (
            <Button
              onClick={() => { setDialogAction({ status: 'at_delivery', label: 'Arrived at Delivery' }); setIsProgressDialogOpen(true); }}
              disabled={isUpdatingProgress}
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4 mr-2" /> Arrived at Delivery
            </Button>
          );
        case 'at_delivery':
          return (
            <Button
              onClick={() => setIsPodUploadDialogOpen(true)}
              disabled={isUpdatingProgress}
              className="w-full bg-green-600 text-white hover:bg-green-700"
            >
              <UploadCloud className="h-4 w-4 mr-2" /> Upload POD
            </Button>
          );
        case 'pod_uploaded':
          return (
            <Button variant="outline" disabled className="w-full text-green-600">
              <CheckCircle className="h-4 w-4 mr-2" /> Delivery Complete (POD Uploaded)
            </Button>
          );
      }
    }
    return null;
  };

  const getStatusBadge = () => {
    let statusText = 'Pending';
    let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary';

    if (stop.type === 'collection') {
      switch (currentStopState) {
        case 'on_route_collection': statusText = 'On Route'; variant = 'default'; break;
        case 'at_collection': statusText = 'At Site'; variant = 'default'; break;
        case 'loaded': statusText = 'Collected'; variant = 'outline'; break;
        case 'pending': statusText = 'Awaiting Collection'; break;
      }
    } else { // delivery
      switch (currentStopState) {
        case 'on_route_delivery': statusText = 'On Route'; variant = 'default'; break;
        case 'at_delivery': statusText = 'At Site'; variant = 'default'; break;
        case 'pod_uploaded': statusText = 'Delivered'; variant = 'outline'; break;
        case 'pending': statusText = 'Awaiting Delivery'; break;
      }
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        variant === 'default' ? 'bg-blue-100 text-blue-800' :
        variant === 'outline' ? 'bg-green-100 text-green-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {statusText}
      </span>
    );
  };

  return (
    <Card className={`p-4 shadow-sm rounded-md ${stop.type === 'collection' ? 'border-l-4 border-blue-500' : 'border-l-4 border-green-500'}`}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 ${stop.type === 'collection' ? 'text-blue-600' : 'text-green-600'}`} />
            <h4 className="font-semibold text-lg text-gray-900">{formatAddressPart(stop.name)} ({stop.seq})</h4>
          </div>
          {getStatusBadge()}
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
        <div className="mt-4">
          {renderActionButton()}
        </div>
      </CardContent>

      {dialogAction && (
        <ProgressActionDialog
          open={isProgressDialogOpen}
          onOpenChange={setIsProgressDialogOpen}
          title={`Log ${dialogAction.label}`}
          description={`Enter the date and time for the "${dialogAction.label}" action for stop ${stop.seq}.`}
          actionLabel={`Log ${dialogAction.label}`}
          onSubmit={handleProgressSubmit}
          isLoading={isUpdatingProgress}
        />
      )}

      <PodUploadDialog
        open={isPodUploadDialogOpen}
        onOpenChange={setIsPodUploadDialogOpen}
        job={job}
        stopId={stop.id}
        currentProfile={currentProfile}
        onUploadSuccess={handlePodUploadSubmit}
        isLoading={isUpdatingProgress}
      />
    </Card>
  );
};

export default DriverJobStopCard;