"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getDailyCheckItems, createDailyCheckItem, updateDailyCheckItem, deleteDailyCheckItem, getProfiles } from '@/lib/supabase';
import { DailyCheckItem, Profile } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';
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

const AdminDailyChecks: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [items, setItems] = useState<DailyCheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<DailyCheckItem | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIsActive, setNewItemIsActive] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]); // To get currentProfile for actor_id

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : userRole === 'driver' ? 'auth_user_dave' : 'unknown';
  const currentProfile = profiles.find(p => p.user_id === currentUserId);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      // In a real app, you'd fetch profiles to get the current user's profile ID
      const fetchedProfiles = await getProfiles(currentTenantId);
      setProfiles(fetchedProfiles);

      const fetchedItems = await getDailyCheckItems();
      setItems(fetchedItems);
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
    fetchItems();
  }, [userRole, navigate]);

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      toast.error("Item title cannot be empty.");
      return;
    }
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot create item.");
      return;
    }

    try {
      const promise = createDailyCheckItem({
        title: newItemTitle,
        description: newItemDescription.trim() || undefined,
        is_active: newItemIsActive,
      });
      toast.promise(promise, {
        loading: 'Creating item...',
        success: 'Item created successfully!',
        error: (err) => `Failed to create item: ${err.message}`,
      });
      await promise;
      setNewItemTitle('');
      setNewItemDescription('');
      setNewItemIsActive(true);
      fetchItems();
    } catch (err: any) {
      console.error("Error creating item:", err);
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
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot update item.");
      return;
    }

    try {
      const promise = updateDailyCheckItem(editingItem.id, {
        title: editingItem.title,
        description: editingItem.description?.trim() || undefined,
        is_active: editingItem.is_active,
      });
      toast.promise(promise, {
        loading: 'Updating item...',
        success: 'Item updated successfully!',
        error: (err) => `Failed to update item: ${err.message}`,
      });
      await promise;
      setEditingItem(null);
      fetchItems();
    } catch (err: any) {
      console.error("Error updating item:", err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot delete item.");
      return;
    }

    try {
      const promise = deleteDailyCheckItem(itemId);
      toast.promise(promise, {
        loading: 'Deleting item...',
        success: 'Item deleted successfully!',
        error: (err) => `Failed to delete item: ${err.message}`,
      });
      await promise;
      fetchItems();
    } catch (err: any) {
      console.error("Error deleting item:", err);
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
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newItemDescription">Description (Optional)</Label>
                  <Textarea
                    id="newItemDescription"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="e.g., Check brake fluid, pads, and general function."
                  />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Switch
                    id="newItemIsActive"
                    checked={newItemIsActive}
                    onCheckedChange={setNewItemIsActive}
                  />
                  <Label htmlFor="newItemIsActive">Is Active</Label>
                </div>
              </div>
              <Button onClick={handleCreateItem} className="w-full">
                <PlusCircle className="h-4 w-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Existing Items</h3>
              {items.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No daily check items defined yet.</p>
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
                      {items.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">{item.description || '-'}</TableCell>
                          <TableCell className="text-center">
                            {item.is_active ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
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
                                    <AlertDialogAction onClick={() => handleDeleteItem(item.id)}>Delete</AlertDialogAction>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editItemDescription">Description (Optional)</Label>
                <Textarea
                  id="editItemDescription"
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="editItemIsActive"
                  checked={editingItem.is_active}
                  onCheckedChange={(checked) => setEditingItem({ ...editingItem, is_active: checked })}
                />
                <Label htmlFor="editItemIsActive">Is Active</Label>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpdateItem}>Save Changes</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default AdminDailyChecks;