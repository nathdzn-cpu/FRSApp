import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/context/UserRoleContext';
import { getUsersForAdmin, getProfiles, getTenants, deleteUser, resetUserPassword, purgeDemoUsers } from '@/lib/supabase';
import { Profile, Tenant } from '@/utils/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, UserPlus, Edit, Trash2, Mail, RefreshCw } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox

const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useUserRole();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'driver' | 'office' | 'admin'>('all');
  const [showDemo, setShowDemo] = useState(false); // New state for toggling demo users
  const [profiles, setProfiles] = useState<Profile[]>([]); // For currentProfile
  const [busyId, setBusyId] = useState<string | null>(null); // To disable buttons during action
  const [purging, setPurging] = useState(false); // State for purge button

  const currentTenantId = 'demo-tenant-id'; // Hardcoded for mock data
  const currentUserId = userRole === 'admin' ? 'auth_user_alice' : userRole === 'office' ? 'auth_user_owen' : userRole === 'driver' ? 'auth_user_dave' : 'unknown';
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
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(err.message || "Failed to load users. Please try again.");
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

  const handleResetPassword = async (user: Profile) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot reset password.");
      return;
    }
    try {
      setBusyId(user.id);
      const promise = resetUserPassword(currentTenantId, user.user_id, currentProfile.id);
      toast.promise(promise, {
        loading: `Sending password reset to ${user.full_name}...`,
        success: `Password reset email sent to ${user.full_name}! (Simulated)`,
        error: `Failed to send password reset to ${user.full_name}.`,
      });
      await promise;
    } catch (err: any) {
      console.error("Error sending password reset:", err);
      toast.error("An unexpected error occurred while sending password reset.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (user: Profile) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot delete user.");
      return;
    }
    try {
      setBusyId(user.id);
      const promise = deleteUser(currentTenantId, user.id, currentProfile.id);
      toast.promise(promise, {
        loading: `Deleting ${user.full_name}...`,
        success: `${user.full_name} deleted successfully! (Simulated)`,
        error: `Failed to delete ${user.full_name}.`,
      });
      const result = await promise;
      if (result) {
        fetchUsers(); // Refresh the list after successful deletion
      } else {
        toast.error(`Failed to delete ${user.full_name}: User not found or could not be deleted.`);
      }
    } catch (err: any) {
      console.error("Error deleting user:", err);
      toast.error("An unexpected error occurred while deleting user.");
    } finally {
      setBusyId(null);
    }
  };

  const handlePurgeDemoUsers = async () => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot purge demo users.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete ALL demo users in this tenant (Auth + profiles)? This action cannot be undone.")) {
      return;
    }

    setPurging(true);
    try {
      const result = await purgeDemoUsers(currentTenantId, currentProfile.id);
      if (result.ok) {
        toast.success(`Removed ${result.removed} demo user(s).`);
        fetchUsers(); // Refresh the list after purge
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

  const filteredUsers = useMemo(() => {
    let r = users;
    if (!showDemo) r = r.filter(x => !x.is_demo); // Filter out demo users if showDemo is false
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
  }, [users, searchTerm, filterRole, showDemo]); // Add showDemo to dependencies

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
        <p className="text-red-500 text-lg mb-4">Error: {error}</p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  if (userRole !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
        <p className="text-red-500 text-lg mb-4">Access denied</p>
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
            <div className="flex space-x-2">
              <Button onClick={fetchUsers} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh
              </Button>
              <Button onClick={() => navigate('/admin/users/new')}>
                <UserPlus className="h-4 w-4 mr-2" /> Add New User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
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
                <Label htmlFor="show-demo">Show demo users</Label>
              </div>
              <Button
                variant="destructive"
                onClick={handlePurgeDemoUsers}
                disabled={purging}
                className="w-full sm:w-auto"
              >
                {purging ? "Purging..." : "Purge Demo Users"}
              </Button>
            </div>

            {filteredUsers.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No users found matching your criteria.</p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>User ID (Auth)</TableHead>
                      <TableHead>Truck Reg</TableHead>
                      <TableHead>Trailer No</TableHead>
                      <TableHead>Flags</TableHead> {/* New column for flags */}
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map(user => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell>{user.phone || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{user.user_id}</TableCell>
                        <TableCell>{user.truck_reg || '-'}</TableCell>
                        <TableCell>{user.trailer_no || '-'}</TableCell>
                        <TableCell>{user.is_demo ? <Badge variant="outline">Demo</Badge> : '-'}</TableCell> {/* Display demo flag */}
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
                                  <AlertDialogTitle>Reset Password for {user.full_name}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will send a password reset email to the user's registered email address (simulated).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleResetPassword(user)} disabled={busyId === user.id}>Send Reset Email</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" disabled={busyId === user.id}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the user profile (simulated).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteUser(user)} disabled={busyId === user.id}>Delete User</AlertDialogAction>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUsersPage;