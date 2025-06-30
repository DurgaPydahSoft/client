import React, { useEffect, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'

  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    return () => window.removeEventListener('refresh-notifications', handler);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/notifications/warden');
      setNotifications(res.data.data || res.data);
    } catch (err) {
      setError('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.patch(`/api/notifications/warden/${id}/read`);
      fetchNotifications(); // Refresh the list
    } catch (err) {
      setError('Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.patch('/api/notifications/warden/read-all');
      fetchNotifications(); // Refresh the list
    } catch (err) {
      setError('Failed to mark notifications as read');
    }
  };

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
          {notifications.some(n => !n.isRead) && (
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
      ) : notifications.length === 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg border text-sm text-center">
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-4">
          {notifications
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