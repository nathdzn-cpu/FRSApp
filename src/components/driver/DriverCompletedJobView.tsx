"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, UploadCloud, FileText, Image as ImageIcon, Clock, User } from 'lucide-react';
import { Job, JobProgressLog, Profile, Document } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import PodUploadDialog from './PodUploadDialog';
import { cn } from '@/lib/utils';

interface DriverCompletedJobViewProps {
  job: Job;
  progressLogs: JobProgressLog[];
  documents: Document[];
  currentProfile: Profile;
  currentOrgId: string;
  refetchJobData: () => void;
}

const DriverCompletedJobView: React.FC<DriverCompletedJobViewProps> = ({
  job,
  progressLogs,
  documents,
  currentProfile,
  currentOrgId,
  refetchJobData,
}) => {
  const [isPodUploadDialogOpen, setIsPodUploadDialogOpen] = useState(false);
  const [isUploadingAdditionalPod, setIsUploadingAdditionalPod] = useState(false);

  // Filter progress logs to only show the current driver's actions
  const driverProgressLogs = useMemo(() => {
    return progressLogs
      .filter(log => log.actor_id === currentProfile.id)
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()); // Newest first
  }, [progressLogs, currentProfile.id]);

  // Filter documents to only show PODs for this job
  const podDocuments = useMemo(() => {
    return documents
      .filter(doc => doc.type === 'pod' && doc.job_id === job.id)
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()); // Newest first
  }, [documents, job.id]);

  const handlePodUploadSuccess = () => {
    refetchJobData(); // Refetch after POD upload to update job status and document list
    setIsUploadingAdditionalPod(false);
  };

  return (
    <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
      <CardHeader className="p-0 pb-4 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <CardTitle className="text-2xl font-bold text-gray-900">Job: {job.order_number} - Complete!</CardTitle>
        <p className="text-gray-600">All stops have been processed and the job is marked as delivered.</p>
      </CardHeader>
      <CardContent className="p-0 pt-4 space-y-6">
        {/* Driver's Timeline */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Your Job Timeline</h3>
          {driverProgressLogs.length === 0 ? (
            <p className="text-gray-600">No progress events logged by you for this job.</p>
          ) : (
            <div className="relative pl-8">
              <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
              {driverProgressLogs.map((log, index) => (
                <div key={log.id} className="mb-6 relative">
                  <div className="absolute -left-3.5 top-0 flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white">
                    <Clock size={16} />
                  </div>
                  <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{getDisplayStatus(log.action_type)}</span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{format(parseISO(log.timestamp), 'MMM dd, yyyy')}</p>
                        <p className="text-sm font-bold text-gray-700">{format(parseISO(log.timestamp), 'HH:mm')}</p>
                      </div>
                    </div>
                    {log.notes && <p className="text-gray-800 text-sm">{log.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* POD Upload Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Proof of Delivery (PODs)</h3>
          <Button
            onClick={() => setIsPodUploadDialogOpen(true)}
            disabled={isUploadingAdditionalPod}
            className="w-full bg-blue-600 text-white hover:bg-blue-700 mb-4"
          >
            {isUploadingAdditionalPod ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
            Upload Additional POD
          </Button>

          {podDocuments.length === 0 ? (
            <p className="text-gray-600">No PODs uploaded for this job yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {podDocuments.map((doc) => (
                <Card key={doc.id} className="p-3 shadow-sm rounded-md border border-gray-200">
                  <div className="flex items-center mb-2">
                    <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-900 truncate">{doc.storage_path.split('/').pop()}</span>
                  </div>
                  <p className="text-xs text-gray-500">Uploaded: {format(parseISO(doc.created_at), 'MMM dd, HH:mm')}</p>
                  {/* In a real app, you'd have a link to view the image */}
                  <Button variant="link" size="sm" className="p-0 h-auto text-blue-600" onClick={() => window.open(doc.storage_path, '_blank')}>
                    View
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <PodUploadDialog
        open={isPodUploadDialogOpen}
        onOpenChange={setIsPodUploadDialogOpen}
        job={job}
        currentProfile={currentProfile}
        onUploadSuccess={handlePodUploadSuccess}
        isLoading={isUploadingAdditionalPod}
        setIsLoading={setIsUploadingAdditionalPod} // Pass setter for internal loading state
      />
    </Card>
  );
};

export default DriverCompletedJobView;