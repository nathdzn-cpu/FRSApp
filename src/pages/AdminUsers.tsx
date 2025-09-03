import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getUsersForAdmin, createUser, updateUser, getProfiles, getTenants } from '@/lib/supabase';
import { Profile, Tenant } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserPlus, Edit, Save, XCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'driver' | 'office' | 'admin'>('driver');
  const [newUserUserId, setNewUserUserId] = useState(''); // Simulating auth.users.id
  const [profiles, setProfiles] = useState<Profile[]>([]); // For currentProfile

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : 'auth_user_dave';
  const currentProfile = profiles.find(p => p.user_id === currentUserId);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedTenants = await getTenants();
      const defaultTenantId = fetchedTenants[0]?.id;

      if (defaultTenantId) {
        const fetchedProfiles = await getProfiles(defaultTenantId);
        setProfiles(fetchedProfiles); // Set all profiles for currentProfile lookup
        const fetchedUsers = await getUsersForAdmin(defaultTenantId);
        setUsers(fetchedUsers);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load users. Please try again.");
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
    fetchUsers();
  }, [userRole, navigate]);

  const handleCreateUser = async () => {
    if (!currentProfile) return;
    if (!newUserName || !newUserRole || !newUserUserId) {
      toast.error("Please fill all fields for the new user.");
      return;
    }

    const userData = {
      full_name: newUserName,
      role: newUserRole,
      user_id: newUserUserId,
    };

    try {
      const promise = createUser(currentTenantId, userData, currentProfile.id);
      toast.promise(promise, {
        loading: 'Creating user...',
        success: 'User created successfully!',
        error: 'Failed to create user.',
      });
      await promise;
      fetchUsers();
      setIsDialogOpen(false);
      setNewUserName('');
      setNewUserRole('driver');
      setNewUserUserId('');
    } catch (err) {
      console.error("Error creating user:", err);
      toast.error("An unexpected error occurred while creating user.");
    }
  };

  const handleEditUser = (user: Profile) => {
    setEditingUser(user);
    setNewUserName(user.full_name);
    setNewUserRole(user.role);
    setNewUserUserId(user.user_id);
    setIsDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !currentProfile) return;
    if (!newUserName || !newUserRole || !newUserUserId) {
      toast.error("Please fill all fields for the user.");
      return;
    }

    const updates: Partial<Profile> = {
      full_name: newUserName,
      role: newUserRole,
      user_id: newUserUserId,
    };

    try {
      const promise = updateUser(currentTenantId, editingUser.id, updates, currentProfile.id);
      toast.promise(promise, {
        loading: 'Updating user...',
        success: 'User updated successfully!',
        error: 'Failed to update user.',
      });
      await promise;
      fetchUsers();
      setIsDialogOpen(false);
      setEditingUser(null);
      setNewUserName('');
      setNewUserRole('driver');
      setNewUserUserId('');
    } catch (err) {
      console.error("Error updating user:", err);
      toast.error("An unexpected error occurred while updating user.");
    }
  };

  const handleDisableUser = async (user: Profile) => {
    if (!currentProfile) return;
    // In a real app, this would interact with Supabase Auth Admin API to disable the user.
    // For mock data, we'll just simulate a status change or removal.
    try {
      const promise = new Promise((resolve) => setTimeout(() => {
        setUsers(prev => prev.filter(u => u.id !== user.id)); // Simulate removal
        resolve(true);
      }, 500));
      toast.promise(promise, {
        loading: `Disabling ${user.full_name}...`,
        success: `${user.full_name} disabled successfully! (Simulated)`,
        error: `Failed to disable ${user.full_name}.`,
      });
      await promise;
      // Log audit for disable action
      // mockAuditLogs.push({ ... }); // Add audit log here
    } catch (err) {
      console.error("Error disabling user:", err);
      toast.error("An unexpected error occurred while disabling user.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700 dark:text-gray-300">Loading users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Admin: User Management</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingUser(null); setNewUserName(''); setNewUserRole('driver'); setNewUserUserId(''); }}>
                  <UserPlus className="h-4 w-4 mr-2" /> Add New User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                  <DialogDescription>
                    {editingUser ? 'Make changes to the user profile here.' : 'Create a new user profile.'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="role" className="text-right">
                      Role
                    </Label>
                    <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as 'driver' | 'office' | 'admin')}>
                      <SelectTrigger id="role" className="col-span-3">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
                        <SelectItem value="driver">Driver</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="userId" className="text-right">
                      User ID (Auth)
                    </Label>
                    <Input
                      id="userId"
                      value={newUserUserId}
                      onChange={(e) => setNewUserUserId(e.target.value)}
                      placeholder="e.g., auth_user_id_123"
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={editingUser ? handleUpdateUser : handleCreateUser}>
                    <Save className="h-4 w-4 mr-2" /> {editingUser ? 'Save Changes' : 'Create User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No users found.</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>User ID (Auth)</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{user.user_id}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDisableUser(user)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsers;