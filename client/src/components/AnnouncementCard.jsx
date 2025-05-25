import React from 'react';
import { format } from 'date-fns';

const AnnouncementCard = ({ announcement }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {announcement.imageUrl && (
        <div className="relative h-48 w-full">
          <img
            src={announcement.imageUrl}
            alt={announcement.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {announcement.title}
        </h3>
        <p className="text-gray-600 mb-4">{announcement.description}</p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Posted by {announcement.createdBy?.name || 'Admin'}</span>
          <span>{format(new Date(announcement.createdAt), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementCard; 