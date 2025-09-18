"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from "@/lib/supabaseClient";
import { callFn } from "@/lib/callFunction";
import { DailyCheckItem, Profile } from '@/utils/mockData';
import { submitDailyCheck } from '@/lib/api/driverApp';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Camera, CheckCircle2, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import SignaturePad, { SignaturePadRef } from '@/components/SignaturePad';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getDailyCheckItems } from '@/lib/api/dailyCheckItems';

interface CheckItemResponse {
  item_id: string;
  title: string;
  description?: string;
  ok: boolean | null;
  notes?: string;
  file?: File | null;
  photo_url?: string | null;
}

const DriverDailyCheck: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [activeItems, setActiveItems] = useState<DailyCheckItem[]>([]);
  const [checkStates, setCheckStates] = useState<CheckItemResponse[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [truckReg, setTruckReg] = useState('');
  const [trailerNo, setTrailerNo] = useState('');
  const [signature, setSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fnError, setFnError] = useState<string | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploadItemId, setPhotoUploadItemId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'driver') {
      toast.error("You do not have permission to access this page. Only drivers can perform daily checks.");
      navigate('/');
      return;
    }

    const fetchItemsAndProfile = async () => {
      setLoadingData(true);
      setError(null);
      try {
        if (!currentProfile) {
          throw new Error("Driver profile not found.");
        }
        
        setTruckReg(currentProfile.truck_reg || '');
        setTrailerNo(currentProfile.trailer_no || '');

        const fetchedItems = await getDailyCheckItems(currentOrgId);
        const active = fetchedItems.filter(item => item.is_active);
        
        setActiveItems(active);
        setCheckStates(active.map(item => ({
          item_id: item.id,
          title: item.title,
          description: item.description,
          ok: null,
          notes: '',
          file: null,
          photo_url: null,
        })));
        setStartTime(new Date());
      } catch (err: any) {
        console.error("Failed to fetch daily check items or profile:", err);
        setError(err.message || "Failed to load daily check items. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchItemsAndProfile();
  }, [user, profile, userRole, currentOrgId, isLoadingAuth, navigate]);

  const handleCheckChange = (itemId: string, field: keyof CheckItemResponse, value: any) => {
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
      handleCheckChange(photoUploadItemId, 'file', file);
      toast.success(`Photo selected for item: ${activeItems.find(i => i.id === photoUploadItemId)?.title}`);
      setPhotoUploadItemId(null);
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!currentProfile || !userRole) { // Ensure userRole is available
      toast.error("Driver profile or role not found. Cannot submit check.");
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
    if (checkStates.some(check => check.ok === null)) {
      toast.error("Please answer all checklist items (Pass/Fail).");
      return;
    }

    setIsSubmitting(true);
    setFnError(null);
    const finishedAt = new Date();
    const duration_seconds = Math.round((finishedAt.getTime() - startTime.getTime()) / 1000);

    try {
      const itemsPayload: Array<{ item_id: string; ok: boolean; notes?: string | null; photo_url?: string | null }> = [];
      for (const check of checkStates) {
        let photo_url: string | null = null;
        if (check.file) {
          const fileName = `daily-checks/${currentProfile.id}/${crypto.randomUUID()}-${check.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage.from("daily-checks").upload(fileName, check.file, { upsert: false });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("daily-checks").getPublicUrl(fileName);
          photo_url = urlData?.publicUrl || null;
        }
        itemsPayload.push({
          item_id: check.item_id,
          ok: check.ok === true,
          notes: check.notes?.trim() || null,
          photo_url: photo_url,
        });
      }

      const payload = {
        truck_reg: truckReg,
        trailer_no: trailerNo.trim() || null,
        started_at: startTime.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_seconds: duration_seconds,
        signature: signature,
        items: itemsPayload,
        org_id: currentOrgId,
        driver_id: currentProfile.id,
        actor_role: userRole, // Pass actor_role
      };

      try {
        await callFn("driver-daily-check-submit", payload);
      } catch (e: any) {
        if (/404|not configured|Failed/i.test(e.message)) {
          const { error: dbError } = await supabase.from("daily_check_responses").insert(payload);
          if (dbError) throw dbError;
        } else {
          throw e;
        }
      }

      toast.success("Daily check submitted successfully!");
      navigate('/');
    } catch (e: any) {
      console.error("Error submitting daily check:", e);
      setFnError(e.message || String(e));
      toast.error("An unexpected error occurred while submitting the daily check.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading daily check items...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'driver') {
    return null;
  }

  return (
    <div className="w-full px-6">
      <div className="max-w-2xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Daily HGV Check</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-0 pt-4">
            <p className="text-gray-700">
              Please complete the following checks before starting your shift.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="truckReg" className="text-gray-700">Truck Registration</Label>
                <Input
                  id="truckReg"
                  value={truckReg}
                  onChange={(e) => setTruckReg(e.target.value)}
                  placeholder="e.g., AB12 CDE"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trailerNo" className="text-gray-700">Trailer Number (Optional)</Label>
                <Input
                  id="trailerNo"
                  value={trailerNo}
                  onChange={(e) => setTrailerNo(e.target.value)}
                  placeholder="e.g., TRL-001"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Checklist Items</h3>
            {activeItems.length === 0 ? (
              <p className="text-gray-600">No active daily check items found. Please contact admin.</p>
            ) : (
              <div className="space-y-4">
                {checkStates.map((check, index) => (
                  <Card key={check.item_id} className="bg-[var(--saas-card-bg)] p-4 shadow-sm rounded-md"> {/* Removed border */}
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor={`check-${check.item_id}`} className="text-lg font-medium text-gray-900">
                        {index + 1}. {check.title}
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`check-${check.item_id}`}
                          checked={check.ok === true}
                          onCheckedChange={(checked) => handleCheckChange(check.item_id, 'ok', checked)}
                          disabled={isSubmitting}
                        />
                        <span className={`font-semibold ${check.ok === true ? 'text-green-600' : check.ok === false ? 'text-red-600' : 'text-gray-500'}`}>
                          {check.ok === true ? 'Pass' : check.ok === false ? 'Fail' : 'N/A'}
                        </span>
                      </div>
                    </div>
                    {check.description && (
                      <p className="text-sm text-gray-600 mb-3">{check.description}</p>
                    )}
                    <div className="space-y-2 mt-3">
                      <Label htmlFor={`notes-${check.item_id}`} className="text-gray-700">Notes (Optional)</Label>
                      <Textarea
                        id={`notes-${check.item_id}`}
                        value={check.notes || ''}
                        onChange={(e) => handleCheckChange(check.item_id, 'notes', e.target.value)}
                        placeholder="Add any relevant notes..."
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handlePhotoClick(check.item_id)}
                        disabled={isSubmitting}
                      >
                        <Camera className="h-4 w-4 mr-2" /> Add Photo
                      </Button>
                      {check.file && (
                        <span className="text-sm text-gray-500 flex items-center">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mr-1" /> Photo Selected ({check.file.name})
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

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Signature</h3>
              <SignaturePad ref={signaturePadRef} signatureName={signature} setSignatureName={setSignature} nameError={null} />
              {fnError && <p className="text-red-500 text-sm mt-4">Function error: {fnError}</p>}
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full mt-6">
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Daily Check'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DriverDailyCheck;