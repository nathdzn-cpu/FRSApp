"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Profile, Organisation } from '@/utils/mockData';
import { useAuth } from '@/context/AuthContext';
import { uploadAvatar, updateProfile } from '@/lib/api/profiles';
import { getOrganisationDetails } from '@/lib/api/organisation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, Copy } from 'lucide-react';
import { format } from 'date-fns';

interface UserProfileSectionProps {
  profile: Profile;
}

const UserProfileSection: React.FC<UserProfileSectionProps> = ({ profile }) => {
  const { user, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: organisation } = useQuery<Organisation | null>({
    queryKey: ['organisation', profile.org_id],
    queryFn: () => getOrganisationDetails(profile.org_id!),
    enabled: !!profile.org_id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (file: File) => {
      const avatarUrl = await uploadAvatar(profile.id, file);
      const urlWithCacheBuster = `${avatarUrl}?t=${new Date().getTime()}`;
      return updateProfile(profile.id, { avatar_url: urlWithCacheBuster });
    },
    onSuccess: () => {
      toast.success('Profile picture updated!');
      refreshProfile();
    },
    onError: (error: any) => {
      toast.error(`Upload failed: ${error.message}`);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB.');
      return;
    }

    setIsUploading(true);
    updateProfileMutation.mutate(file);
  };

  const userInitials = profile.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const copyToClipboard = () => {
    if (organisation?.display_id) {
      navigator.clipboard.writeText(organisation.display_id);
      toast.success('Organisation Key copied to clipboard!');
    }
  };

  return (
    <Card className="bg-[var(--saas-card-bg)] shadow-sm rounded-xl p-6">
      <CardHeader className="p-0 pb-4">
        <CardTitle className="text-2xl font-bold text-gray-900">Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col items-center md:items-start space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} className="object-cover" />
            <AvatarFallback className="text-3xl">{userInitials}</AvatarFallback>
          </Avatar>
          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/png, image/jpeg"
            disabled={isUploading}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Change Picture
          </Button>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-gray-500">Full Name</p>
            <p className="text-gray-800">{profile.full_name}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Role</p>
            <p className="text-gray-800 capitalize">{profile.role}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Email</p>
            <p className="text-gray-800">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Phone</p>
            <p className="text-gray-800">{profile.phone || 'N/A'}</p>
          </div>
          <div>
            <p className="font-medium text-gray-500">Date of Birth</p>
            <p className="text-gray-800">{profile.dob ? format(new Date(profile.dob), 'PPP') : 'N/A'}</p>
          </div>
          {organisation?.display_id && (
            <div>
              <p className="font-medium text-gray-500">Organisation Key</p>
              <div className="flex items-center gap-2">
                <p className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">{organisation.display_id}</p>
                <Button type="button" variant="ghost" size="icon" onClick={copyToClipboard} className="h-8 w-8">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UserProfileSection;