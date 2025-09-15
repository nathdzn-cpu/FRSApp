import React from 'react';
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
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

interface CredentialsDisplayDialogProps {
  open: boolean;
  onClose: () => void;
  email: string;
  password?: string;
}

const CredentialsDisplayDialog: React.FC<CredentialsDisplayDialogProps> = ({ open, onClose, email, password }) => {
  if (!password) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${field} copied to clipboard!`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User Created Successfully</DialogTitle>
          <DialogDescription>
            Please copy the credentials below and provide them to the new user. The password is their date of birth (ddMMyyyy).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email / Username</Label>
            <div className="flex items-center gap-2">
              <Input id="email" value={email} readOnly />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(email, 'Email')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <div className="flex items-center gap-2">
              <Input id="password" value={password} readOnly />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(password, 'Password')}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CredentialsDisplayDialog;