"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, UploadCloud, Image as ImageIcon, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { updateJobProgress } from '@/lib/api/jobs';
import { uploadDocument } from '@/lib/api/driverApp';
import { Job, Profile } from '@/types';

interface PodUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  stopId?: string;
  currentProfile: Profile;
  onUploadSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const PodUploadDialog: React.FC<PodUploadDialogProps> = ({
  open,
  onOpenChange,
  job,
  stopId,
  currentProfile,
  onUploadSuccess,
  isLoading,
  setIsLoading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setIsLoading(false);
    }
  }, [open, setIsLoading]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!currentProfile || !currentProfile.org_id || !currentProfile.role) {
      toast.error("User profile or organization ID not found. Cannot upload POD.");
      return;
    }
    if (!job.order_number) {
      toast.error("Job order number is missing. Cannot generate filename.");
      return;
    }

    setIsLoading(true);
    try {
      const fileExtension = selectedFile.name.split('.').pop();
      const storagePathPrefix = `${currentProfile.org_id}/${job.id}/`;

      const { data: existingFiles, error: listError } = await supabase.storage
        .from("pods")
        .list(storagePathPrefix, {
          search: `${job.order_number}_`,
        });

      if (listError) {
        throw listError;
      }

      const nextIndex = (existingFiles?.length || 0) + 1;
      const fileName = `${job.order_number}_${nextIndex}.${fileExtension}`;
      const fullStoragePath = `${storagePathPrefix}${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage.from("pods").upload(fullStoragePath, selectedFile, { upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage.from("pods").getPublicUrl(fullStoragePath);
      const publicUrl = urlData?.publicUrl;

      if (!publicUrl) {
        throw new Error("Failed to get public URL for uploaded file.");
      }

      await uploadDocument(job.id, currentProfile.org_id, currentProfile.id, 'pod', publicUrl, 'pod_uploaded', stopId);

      if (stopId) {
        await updateJobProgress({
          job_id: job.id,
          org_id: currentProfile.org_id,
          actor_id: currentProfile.id,
          actor_role: currentProfile.role,
          new_status: 'pod_received',
          timestamp: new Date().toISOString(),
          notes: `POD uploaded for ${stopId ? `stop ${stopId}` : 'job'} by driver.`,
          stop_id: stopId,
        });
      }

      toast.success("POD uploaded successfully!");
      onUploadSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error("Error uploading POD:", e);
      toast.error(`Failed to upload POD: ${e.message || String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      setSelectedFile(null);
      setIsLoading(false);
    }
    onOpenChange(openState);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent className="bg-white p-6 shadow-xl rounded-xl flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900">Upload Proof of Delivery</AlertDialogTitle>
          <AlertDialogDescription>
            Please select the POD document to upload.
            <p className="text-sm text-blue-600 font-medium mt-2">
              All PODs must clearly show full name printed, signature, date, and in/out times.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <Label htmlFor="pod-file-upload" className="block text-sm font-medium text-gray-700 mb-2">
              Select POD File
            </Label>
            <div
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="driver-pod-upload-area"
            >
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <span className="relative cursor-pointer rounded-md bg-white font-medium text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:text-blue-500">
                    Upload a file
                  </span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            </div>
            <input
              id="pod-file-upload"
              ref={fileInputRef}
              type="file"
              className="sr-only"
              onChange={handleFileChange}
              accept="image/png, image/jpeg, image/gif"
              disabled={isLoading}
            />
            {selectedFile && (
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                <div className="flex items-center">
                  <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedFile(null)}
                  disabled={isLoading}
                >
                  <XCircle className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => handleClose(false)} disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpload} disabled={isLoading || !selectedFile}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Upload POD
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PodUploadDialog;