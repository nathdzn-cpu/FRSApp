"use client";

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useNotifications = () => {
  const navigate = useNavigate();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }
    if (Notification.permission !== 'denied') {
      await Notification.requestPermission();
    }
  }, []);

  const showNotification = useCallback((title: string, options: NotificationOptions & { jobOrderNumber?: string }) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, options);
      if (options.jobOrderNumber) {
        notification.onclick = () => {
          navigate(`/jobs/${options.jobOrderNumber}`);
          window.focus();
        };
      }
    }
  }, [navigate]);

  return { requestPermission, showNotification };
};