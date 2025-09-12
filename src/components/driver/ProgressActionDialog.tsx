"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePad from '@/components/SignaturePad';
import { Job, Profile } from '@/utils/mockData';
import { supabase } from '@/lib/supabaseClient';
import { updateJobStatus } from '@/lib/api/jobs';

interface ProgressActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job;
  profile: Profile;
  action: 'arrive' | 'depart' | 'complete';
  stop: any;
  onSuccess: () => void;
}

const ProgressActionDialog: React.FC<ProgressActionDialogProps> = ({ open, onOpenChange, job, profile, action, stop, onSuccess }) => {
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [noPaperwork, setNoPaperwork] = useState(false);
  const [fullName, setFullName] = useState('');
  const signaturePadRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      setNotes('');
      setNoPaperwork(false);
      setFullName('');
      signaturePadRef.current?.clear();
    }
  }, [open]);

  const isCompletingLastStop = action === 'complete' && stop.type === 'delivery' && stop.is_last_delivery;

  const getTitle = () => {
    if (action === 'arrive') return `Arriving at ${stop.name}`;
    if (action === 'depart') return `Departing from ${stop.name}`;
    if (action === 'complete') return `Completing Stop: ${stop.name}`;
    return 'Update Progress';
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    let signatureUrl = null;

    if (isCompletingLastStop && noPaperwork) {
      if (signaturePadRef.current?.isEmpty()) {
        toast.error('Signature is required when no paperwork is provided.');
        setIsLoading(false);
        return;
      }
      if (!fullName.trim()) {
        toast.error('Full Name is required when no paperwork is provided.');
        setIsLoading(false);
        return;
      }

      const signatureDataUrl = signaturePadRef.current.toDataURL();
      const blob = await (await fetch(signatureDataUrl)).blob();
      const filePath = `job-signatures/${job.id}-${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from('public-job-documents') // Ensure this bucket exists and has public access for reading
        .upload(filePath, blob);

      if (uploadError) {
        toast.error(`Signature upload failed: ${uploadError.message}`);
        setIsLoading(false);
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage.from('public-job-documents').getPublicUrl(filePath);
      signatureUrl = publicUrl;
    }

    try {
      await updateJobStatus({
        jobId: job.id,
        stopId: stop.id,
        orgId: job.org_id,
        actorId: profile.id,
        actorRole: profile.role,
        action,
        notes,
        signatureUrl,
        signatureName: fullName,
      });

      toast.success('Job status updated successfully!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>Add any relevant notes for this action.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g., Waited 30 mins for loading..." />
          </div>

          {isCompletingLastStop && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="no-paperwork" checked={noPaperwork} onCheckedChange={(checked) => setNoPaperwork(Boolean(checked))} />
                <Label htmlFor="no-paperwork" className="font-medium">No paperwork provided by customer</Label>
              </div>
              {noPaperwork && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">Recipient's Full Name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter full name" />
                  </div>
                  <div>
                    <Label>Recipient's Signature</Label>
                    <div className="rounded-md border bg-white">
                      <SignaturePad ref={signaturePadRef} />
                    </div>
                    <Button variant="link" size="sm" className="px-0" onClick={() => signaturePadRef.current?.clear()}>Clear Signature</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProgressActionDialog;