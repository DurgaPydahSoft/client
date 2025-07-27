import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    fetchNotifications();
    
    // TEMPORARILY DISABLED: Notification polling for warden to prevent 500 errors
    console.log('🔔 Warden Notifications: Polling temporarily disabled');
    
    // ORIGINAL CODE (commented out):
    /*
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    const pollInterval = setInterval(fetchNotifications, 30000); // 30 seconds
    return () => {
      window.removeEventListener('refresh-notifications', handler);
      clearInterval(pollInterval);
    };
    */
    
    return () => {
      // Cleanup function (empty for now)
    };
  }, []);

  const fetchNotifications = async () => {
    // TEMPORARILY DISABLED: Notification API calls for warden to prevent 500 errors
    console.log('🔔 Warden Notifications: API calls temporarily disabled');
    setLoading(true);
    setError(null);
    
    // Simulate loading delay
    setTimeout(() => {
      setNotifications([]); // Set empty array
      setError('Notifications temporarily disabled for warden role');
      setLoading(false);
    }, 500);
    
    return;
    
    // ORIGINAL CODE (commented out):
    /*
    try {
      const res = await api.get('/api/notifications/warden');
      // Ensure notifications is always an array
      const notificationsData = res.data.data || res.data || [];
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (err) {
      setError('Failed to fetch notifications');
      setNotifications([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
    */
  };

  const markAsRead = async (id) => {
    // TEMPORARILY DISABLED: Notification actions for warden to prevent 500 errors
    console.log('🔔 Warden Notifications: Mark as read temporarily disabled');
    setError('Notifications temporarily disabled for warden role');
    return;
    
    // ORIGINAL CODE (commented out):
    /*
    try {
      await api.patch(`/api/notifications/warden/${id}/read`);
      fetchNotifications(); // Refresh the list
    } catch (err) {
      setError('Failed to mark notification as read');
    }
    */
  };

  const markAllAsRead = async () => {
    // TEMPORARILY DISABLED: Notification actions for warden to prevent 500 errors
    console.log('🔔 Warden Notifications: Mark all as read temporarily disabled');
    setError('Notifications temporarily disabled for warden role');
    return;
    
    // ORIGINAL CODE (commented out):
    /*
    try {
      await api.patch('/api/notifications/warden/read-all');
      fetchNotifications(); // Refresh the list
    } catch (err) {
      setError('Failed to mark notifications as read');
    }
    */
  };

  // Ensure notifications is always an array before using array methods
  const notificationsArray = Array.isArray(notifications) ? notifications : [];
  const hasUnreadNotifications = notificationsArray.some(n => !n.isRead);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-900">Notifications</h2>
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          {hasUnreadNotifications && (
            <button
              onClick={() => markAllAsRead()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : notificationsArray.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg border text-sm text-center">
          {error === 'Notifications temporarily disabled for warden role' ? (
            <div className="text-orange-600">
              <p className="font-semibold mb-2">🔔 Notifications Temporarily Disabled</p>
              <p className="text-sm">Notification functionality is temporarily disabled for warden role to prevent server errors.</p>
              <p className="text-xs mt-2 text-gray-500">This will be re-enabled once the backend issues are resolved.</p>
            </div>
          ) : (
            'No notifications yet.'
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {notificationsArray
            .filter(n => filter === 'all' ? true : filter === 'unread' ? !n.isRead : n.isRead)
            .map(n => (
              <div 
                key={n._id} 
                className={`p-4 rounded-lg border transition-all ${
                  n.isRead ? 'bg-white' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{n.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    n.isRead ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {n.isRead ? 'Read' : 'New'}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-2">{n.message}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {!n.isRead && (
                    <button
                      onClick={() => markAsRead(n._id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications; 