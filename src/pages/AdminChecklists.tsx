import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDailyChecklists, updateDailyChecklist, getProfiles, getTenants } from '@/lib/supabase';
import { DailyChecklist, Profile, Tenant } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Save, PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea

const AdminChecklists: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [checklists, setChecklists] = useState<DailyChecklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<DailyChecklist | undefined>(undefined);
  const [editingItems, setEditingItems] = useState<DailyChecklist['items']>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSaving, setIsSaving] = useState(false); // New state for saving busy status

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }

    const fetchChecklists = async () => {
      setLoadingData(true);
      setError(null);
      try {
        const fetchedTenants = await getTenants();
        const defaultOrgId = currentProfile?.org_id || fetchedTenants[0]?.id;

        if (defaultOrgId) {
          const fetchedProfiles = await getProfiles(defaultOrgId);
          setProfiles(fetchedProfiles);

          const fetchedChecklists = await getDailyChecklists(defaultOrgId);
          setChecklists(fetchedChecklists);
          if (fetchedChecklists.length > 0) {
            setSelectedChecklist(fetchedChecklists[0]);
            setEditingItems(fetchedChecklists[0].items);
          }
        }
      } catch (err) {
        console.error("Failed to fetch checklists:", err);
        setError("Failed to load checklists. Please try again.");
      } finally {
        setLoadingData(false);
      }
    };
    fetchChecklists();
  }, [user, profile, userRole, isLoadingAuth, navigate]);

  const handleChecklistSelect = (checklistId: string) => {
    const checklist = checklists.find(cl => cl.id === checklistId);
    setSelectedChecklist(checklist);
    setEditingItems(checklist ? checklist.items : []);
  };

  const handleItemChange = (index: number, field: 'text' | 'type', value: string) => {
    const newItems = [...editingItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setEditingItems(newItems);
  };

  const handleAddItem = () => {
    setEditingItems([...editingItems, { id: Math.random().toString(36).substring(7), text: '', type: 'checkbox' }]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = editingItems.filter((_, i) => i !== index);
    setEditingItems(newItems);
  };

  const handleSave = async () => {
    if (!selectedChecklist || !currentProfile) return;

    setIsSaving(true);
    try {
      const promise = updateDailyChecklist(currentOrgId, selectedChecklist.id, editingItems, currentProfile.id);
      toast.promise(promise, {
        loading: 'Saving checklist...',
        success: 'Checklist saved successfully!',
        error: 'Failed to save checklist.',
      });
      await promise;
      // Re-fetch to ensure UI is updated with latest data
      const updatedChecklists = await getDailyChecklists(currentOrgId);
      setChecklists(updatedChecklists);
      setSelectedChecklist(updatedChecklists.find(cl => cl.id === selectedChecklist.id));
    } catch (err) {
      console.error("Error saving checklist:", err);
      toast.error("An unexpected error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading checklists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline" className="bg-white hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || userRole !== 'admin') {
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6 bg-white hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-white shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Admin: Daily Checklists</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="mb-4">
              <Label htmlFor="select-checklist" className="text-gray-700">Select Checklist</Label>
              <Select onValueChange={handleChecklistSelect} value={selectedChecklist?.id || ''}>
                <SelectTrigger id="select-checklist" className="w-full md:w-[300px] bg-white hover:bg-gray-50">
                  <SelectValue placeholder="Select a checklist" />
                </SelectTrigger>
                <SelectContent className="bg-white shadow-sm rounded-xl">
                  {checklists.map(cl => (
                    <SelectItem key={cl.id} value={cl.id}>{cl.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedChecklist ? (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{selectedChecklist.name} Items</h3>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4"> {/* Added ScrollArea */}
                  <div className="space-y-4">
                    {editingItems.map((item, index) => (
                      <div key={item.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
                        <Input
                          value={item.text}
                          onChange={(e) => handleItemChange(index, 'text', e.target.value)}
                          placeholder="Checklist item text"
                          className="flex-grow"
                          disabled={isSaving}
                        />
                        <Select
                          value={item.type}
                          onValueChange={(value) => handleItemChange(index, 'type', value as 'checkbox' | 'text')}
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-[120px] bg-white hover:bg-gray-50">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white shadow-sm rounded-xl">
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                            <SelectItem value="text">Text Input</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="destructive" size="icon" onClick={() => handleRemoveItem(index)} disabled={isSaving} className="bg-red-600 text-white hover:bg-red-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" onClick={handleAddItem} disabled={isSaving} className="bg-blue-600 text-white hover:bg-blue-700">
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>
                </ScrollArea>
                <Button onClick={handleSave} className="mt-6 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Checklist
                </Button>
              </div>
            ) : (
              <p className="text-gray-600">Please select a checklist to edit.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminChecklists;