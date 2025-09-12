"use client";

import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface SignatureCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureDataUrl: string, recipientName: string) => void;
}

const SignatureCaptureDialog: React.FC<SignatureCaptureDialogProps> = ({ open, onOpenChange, onSave }) => {
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const [recipientName, setRecipientName] = useState<string>('');
  const [isEmpty, setIsEmpty] = useState<boolean>(true);

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current?.isEmpty()) {
      toast.error("Please provide a signature.");
      return;
    }
    if (!recipientName.trim()) {
      toast.error("Please enter the recipient's name.");
      return;
    }
    const signatureDataUrl = sigCanvas.current?.toDataURL('image/png');
    if (signatureDataUrl) {
      onSave(signatureDataUrl, recipientName.trim());
      onOpenChange(false); // Close dialog after saving
      clearSignature(); // Clear canvas for next use
      setRecipientName(''); // Clear recipient name
    }
  };

  const handleClose = (openState: boolean) => {
    if (!openState) {
      clearSignature();
      setRecipientName('');
    }
    onOpenChange(openState);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] bg-[var(--saas-card-bg)] p-6 rounded-xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Capture Signature</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="relative border border-gray-300 rounded-md overflow-hidden">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{ width: 380, height: 200, className: 'sigCanvas' }}
              onEnd={() => setIsEmpty(sigCanvas.current?.isEmpty() || true)}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 text-gray-500 pointer-events-none">
                Draw signature here
              </div>
            )}
          </div>
          <Button variant="outline" onClick={clearSignature} className="w-full">Clear Signature</Button>
          <div className="grid gap-2">
            <Label htmlFor="recipientName">Recipient Name</Label>
            <Input
              id="recipientName"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="e.g., John Doe"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Signature</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SignatureCaptureDialog;