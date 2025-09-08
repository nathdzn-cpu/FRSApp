import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUsersForAdmin, deleteUser, resetUserPassword, purgeDemoUsers, purgeAllNonAdminUsers } from '@/lib/supabase';
import { Profile } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserPlus, Edit, Trash2, Mail, RefreshCw, Eraser } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import PasswordConfirmDialog from '@/components/PasswordConfirmDialog'; // Import the new component

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, userRole, isLoadingAuth } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'driver' | 'office' | 'admin'>('all');
  const [showDemo, setShowDemo] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [purgingAll, setPurgingAll] = useState(false);

  // State for password confirmation dialogs
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isPurgeDemoConfirmOpen, setIsPurgeDemoConfirmOpen] = useState(false);
  const [isPurgeAllNonAdminConfirmOpen, setIsPurgeAllNonAdminConfirmOpen] = useState(false);

  const currentOrgId = profile?.org_id || 'demo-tenant-id';
  const currentProfile = profile;

  const fetchUsers = async () => {
    if (!user || userRole !== 'admin' || !currentOrgId) {
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    setError(null);
    try {
      const fetchedUsers = await getUsersForAdmin(currentOrgId);
      setUsers(fetchedUsers);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users. Please try again.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isLoadingAuth) return;

    if (!user || userRole !== 'admin') {
      toast.error("You do not have permission to access this page.");
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, userRole, currentOrgId, isLoadingAuth, navigate]);

  const handleInitiateDelete = (user: Profile) => {
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteUserConfirmed = async () => {
    if (!userToDelete || !currentProfile || !userRole) { // Ensure userRole is available
      toast.error("User to delete or admin profile/role not found. Cannot delete user.");
      return;
    }
    try {
      setBusyId(userToDelete.id);
      const promise = deleteUser(currentOrgId, userToDelete.id, currentProfile.id, userRole); // Pass userRole
      toast.promise(promise, {
        loading: `Deleting ${userToDelete.full_name}...`,
        success: `${userToDelete.full_name} deleted successfully!`,
        error: `Failed to delete ${userToDelete.full_name}.`,
      });
      const result = await promise;
      if (result) {
        fetchUsers();
      } else {
        toast.error(`Failed to delete ${userToDelete.full_name}: User not found or could not be deleted.`);
      }
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast.error("An unexpected error occurred while deleting user.");
    } finally {
      setBusyId(null);
      setUserToDelete(null);
    }
  };

  const handleResetPassword = async (userToReset: Profile) => {
    if (!currentProfile || !userRole) { // Ensure userRole is available
      toast.error("Admin profile or role not found. Cannot reset password.");
      return;
    }
    try {
      setBusyId(userToReset.id);
      const promise = resetUserPassword(currentOrgId, userToReset.user_id, currentProfile.id, userRole); // Pass userRole
      toast.promise(promise, {
        loading: `Sending password reset to ${userToReset.full_name}...`,
        success: `Password reset email sent to ${userToReset.full_name}!`,
        error: `Failed to send password reset to ${userToReset.full_name}.`,
      });
      await promise;
    } catch (err: any) {
      console.error("Error sending password reset:", err);
      toast.error("An unexpected error occurred while sending password reset.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeDemoUsersConfirmed = async () => {
    if (!currentProfile || !userRole) { // Ensure userRole is available
      toast.error("Admin profile or role not found. Cannot purge demo users.");
      return;
    }

    setPurging(true);
    try {
      const result = await purgeDemoUsers(currentOrgId, currentProfile.id, userRole); // Pass userRole
      if (result.ok) {
        toast.success(`Removed ${result.removed} demo user(s).`);
        fetchUsers();
      } else {
        toast.error("Failed to purge demo users.");
      }
    } catch (err: any) {
      console.error("Error purging demo users:", err);
      toast.error("An unexpected error occurred while purging demo users.");
    } finally {
      setPurging(false);
    }
  };

  const handlePurgeAllNonAdminUsersConfirmed = async () => {
    if (!currentProfile || !userRole) { // Ensure userRole is available
      toast.error("Admin profile or role not found. Cannot purge non-admin users.");
      return;
    }

    setPurgingAll(true);
    try {
      const result = await purgeAllNonAdminUsers(currentOrgId, currentProfile.id, userRole); // Pass userRole
      if (result.ok) {
        toast.success(`Removed ${result.removed} non-admin user(s).`);
        fetchUsers();
      } else {
        toast.error("Failed to purge non-admin users.");
      }
    } catch (err: any) {
      console.error("Error purging non-admin users:", err);
      toast.error("An unexpected error occurred while purging non-admin users.");
    } finally {
      setPurgingAll(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let r = users;
    if (!showDemo) r = r.filter(x => !x.is_demo);
    if (filterRole !== "all") r = r.filter(x => x.role === filterRole);
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      r = r.filter(x =>
        (x.full_name?.toLowerCase().includes(t)) ||
        (x.user_id?.toLowerCase().includes(t)) ||
        (x.truck_reg?.toLowerCase().includes(t)) ||
        (x.trailer_no?.toLowerCase().includes(t))
      );
    }
    return r;
  }, [users, searchTerm, filterRole, showDemo]);

  if (isLoadingAuth || loadingData) {
    return (
      <div className="flex items-center justify-center bg-[var(--saas-background)]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="ml-2 text-gray-700">Loading users...</p>
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

  if (!user || userRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center bg-[var(--saas-background)] p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-7xl mx-auto">
        <Button onClick={() => navigate('/')} variant="outline" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6 mb-6">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">Admin: User Management</CardTitle>
            <div className="flex space-x-2">
              <Button onClick={fetchUsers} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button onClick={() => navigate('/admin/users/new')} className="bg-blue-600 text-white hover:bg-blue-700">
                <UserPlus className="h-4 w-4 mr-2" /> Add New User
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 pt-4">
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-center">
              <Input
                placeholder="Search by name, user id, reg..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow"
              />
              <Select value={filterRole} onValueChange={(value: 'all' | 'driver' | 'office' | 'admin') => setFilterRole(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="show-demo"
                  checked={showDemo}
                  onCheckedChange={(checked: boolean) => setShowDemo(checked)}
                />
                <Label htmlFor="show-demo" className="text-gray-700">Show demo users</Label>
              </div>
              <Button
                variant="destructive"
                onClick={() => setIsPurgeDemoConfirmOpen(true)}
                disabled={purging}
                className="w-full sm:w-auto"
              >
                {purging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Purge Demo Users
              </Button>

              <Button
                variant="destructive"
                onClick={() => setIsPurgeAllNonAdminConfirmOpen(true)}
                disabled={purgingAll}
                className="w-full sm:w-auto"
              >
                <Eraser className="h-4 w-4 mr-2" /> {purgingAll ? "Purging All..." : "Purge All Non-Admin Users"}
              </Button>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-gray-600">No users found matching your criteria.</p>
            ) : (
              <div className="rounded-md overflow-hidden shadow-sm"> {/* Removed border */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>User ID (Auth)</TableHead>
                      <TableHead>Truck Reg</TableHead>
                      <TableHead>Trailer No</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user, index) => (
                      <TableRow key={user.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">{user.user_id}</TableCell>
                        <TableCell>{user.truck_reg || '-'}</TableCell>
                        <TableCell>{user.trailer_no || '-'}</TableCell>
                        <TableCell>{user.is_demo ? <Badge variant="outline">Demo</Badge> : '-'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => navigate(`/admin/users/${user.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" disabled={busyId === user.id}>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Send Password Reset for {user.full_name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will send a password reset email to the user's registered email address.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel asChild>
                                    <Button variant="outline">Cancel</Button>
                                  </AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetPassword(user)} disabled={busyId === user.id}>Send Reset Email</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button variant="destructive" size="sm" onClick={() => handleInitiateDelete(user)} disabled={busyId === user.id}>
                              <Trash2 className="h-4 w-4" />
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

        {/* Password Confirmation Dialog for Delete User */}
        {userToDelete && (
          <PasswordConfirmDialog
            open={isDeleteConfirmOpen}
            onOpenChange={setIsDeleteConfirmOpen}
            title={`Confirm Deletion of ${userToDelete.full_name}`}
            description={`This action cannot be undone. This will permanently delete ${userToDelete.full_name}'s profile and associated authentication record. Please enter your password to confirm.`}
            confirmLabel="Delete User"
            onConfirm={handleDeleteUserConfirmed}
            isConfirming={busyId === userToDelete.id}
            variant="destructive"
          />
        )}

        {/* Password Confirmation Dialog for Purge Demo Users */}
        <PasswordConfirmDialog
          open={isPurgeDemoConfirmOpen}
          onOpenChange={setIsPurgeDemoConfirmOpen}
          title="Confirm Purge Demo Users"
          description="This action cannot be undone. This will permanently delete all user profiles and associated authentication records marked as demo. Please enter your password to confirm."
          confirmLabel="Purge Demo Users"
          onConfirm={handlePurgeDemoUsersConfirmed}
          isConfirming={purging}
          variant="destructive"
        />

        {/* Password Confirmation Dialog for Purge All Non-Admin Users */}
        <PasswordConfirmDialog
          open={isPurgeAllNonAdminConfirmOpen}
          onOpenChange={setIsPurgeAllNonAdminConfirmOpen}
          title="Confirm Purge All Non-Admin Users"
          description="This action cannot be undone. This will permanently delete all user profiles and associated authentication records that are not 'admin' role in this tenant. Please enter your password to confirm."
          confirmLabel="Purge All Non-Admin Users"
          onConfirm={handlePurgeAllNonAdminUsersConfirmed}
          isConfirming={purgingAll}
          variant="destructive"
        />
      </div>
    </div>
  );
};

export default AdminUsersPage;