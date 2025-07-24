import React, { useEffect, useState } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedAnnouncements, setExpandedAnnouncements] = useState(new Set());

  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [user]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/announcements');
      if (res.data.success) {
        setAnnouncements(res.data.data);
      } else {
        throw new Error(res.data.message || 'Failed to fetch announcements');
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
      if (err.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to fetch announcements. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (announcementId) => {
    setExpandedAnnouncements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(announcementId)) {
        newSet.delete(announcementId);
      } else {
        newSet.add(announcementId);
      }
      return newSet;
    });
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center p-8 bg-gray-50 rounded-lg shadow-sm border border-gray-100">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <p className="text-gray-600 font-medium">Please log in to view announcements</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[100vw] px-2 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 mt-12 sm:mt-0 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg sm:rounded-xl md:rounded-2xl shadow-lg shadow-blue-100">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
              Announcements
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Stay updated with the latest announcements</p>
          </div>
        </div>

        {error ? (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-3 sm:p-4 md:p-6 text-red-700 flex items-start gap-2 sm:gap-3 md:gap-4">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-semibold mb-1 text-sm sm:text-base">Error</h3>
              <p className="text-xs sm:text-sm md:text-base">{error}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:gap-6">
            {announcements.map((a) => (
              <div 
                key={a._id} 
                className="bg-white rounded-lg sm:rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-3 sm:p-4 md:p-6 border border-gray-100 hover:border-blue-100 transform hover:-translate-y-1 overflow-hidden"
              >
                {a.imageUrl && (
                  <div className="relative w-full pt-[56.25%] mb-3 sm:mb-4 overflow-hidden rounded-lg">
                    <img
                      src={a.imageUrl}
                      alt={a.title}
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300 max-w-full"
                      style={{ maxWidth: '100%', height: 'auto' }}
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg md:text-xl font-semibold text-blue-900 flex items-center gap-2 mb-1 sm:mb-2 md:mb-0">
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                      <span className="truncate">{a.title}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500 bg-gray-50 px-2 sm:px-3 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="truncate">{new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="prose prose-blue max-w-none text-xs sm:text-sm md:text-base text-gray-600">
                  {(() => {
                    const isExpanded = expandedAnnouncements.has(a._id);
                    const description = a.description;
                    const shouldTruncate = description.length > 150;
                    
                    if (shouldTruncate && !isExpanded) {
                      return (
                        <div>
                          <p className="mb-2 sm:mb-3 leading-relaxed break-words whitespace-pre-wrap">
                            {truncateText(description)}
                          </p>
                          <button
                            onClick={() => toggleExpanded(a._id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm transition-colors duration-200"
                          >
                            Read More
                          </button>
                        </div>
                      );
                    } else if (shouldTruncate && isExpanded) {
                      return (
                        <div>
                          {description.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 sm:mb-3 last:mb-0 leading-relaxed break-words whitespace-pre-wrap">{line}</p>
                          ))}
                          <button
                            onClick={() => toggleExpanded(a._id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs sm:text-sm transition-colors duration-200 mt-2"
                          >
                            Read Less
                          </button>
                        </div>
                      );
                    } else {
                      return (
                        <div>
                          {description.split('\n').map((line, i) => (
                            <p key={i} className="mb-2 sm:mb-3 last:mb-0 leading-relaxed break-words whitespace-pre-wrap">{line}</p>
                          ))}
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center py-6 sm:py-8 bg-gray-50 rounded-lg border border-gray-200">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
                <p className="text-gray-600 text-sm sm:text-base">No announcements available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;