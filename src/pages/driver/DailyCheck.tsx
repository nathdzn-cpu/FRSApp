"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getDailyCheckItems, submitDailyCheckResponse, getProfiles } from '@/lib/supabase';
import { DailyCheckItem, Profile } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Camera, CheckCircle2, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import SignaturePad from '@/components/SignaturePad';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface CheckItemState {
  item_id: string;
  title: string;
  description?: string;
  ok: boolean;
  notes?: string;
  photo_base64?: string; // For temporary storage before upload
}

const DriverDailyCheck: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [activeItems, setActiveItems] = useState<DailyCheckItem[]>([]);
  const [checkStates, setCheckStates] = useState<CheckItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [truckReg, setTruckReg] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [signature, setSignature] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : userRole === 'driver' ? 'auth_user_dave' : 'unknown';
  const currentProfile = profiles.find(p => p.user_id === currentUserId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploadItemId, setPhotoUploadItemId] = useState<string | null>(null);

  useEffect(() => {
    if (userRole !== 'driver') {
      toast.error("You do not have permission to access this page. Only drivers can perform daily checks.");
      navigate('/');
      return;
    }

    const fetchItemsAndProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedProfiles = await getProfiles(currentTenantId);
        setProfiles(fetchedProfiles);
        const driverProfile = fetchedProfiles.find(p => p.user_id === currentUserId);

        if (driverProfile) {
          setTruckReg(driverProfile.truck_reg || '');
          setTrailerNo(driverProfile.trailer_no || '');
        }

        const fetchedItems = await getDailyCheckItems();
        const active = fetchedItems.filter(item => item.is_active);
        setActiveItems(active);
        setCheckStates(active.map(item => ({
          item_id: item.id,
          title: item.title,
          description: item.description,
          ok: true, // Default to pass
          notes: '',
          photo_base64: undefined,
        })));
        setStartTime(new Date()); // Start timer
      } catch (err: any) {
        console.error("Failed to fetch daily check items or profile:", err);
        setError(err.message || "Failed to load daily check items. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchItemsAndProfile();
  }, [userRole, navigate]);

  const handleCheckChange = (itemId: string, field: keyof CheckItemState, value: any) => {
    setCheckStates(prevStates =>
      prevStates.map(check =>
        check.item_id === itemId ? { ...check, [field]: value } : check
      )
    );
  };

  const handlePhotoClick = (itemId: string) => {
    setPhotoUploadItemId(itemId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && photoUploadItemId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleCheckChange(photoUploadItemId, 'photo_base64', reader.result as string);
        toast.success(`Photo added for item: ${activeItems.find(i => i.id === photoUploadItemId)?.title}`);
        setPhotoUploadItemId(null); // Reset
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!currentProfile) {
      toast.error("Driver profile not found. Cannot submit check.");
      return;
    }
    if (!startTime) {
      toast.error("Check timer not started. Please refresh.");
      return;
    }
    if (!truckReg.trim()) {
      toast.error("Truck Registration is required.");
      return;
    }
    if (!signature.trim()) {
      toast.error("Signature is required.");
      return;
    }

    setIsSubmitting(true);
    const finishedAt = new Date();
    const durationSeconds = Math.floor((finishedAt.getTime() - startTime.getTime()) / 1000);

    try {
      const payload = {
        truck_reg: truckReg,
        trailer_no: trailerNo.trim() || undefined,
        started_at: startTime.toISOString(),
        finished_at: finishedAt.toISOString(),
        signature: signature,
        items: checkStates.map(({ title, description, ...rest }) => rest), // Remove title/description from payload
      };

      const promise = submitDailyCheckResponse(payload);
      toast.promise(promise, {
        loading: 'Submitting daily check...',
        success: 'Daily check submitted successfully!',
        error: (err) => `Failed to submit daily check: ${err.message}`,
      });
      await promise;
      navigate('/'); // Navigate back to dashboard or a success page
    } catch (err: any) {
      console.error("Error submitting daily check:", err);
      toast.error("An unexpected error occurred while submitting the daily check.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading daily check items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Daily HGV Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-700 dark:text-gray-300">
              Please complete the following checks before starting your shift.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truckReg">Truck Registration</Label>
                <Input
                  id="truckReg"
                  value={truckReg}
                  onChange={(e) => setTruckReg(e.target.value)}
                  placeholder="e.g., AB12 CDE"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trailerNo">Trailer Number (Optional)</Label>
                <Input
                  id="trailerNo"
                  value={trailerNo}
                  onChange={(e) => setTrailerNo(e.target.value)}
                  placeholder="e.g., TRL-001"
                />
              </div>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-4">Checklist Items</h3>
            {activeItems.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No active daily check items found. Please contact admin.</p>
            ) : (
              <div className="space-y-4">
                {checkStates.map((check, index) => (
                  <Card key={check.item_id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`check-${check.item_id}`} className="text-lg font-medium">
                        {index + 1}. {check.title}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`check-${check.item_id}`}
                          checked={check.ok}
                          onCheckedChange={(checked) => handleCheckChange(check.item_id, 'ok', checked)}
                        />
                        <span className={`font-semibold ${check.ok ? 'text-green-600' : 'text-red-600'}`}>
                          {check.ok ? 'Pass' : 'Fail'}
                        </span>
                      </div>
                    </div>
                    {check.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{check.description}</p>
                    )}
                    <div className="space-y-2 mt-3">
                      <Label htmlFor={`notes-${check.item_id}`}>Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${check.item_id}`}
                        value={check.notes || ''}
                        onChange={(e) => handleCheckChange(check.item_id, 'notes', e.target.value)}
                        placeholder="Add any relevant notes..."
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePhotoClick(check.item_id)}
                      >
                        <Camera className="h-4 w-4 mr-2" /> Add Photo
                      </Button>
                      {check.photo_base64 && (
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Photo Added
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />

            <h3 className="text-xl font-semibold mt-6 mb-4">Signature</h3>
            <SignaturePad onSave={setSignature} initialSignature={signature} />

            <Button onClick={handleSubmit} className="w-full mt-6" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isSubmitting ? 'Submitting...' : 'Submit Daily Check'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDailyCheck;