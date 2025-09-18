"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/api/notifications';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabaseClient';
import { Notification } from '@/utils/mockData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getProfiles } from '@/lib/api/profiles';

const NotificationBell: React.FC = () => {
  const { user, userRole, profile: currentUserProfile, isOfficeOrAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery<Notification[], Error>({
    queryKey: ['notifications', user?.id],
    queryFn: getNotifications,
    enabled: !!user && isOfficeOrAdmin,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  });

  // Fetch all profiles to get avatar_urls for notification actors
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['allProfilesForNotifications', currentUserProfile?.org_id],
    queryFn: () => getProfiles(currentUserProfile!.org_id!, userRole),
    enabled: !!currentUserProfile?.org_id && !!userRole,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('New notification received via realtime:', payload);
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsReadMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsReadMutation.mutate(notification.id);
    }
    if (notification.link_to) {
      navigate(notification.link_to);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 bg-white shadow-lg rounded-md" align="end">
        <DropdownMenuLabel className="flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => markAllAsReadMutation.mutate()}>
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <DropdownMenuItem disabled>No notifications yet.</DropdownMenuItem>
        ) : (
          notifications.map(notification => {
            const actor = allProfiles.find(p => p.id === notification.user_id);
            const actorInitials = actor?.full_name ? actor.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '??';

            return (
              <DropdownMenuItem
                key={notification.id}
                className={cn("flex items-start gap-2 cursor-pointer p-2", !notification.is_read && "bg-blue-50")}
                onClick={() => handleNotificationClick(notification)}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {actor?.avatar_url ? (
                    <AvatarImage src={actor.avatar_url} alt={actor.full_name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      <UserIcon className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col flex-grow">
                  <p className="font-semibold text-sm">{notification.title}</p>
                  <p className="text-xs text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400 self-end mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;