import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import notificationManager from '../utils/notificationManager';

export const useOneSignal = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const updateStatus = () => {
      const currentStatus = notificationManager.getStatus();
      setStatus(currentStatus);
      setIsLoading(false);
    };

    // Initial status check
    updateStatus();

    // Set up periodic status checks
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      const results = await notificationManager.requestPermission();
      setStatus(notificationManager.getStatus());
      return results;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendNotification = useCallback(async (notificationData) => {
    try {
      setIsLoading(true);
      const result = await notificationManager.sendNotification(notificationData);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await notificationManager.sendTestNotification();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendSegmentNotification = useCallback(async (segment, notificationData) => {
    try {
      setIsLoading(true);
      const result = await notificationManager.sendNotificationToSegment(segment, notificationData);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const areNotificationsEnabled = useCallback(async () => {
    try {
      return await notificationManager.areNotificationsEnabled();
    } catch (error) {
      setError(error.message);
      return false;
    }
  }, []);

  return {
    // State
    status,
    isLoading,
    error,
    
    // Actions
    requestPermission,
    sendNotification,
    sendTestNotification,
    sendSegmentNotification,
    areNotificationsEnabled,
    
    // Computed values
    isOneSignalActive: status?.oneSignal || false,
    isLegacyActive: status?.legacy || false,
    isSocketActive: status?.socket || false,
    isInitialized: status?.isInitialized || false,
    hasUser: !!user,
    
    // Helper functions
    clearError: () => setError(null)
  };
}; 