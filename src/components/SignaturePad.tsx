"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SignaturePadProps {
  onSave: (signature: string) => void;
  initialSignature?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, initialSignature }) => {
  const [signatureText, setSignatureText] = useState(initialSignature || '');

  const handleClear = () => {
    setSignatureText('');
    onSave('');
  };

  const handleSave = () => {
    onSave(signatureText);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="signature-input" className="text-gray-700">Signature (Type your name or paste base64)</Label>
      <Textarea
        id="signature-input"
        value={signatureText}
        onChange={(e) => setSignatureText(e.target.value)}
        placeholder="Type your full name or paste a base64 signature string here..."
        className="min-h-[100px]"
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={handleClear}>Clear</Button>
        <Button type="button" onClick={handleSave} className="bg-blue-600 text-white hover:bg-blue-700">Save Signature</Button>
      </div>
    </div>
  );
};

export default SignaturePad;