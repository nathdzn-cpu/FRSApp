"use client";

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export interface SignaturePadRef {
  getSignature: () => string; // Returns base64
  getSignatureName: () => string;
  isEmpty: () => boolean;
  clear: () => void; // Added clear method
}

interface SignaturePadProps {
  signatureName: string;
  setSignatureName: (name: string) => void;
  nameError?: string | null; // New prop for validation error
}

const SignaturePad = React.forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ signatureName, setSignatureName, nameError }, ref) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    React.useImperativeHandle(ref, () => ({
      getSignature: () => {
        if (sigCanvas.current) {
          // Return image as a data URL
          return sigCanvas.current.toDataURL();
        }
        return '';
      },
      getSignatureName: () => signatureName,
      isEmpty: () => sigCanvas.current?.isEmpty() ?? true,
      clear: () => sigCanvas.current?.clear(), // Implemented clear method
    }));

    const handleClear = () => {
      sigCanvas.current?.clear();
    };

    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="signature-name" className="text-gray-700">Recipient's Full Name</Label>
          <Input
            id="signature-name"
            type="text"
            placeholder="Enter full name"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            className="mt-1"
          />
          {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>} {/* Display error */}
        </div>
        <div>
          <Label htmlFor="signature-canvas" className="text-gray-700">Signature</Label>
          <div id="signature-canvas" className="mt-1 border border-gray-300 rounded-md bg-white">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: 'w-full h-48 rounded-md',
              }}
            />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={handleClear} className="w-full">
          Clear Signature
        </Button>
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export default SignaturePad;