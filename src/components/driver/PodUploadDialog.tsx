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
import { Loader2, UploadCloud, Image as ImageIcon, XCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { processPod } from '@/lib/api/jobs';
import { Job, Profile } from '@/utils/mockData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SignaturePad, { SignaturePadRef } from '@/components/SignaturePad';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // Import Dialog components

// Helper to convert base64 to File
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  if (!mimeMatch) {
    throw new Error('Invalid data URL');
  }
  const mime = mimeMatch[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

interface PodUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  stopId?: string;
  currentProfile: Profile;
  onUploadSuccess: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  initialTab?: 'upload' | 'signature';
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
  initialTab = 'upload',
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const [signatureNameError, setSignatureNameError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false); // New state for cancel confirmation

  useEffect(() => {
    if (open) {
      setSelectedFile(null);
      setSignatureName('');
      setSignatureNameError(null);
      setIsLoading(false);
      setActiveTab(initialTab);
      setShowCancelConfirm(false); // Ensure confirmation dialog is closed when main dialog opens
    }
  }, [open, setIsLoading, initialTab]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (activeTab === 'upload') {
      await handleFileUpload();
    } else {
      await handleSignatureUpload();
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file to upload.");
      return;
    }
    if (!currentProfile?.org_id || !job.order_number) {
      toast.error("Profile or job data is missing.");
      return;
    }

    setIsLoading(true);
    try {
      const fileExtension = selectedFile.name.split('.').pop();
      const storagePathPrefix = `${currentProfile.org_id}/${job.id}/`;
      const { data: existingFiles } = await supabase.storage.from("pods").list(storagePathPrefix, { search: `${job.order_number}_` });
      const nextIndex = (existingFiles?.length || 0) + 1;
      const fileName = `${job.order_number}_pod_${nextIndex}.${fileExtension}`;
      const fullStoragePath = `${storagePathPrefix}${fileName}`;

      const { error: uploadError } = await supabase.storage.from("pods").upload(fullStoragePath, selectedFile, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("pods").getPublicUrl(fullStoragePath);
      if (!urlData?.publicUrl) throw new Error("Failed to get public URL.");

      await processPod({
        job_id: job.id,
        org_id: currentProfile.org_id,
        actor_id: currentProfile.id,
        actor_role: currentProfile.role,
        stop_id: stopId,
        pod_type: 'file',
        storage_path: urlData.publicUrl,
      });

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

  const handleSignatureUpload = async () => {
    setSignatureNameError(null);

    if (!signatureName.trim()) {
      setSignatureNameError("Recipient's full name is required.");
      return;
    }

    // Validate full name has at least two words
    const nameParts = signatureName.trim().split(/\s+/);
    if (nameParts.length < 2) {
      setSignatureNameError("Ensure you have received the receiver's FULL NAME (first and last name).");
      return;
    }

    if (signaturePadRef.current?.isEmpty()) {
      toast.error("Please provide a signature.");
      return;
    }
    if (!currentProfile?.org_id || !job.order_number) {
      toast.error("Profile or job data is missing.");
      return;
    }

    setIsLoading(true);
    try {
      const signatureDataUrl = signaturePadRef.current.getSignature();
      const signatureFile = dataURLtoFile(signatureDataUrl, 'signature.png');
      
      const storagePathPrefix = `${currentProfile.org_id}/${job.id}/`;
      const fileName = `${job.order_number}_signature_${Date.now()}.png`;
      const fullStoragePath = `${storagePathPrefix}${fileName}`;

      const { error: uploadError } = await supabase.storage.from("pods").upload(fullStoragePath, signatureFile, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("pods").getPublicUrl(fullStoragePath);
      if (!urlData?.publicUrl) throw new Error("Failed to get public URL.");

      await processPod({
        job_id: job.id,
        org_id: currentProfile.org_id,
        actor_id: currentProfile.id,
        actor_role: currentProfile.role,
        stop_id: stopId,
        pod_type: 'signature',
        storage_path: urlData.publicUrl,
        signature_name: signatureName.trim(),
      });

      toast.success("Signature captured successfully!");
      onUploadSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error("Error capturing signature:", e);
      toast.error(`Failed to capture signature: ${e.message || String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = () => {
    const isSignatureDirty = signatureName.trim() !== '' || (signaturePadRef.current && !signaturePadRef.current.isEmpty());
    if (activeTab === 'signature' && isSignatureDirty) {
      setShowCancelConfirm(true);
    } else {
      // If not dirty or not signature tab, just close the main dialog
      onOpenChange(false); // This will trigger the useEffect to reset states
    }
  };

  const confirmCancelAndClose = () => {
    setShowCancelConfirm(false); // Close confirmation dialog
    onOpenChange(false); // Close main dialog, which also resets states via useEffect
  };

  const isSubmitDisabled = () => {
    if (isLoading) return true;
    if (activeTab === 'upload') return !selectedFile;
    if (activeTab === 'signature') return !signatureName.trim() || !!signatureNameError;
    return true;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}> {/* onOpenChange now directly controls main dialog */}
      <AlertDialogContent className="bg-white p-6 shadow-xl rounded-xl flex flex-col max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-gray-900">Provide Proof of Delivery</AlertDialogTitle>
          <AlertDialogDescription>
            Choose to upload paperwork or capture a digital signature.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'signature')} className="w-full py-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload"><UploadCloud className="h-4 w-4 mr-2"/>Upload Paperwork</TabsTrigger>
            <TabsTrigger value="signature"><Edit className="h-4 w-4 mr-2"/>Capture Signature</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="pt-4">
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
                  <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
              </div>
              <input
                id="pod-file-upload"
                ref={fileInputRef}
                type="file"
                className="sr-only"
                onChange={handleFileChange}
                accept="image/png, image/jpeg, application/pdf"
                disabled={isLoading}
              />
              {selectedFile && (
                <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                  <div className="flex items-center">
                    <ImageIcon className="h-5 w-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-gray-800 truncate">{selectedFile.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} disabled={isLoading}>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="signature" className="pt-4">
            <SignaturePad ref={signaturePadRef} signatureName={signatureName} setSignatureName={setSignatureName} nameError={signatureNameError} />
          </TabsContent>
        </Tabs>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancelClick} disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpload} disabled={isSubmitDisabled()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {activeTab === 'upload' ? 'Upload POD' : 'Save Signature'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>

      {/* Confirmation Dialog for Cancel */}
      <Dialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Signature Capture?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel? Any entered name or signature will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelConfirm(false)}>Go Back</Button>
            <Button variant="destructive" onClick={confirmCancelAndClose}>Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AlertDialog>
  );
};

export default PodUploadDialog;