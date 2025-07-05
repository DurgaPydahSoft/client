import React, { useEffect } from 'react';

const Notifications = () => {
  useEffect(() => {
    fetchNotifications();
    const handler = () => fetchNotifications();
    window.addEventListener('refresh-notifications', handler);
    const pollInterval = setInterval(fetchNotifications, 30000); // 30 seconds
    return () => {
      window.removeEventListener('refresh-notifications', handler);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    // Rest of the component code
  );
};

export default Notifications; 