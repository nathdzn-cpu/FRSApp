"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, UploadCloud, FileText, Image as ImageIcon, Clock, User, Loader2, Edit } from 'lucide-react';
import { Job, JobProgressLog, Profile, Document } from '@/utils/mockData';
import { format, parseISO } from 'date-fns';
import { getDisplayStatus } from '@/lib/utils/statusUtils';
import PodUploadDialog from './PodUploadDialog';
import { cn } from '@/lib/utils';
import JobPodsGrid from '../JobPodsGrid';

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
  const [podDialogInitialTab, setPodDialogInitialTab] = useState<'upload' | 'signature'>('upload');

  // Filter progress logs to only show the current driver's actions
  const driverProgressLogs = useMemo(() => {
    return progressLogs
      .filter(log => log.actor_id === currentProfile.id)
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime()); // Newest first
  }, [progressLogs, currentProfile.id]);

  // Filter documents to show all job-related documents (PODs and other images)
  const jobDocuments = useMemo(() => {
    return documents
      .filter(doc => doc.job_id === job.id)
      .sort((a, b) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime()); // Newest first
  }, [documents, job.id]);

  const handlePodUploadSuccess = () => {
    refetchJobData(); // Refetch after POD upload to update job status and document list
    setIsUploadingAdditionalPod(false);
  };

  const openPodDialog = (tab: 'upload' | 'signature') => {
    setPodDialogInitialTab(tab);
    setIsPodUploadDialogOpen(true);
  };

  return (
    <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
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
                  <div className="ml-4 p-3 bg-gray-50 rounded-lg shadow-sm"> {/* Removed border */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{getDisplayStatus(log.action_type)}</span>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{format(parseISO(log.timestamp), 'MMM dd, yyyy')}</p>
                        <p className="text-sm font-bold text-gray-700">{format(parseISO(log.timestamp), 'HH:mm')}</p>
                      </div>
                    </div>
                    {log.notes && <p className="text-gray-800 text-sm">{log.notes}</p>}
                    {log.file_path && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        File: <a href={log.file_path} target="_blank" rel="noopener noreferrer" className="underline ml-1">{log.file_path.split('/').pop()}</a>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Uploaded Files Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Proof of Delivery</h3>
          </div>

          <JobPodsGrid documents={jobDocuments} job={job} />

          <div className="mt-6 border-t pt-6 space-y-4">
             <p className="text-center text-gray-600">Need to add more documentation?</p>
            <Button
              onClick={() => openPodDialog('upload')}
              disabled={isUploadingAdditionalPod}
              variant="outline"
              className="w-full"
            >
              {isUploadingAdditionalPod ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
              Upload Paperwork
            </Button>
             <Button
              onClick={() => openPodDialog('signature')}
              disabled={isUploadingAdditionalPod}
              variant="secondary"
              className="w-full"
            >
              {isUploadingAdditionalPod ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
              Capture Signature
            </Button>
          </div>
        </div>
      </CardContent>

      <PodUploadDialog
        open={isPodUploadDialogOpen}
        onOpenChange={setIsPodUploadDialogOpen}
        job={job}
        currentProfile={currentProfile}
        onUploadSuccess={handlePodUploadSuccess}
        isLoading={isUploadingAdditionalPod}
        setIsLoading={setIsUploadingAdditionalPod}
        initialTab={podDialogInitialTab}
      />
    </Card>
  );
};

export default DriverCompletedJobView;