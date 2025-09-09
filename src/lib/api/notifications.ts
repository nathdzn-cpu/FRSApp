import { supabase } from '../supabaseClient';
import { Notification } from '@/utils/mockData';

export const getNotifications = async (): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error fetching notifications:", error);
    throw new Error(error.message);
  }
  return data as Notification[];
};

export const markNotificationAsRead = async (notificationId: string): Promise<Notification> => {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error("Error marking notification as read:", error);
    throw new Error(error.message);
  }
  return data as Notification;
};

export const markAllNotificationsAsRead = async (): Promise<Notification[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("User not found");

  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)
    .select();

  if (error) {
    console.error("Error marking all notifications as read:", error);
    throw new Error(error.message);
  }
  return data as Notification[];
};