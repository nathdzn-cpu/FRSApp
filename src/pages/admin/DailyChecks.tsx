"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabaseClient";
import { callFn } from "@/lib/callFunction";
import { useUserRole } from '@/context/UserRoleContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, PlusCircle, Edit, Trash2, Check, X, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type DailyCheckItem = { id: string; title: string; description: string | null; is_active: boolean };

const AdminDailyChecks: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [items, setItems] = useState<DailyCheckItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fnError, setFnError] = useState<string | null>(null);

  // State for new item form
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIsActive, setNewItemIsActive] = useState(true);

  // State for editing item dialog
  const [editingItem, setEditingItem] = useState<DailyCheckItem | null>(null);

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data, in a real app this would come from user session

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try reading via SQL directly (requires RLS to allow admin read)
      const { data, error: dbError } = await supabase
        .from("daily_check_items")
        .select("id, title, description, is_active")
        .eq("tenant_id", currentTenantId) // Filter by tenant_id
        .order("created_at", { ascending: false });

      if (dbError) {
        setError(dbError.message);
      } else {
        setItems((data as DailyCheckItem[]) || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch daily check items:", err);
      setError(err.message || "Failed to load daily check items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }
    loadItems();
  }, [userRole, navigate]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const t = searchTerm.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(t) || (i.description || "").toLowerCase().includes(t));
  }, [searchTerm, items]);

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      toast.error("Item title cannot be empty.");
      return;
    }
    setBusy(true);
    setFnError(null);
    try {
      const payload = { op: "create", title: newItemTitle, description: newItemDescription.trim() || null, is_active: newItemIsActive, tenant_id: currentTenantId };
      try {
        await callFn("admin-daily-check-items", payload);
      } catch (e: any) {
        if (/404|not configured|Failed/i.test(e.message)) {
          const { error: dbError } = await supabase.from("daily_check_items").insert({ ...payload, tenant_id: currentTenantId });
          if (dbError) throw dbError;
        } else {
          throw e;
        }
      }
      toast.success("Item created successfully!");
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemIsActive(true);
      await loadItems();
    } catch (e: any) {
      console.error("Error creating item:", e);
      setFnError(e.message || String(e));
      toast.error(`Failed to create item: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (id: string, is_active: boolean) => {
    setBusy(true);
    setFnError(null);
    try {
      const payload = { op: "update", id, changes: { is_active: !is_active }, tenant_id: currentTenantId };
      try {
        await callFn("admin-daily-check-items", payload);
      } catch (e: any) {
        if (/404|not configured|Failed/i.test(e.message)) {
          const { error: dbError } = await supabase.from("daily_check_items").update({ is_active: !is_active }).eq("id", id).eq("tenant_id", currentTenantId);
          if (dbError) throw dbError;
        } else {
          throw e;
        }
      }
      toast.success(`Item ${!is_active ? 'activated' : 'deactivated'} successfully!`);
      await loadItems();
    } catch (e: any) {
      console.error("Error toggling item active status:", e);
      setFnError(e.message || String(e));
      toast.error(`Failed to toggle item status: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEditItem = (item: DailyCheckItem) => {
    setEditingItem({ ...item });
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem.title.trim()) {
      toast.error("Item title cannot be empty.");
      return;
    }
    setBusy(true);
    setFnError(null);
    try {
      const payload = { op: "update", id: editingItem.id, changes: { title: editingItem.title, description: editingItem.description?.trim() || null }, tenant_id: currentTenantId };
      try {
        await callFn("admin-daily-check-items", payload);
      } catch (e: any) {
        if (/404|not configured|Failed/i.test(e.message)) {
          const { error: dbError } = await supabase.from("daily_check_items").update({ title: editingItem.title, description: editingItem.description?.trim() || null }).eq("id", editingItem.id).eq("tenant_id", currentTenantId);
          if (dbError) throw dbError;
        } else {
          throw e;
        }
      }
      toast.success("Item updated successfully!");
      setEditingItem(null);
      await loadItems();
    } catch (e: any) {
      console.error("Error updating item:", e);
      setFnError(e.message || String(e));
      toast.error(`Failed to update item: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setBusy(true);
    setFnError(null);
    try {
      const payload = { op: "delete", id, tenant_id: currentTenantId };
      try {
        await callFn("admin-daily-check-items", payload);
      } catch (e: any) {
        if (/404|not configured|Failed/i.test(e.message)) {
          const { error: dbError } = await supabase.from("daily_check_items").delete().eq("id", id).eq("tenant_id", currentTenantId);
          if (dbError) throw dbError;
        } else {
          throw e;
        }
      }
      toast.success("Item deleted successfully!");
      await loadItems();
    } catch (e: any) {
      console.error("Error deleting item:", e);
      setFnError(e.message || String(e));
      toast.error(`Failed to delete item: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
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

  if (userRole !== 'admin') {
    return null; // Should be redirected by useEffect
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Admin: Daily HGV Check Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Create New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newItemTitle">Title</Label>
                  <Input
                    id="newItemTitle"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    placeholder="e.g., Brakes"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newItemDescription">Description (Optional)</Label>
                  <Textarea
                    id="newItemDescription"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="e.g., Check brake fluid, pads, and general function."
                    disabled={busy}
                  />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="newItemIsActive"
                    checked={newItemIsActive}
                    onCheckedChange={setNewItemIsActive}
                    disabled={busy}
                  />
                  <Label htmlFor="newItemIsActive">Is Active</Label>
                </div>
              </div>
              <Button onClick={handleCreateItem} className="w-full" disabled={busy}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Existing Items</h3>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow"
                  disabled={busy}
                />
                <Button onClick={loadItems} disabled={busy} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
              {fnError && <p className="text-red-500 text-sm mb-2">Function error: {fnError}</p>}
              {filteredItems.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No daily check items found.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Active</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.description || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.is_active ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleToggleActive(item.id, item.is_active)} disabled={busy}>
                                {item.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditItem(item)} disabled={busy}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" disabled={busy}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the "{item.title}" check item.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)} disabled={busy}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Item Dialog */}
      {editingItem && (
        <AlertDialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Edit Daily Check Item</AlertDialogTitle>
              <AlertDialogDescription>
                Make changes to the item here. Click save when you're done.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editItemTitle">Title</Label>
                <Input
                  id="editItemTitle"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemDescription">Description (Optional)</Label>
                <Textarea
                  id="editItemDescription"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  disabled={busy}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editItemIsActive"
                  checked={editingItem.is_active}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_active: checked })}
                  disabled={busy}
                />
                <Label htmlFor="editItemIsActive">Is Active</Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpdateItem} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default AdminDailyChecks;