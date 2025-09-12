"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getJobDocuments } from '@/lib/api/jobs';
import { Job, Document } from '@/utils/mockData';
import JobPodsGrid from './JobPodsGrid';

interface JobAttachmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  currentOrgId: string;
}

const JobAttachmentsDialog: React.FC<JobAttachmentsDialogProps> = ({
  open,
  onOpenChange,
  job,
  currentOrgId,
}) => {
  const { data: documents = [], isLoading: isLoadingDocuments, error: documentsError } = useQuery<Document[], Error>({
    queryKey: ['jobDocuments', job?.id],
    queryFn: () => getJobDocuments(currentOrgId, job!.id),
    enabled: open && !!job?.id && !!currentOrgId, // Only fetch when dialog is open and job is available
    staleTime: 60 * 1000, // Cache documents for 1 minute
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-3xl h-[90vh] bg-[var(--saas-card-bg)] p-6 rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Attachments for Job: {job?.order_number}
          </DialogTitle>
          <DialogDescription>
            View all uploaded Proof of Deliveries and other images for this job.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoadingDocuments ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="ml-2 text-gray-700">Loading attachments...</p>
            </div>
          ) : documentsError ? (
            <div className="text-red-500 text-center py-4">
              Error loading attachments: {documentsError.message}
            </div>
          ) : documents.length === 0 && !job?.pod_signature_path ? ( // Check for signature path too
            <div className="text-gray-600 text-center py-4">
              No attachments found for this job.
            </div>
          ) : (
            <JobPodsGrid documents={documents} job={job!} /> {/* Pass job prop */}
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobAttachmentsDialog;