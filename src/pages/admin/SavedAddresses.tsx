"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getSavedAddresses, createSavedAddress, updateSavedAddress, deleteSavedAddress } from '@/lib/supabase';
import { SavedAddress } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, PlusCircle, Edit, Trash2, Star, Search, RefreshCw } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { formatAddressPart, formatPostcode, toTitleCase } from '@/lib/utils/formatUtils';

type SavedAddressFormValues = Omit<SavedAddress, 'id' | 'org_id' | 'created_at'>;

const AdminSavedAddresses: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // State for new address form
  const [newAddressName, setNewAddressName] = useState('');
  const [newAddressLine1, setNewAddressLine1] = useState('');
  const [newAddressLine2, setNewAddressLine2] = useState('');
  const [newAddressCity, setNewAddressCity] = useState('');
  const [newAddressCounty, setNewAddressCounty] = useState('');
  const [newAddressPostcode, setNewAddressPostcode] = useState('');
  const [newAddressFavourite, setNewAddressFavourite] = useState(false);

  // State for editing address dialog
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  const loadAddresses = async () => {
    if (!user || !['admin', 'office'].includes(userRole!) || !currentOrgId) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      const fetchedAddresses = await getSavedAddresses(currentOrgId, searchTerm);
      setAddresses(fetchedAddresses);
    } catch (err: any) {
      console.error("Failed to fetch saved addresses:", err);
      setError(err.message || "Failed to load saved addresses. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || !['admin', 'office'].includes(userRole!)) {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }
    loadAddresses();
  }, [user, userRole, currentOrgId, isLoadingAuth, navigate, searchTerm]); // Re-fetch on searchTerm change

  const handleCreateAddress = async () => {
    if (!newAddressLine1.trim() || !newAddressCity.trim() || !newAddressPostcode.trim()) {
      toast.error("Address Line 1, City, and Postcode are required.");
      return;
    }
    if (!currentProfile || !userRole) {
      toast.error("User profile or role not found. Cannot create address.");
      return;
    }
    setBusy(true);
    try {
      const addressData = {
        name: newAddressName.trim() || null,
        line_1: newAddressLine1.trim(),
        line_2: newAddressLine2.trim() || null,
        town_or_city: newAddressCity.trim(),
        county: newAddressCounty.trim() || null,
        postcode: newAddressPostcode.trim().toUpperCase(),
        favourite: newAddressFavourite,
      };
      await createSavedAddress(currentOrgId, addressData, userRole);
      toast.success("Address created successfully!");
      // Clear form
      setNewAddressName('');
      setNewAddressLine1('');
      setNewAddressLine2('');
      setNewAddressCity('');
      setNewAddressCounty('');
      setNewAddressPostcode('');
      setNewAddressFavourite(false);
      await loadAddresses();
    } catch (e: any) {
      console.error("Error creating address:", e);
      toast.error(`Failed to create address: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleEditAddress = (address: SavedAddress) => {
    setEditingAddress({ ...address });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAddress = async () => {
    if (!editingAddress || !editingAddress.line_1.trim() || !editingAddress.town_or_city.trim() || !editingAddress.postcode.trim()) {
      toast.error("Address Line 1, City, and Postcode are required.");
      return;
    }
    if (!currentProfile || !userRole) {
      toast.error("User profile or role not found. Cannot update address.");
      return;
    }
    setBusy(true);
    try {
      const updates = {
        name: editingAddress.name?.trim() || null,
        line_1: editingAddress.line_1.trim(),
        line_2: editingAddress.line_2?.trim() || null,
        town_or_city: editingAddress.town_or_city.trim(),
        county: editingAddress.county?.trim() || null,
        postcode: editingAddress.postcode.trim().toUpperCase(),
        favourite: editingAddress.favourite,
      };
      await updateSavedAddress(currentOrgId, editingAddress.id, updates, userRole);
      toast.success("Address updated successfully!");
      setEditingAddress(null);
      setIsEditDialogOpen(false);
      await loadAddresses();
    } catch (e: any) {
      console.error("Error updating address:", e);
      toast.error(`Failed to update address: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleFavourite = async (address: SavedAddress) => {
    if (!currentProfile || !userRole) {
      toast.error("User profile or role not found. Cannot toggle favourite status.");
      return;
    }
    setBusy(true);
    try {
      const updates = { favourite: !address.favourite };
      await updateSavedAddress(currentOrgId, address.id, updates, userRole);
      toast.success(`Address marked as ${!address.favourite ? 'favourite' : 'not favourite'}!`);
      await loadAddresses();
    } catch (e: any) {
      console.error("Error toggling favourite status:", e);
      toast.error(`Failed to toggle favourite status: ${e.message || String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  if (isLoadingAuth || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading saved addresses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (!user || !['admin', 'office'].includes(userRole!)) {
    return null;
  }

  return (
    <div className="w-full"> {/* Removed min-h-screen and explicit padding, handled by App.tsx main */}
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-[var(--saas-card-bg)] mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Saved Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Add New Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="newAddressName">Name (Optional)</Label>
                  <Input
                    id="newAddressName"
                    value={newAddressName}
                    onChange={(e) => setNewAddressName(e.target.value)}
                    placeholder="e.g., Main Depot"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddressLine1">Address Line 1</Label>
                  <Input
                    id="newAddressLine1"
                    value={newAddressLine1}
                    onChange={(e) => setNewAddressLine1(e.target.value)}
                    placeholder="e.g., 123 High Street"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddressLine2">Address Line 2 (Optional)</Label>
                  <Input
                    id="newAddressLine2"
                    value={newAddressLine2}
                    onChange={(e) => setNewAddressLine2(e.target.value)}
                    placeholder="e.g., Unit 5"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddressCity">Town/City</Label>
                  <Input
                    id="newAddressCity"
                    value={newAddressCity}
                    onChange={(e) => setNewAddressCity(e.target.value)}
                    placeholder="e.g., London"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddressCounty">County (Optional)</Label>
                  <Input
                    id="newAddressCounty"
                    value={newAddressCounty}
                    onChange={(e) => setNewAddressCounty(e.target.value)}
                    placeholder="e.g., Greater London"
                    disabled={busy}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newAddressPostcode">Postcode</Label>
                  <Input
                    id="newAddressPostcode"
                    value={formatPostcode(newAddressPostcode)}
                    onChange={(e) => setNewAddressPostcode(e.target.value)}
                    onBlur={(e) => setNewAddressPostcode(formatPostcode(e.target.value))}
                    placeholder="e.g., SW1A 0AA"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="flex items-center space-x-2 md:col-span-2">
                  <Checkbox
                    id="newAddressFavourite"
                    checked={newAddressFavourite}
                    onCheckedChange={(checked: boolean) => setNewAddressFavourite(checked)}
                    disabled={busy}
                  />
                  <Label htmlFor="newAddressFavourite">Favourite</Label>
                </div>
              </div>
              <Button onClick={handleCreateAddress} className="w-full" disabled={busy}>
                <PlusCircle className="h-4 w-4 mr-2" /> Add Address
              </Button>
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-4">Existing Addresses</h3>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search addresses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-grow"
                  disabled={busy}
                />
                <Button onClick={loadAddresses} disabled={busy} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh
                </Button>
              </div>
              {addresses.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No saved addresses found.</p>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Postcode</TableHead>
                        <TableHead className="text-center">Favourite</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {addresses.map(address => (
                        <TableRow key={address.id}>
                          <TableCell className="font-medium">{address.name || '-'}</TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {formatAddressPart(address.line_1)}
                            {address.line_2 && `, ${formatAddressPart(address.line_2)}`}
                            , {formatAddressPart(address.town_or_city)}
                            {address.county && `, ${formatAddressPart(address.county)}`}
                          </TableCell>
                          <TableCell>{formatPostcode(address.postcode)}</TableCell>
                          <TableCell className="text-center">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleFavourite(address)} disabled={busy}>
                              {address.favourite ? <Star className="h-4 w-4 text-yellow-500" /> : <Star className="h-4 w-4 text-gray-300" />}
                            </Button>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditAddress(address)} disabled={busy}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" disabled={busy}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the saved address: "{address.name || address.line_1}".
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAddress(address.id)} disabled={busy} variant="destructive">Delete</AlertDialogAction>
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

        {/* Edit Address Dialog */}
        {editingAddress && (
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md bg-[var(--saas-card-bg)] p-6 rounded-xl shadow-lg flex flex-col max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Edit Saved Address</DialogTitle>
                <DialogDescription>
                  Make changes to the address here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="editAddressName">Name (Optional)</Label>
                    <Input
                      id="editAddressName"
                      value={editingAddress.name || ''}
                      onChange={(e) => setEditingAddress({ ...editingAddress, name: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressLine1">Address Line 1</Label>
                    <Input
                      id="editAddressLine1"
                      value={editingAddress.line_1}
                      onChange={(e) => setEditingAddress({ ...editingAddress, line_1: e.target.value })}
                      required
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressLine2">Address Line 2 (Optional)</Label>
                    <Input
                      id="editAddressLine2"
                      value={editingAddress.line_2 || ''}
                      onChange={(e) => setEditingAddress({ ...editingAddress, line_2: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressCity">Town/City</Label>
                    <Input
                      id="editAddressCity"
                      value={editingAddress.town_or_city}
                      onChange={(e) => setEditingAddress({ ...editingAddress, town_or_city: e.target.value })}
                      required
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressCounty">County (Optional)</Label>
                    <Input
                      id="editAddressCounty"
                      value={editingAddress.county || ''}
                      onChange={(e) => setEditingAddress({ ...editingAddress, county: e.target.value })}
                      disabled={busy}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressPostcode">Postcode</Label>
                    <Input
                      id="editAddressPostcode"
                      value={formatPostcode(editingAddress.postcode)}
                      onChange={(e) => setEditingAddress({ ...editingAddress, postcode: e.target.value })}
                      onBlur={(e) => setEditingAddress({ ...editingAddress, postcode: formatPostcode(e.target.value) })}
                      placeholder="e.g., SW1A 0AA"
                      required
                      disabled={busy}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editAddressFavourite"
                      checked={editingAddress.favourite}
                      onCheckedChange={(checked: boolean) => setEditingAddress({ ...editingAddress, favourite: checked })}
                      disabled={busy}
                    />
                    <Label htmlFor="editAddressFavourite">Favourite</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={busy}>Cancel</Button>
                <Button onClick={handleUpdateAddress} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default AdminSavedAddresses;