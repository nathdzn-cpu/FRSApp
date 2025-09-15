"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Job } from '@/utils/mockData';

interface CancelJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  onConfirm: (cancellationPrice: number) => Promise<void>;
  isCancelling: boolean;
}

const CancelJobDialog: React.FC<CancelJobDialogProps> = ({
  open,
  onOpenChange,
  job,
  onConfirm,
  isCancelling,
}) => {
  const [price, setPrice] = useState<string>('0');

  useEffect(() => {
    if (job) {
      setPrice(job.price?.toString() || '0');
    }
  }, [job]);

  if (!job) return null;

  const handleConfirm = () => {
    const priceValue = parseFloat(price);
    if (!isNaN(priceValue) && priceValue >= 0) {
      onConfirm(priceValue);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Cancel Job: {job.order_number}</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please confirm the payment amount for this cancelled job.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cancellation-price">How much are we getting paid for this cancelled job? (£)</Label>
            <Input
              id="cancellation-price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g., 50.00"
              className="text-base"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCancelling}>
            Back
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Confirm Cancellation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelJobDialog;