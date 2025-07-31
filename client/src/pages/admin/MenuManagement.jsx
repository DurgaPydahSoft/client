import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

// Add CSS for line-clamp utility
const lineClampStyle = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = lineClampStyle;
  document.head.appendChild(style);
}

const MEALS = ['breakfast', 'lunch', 'dinner'];

function normalizeDateInput(date) {
  // Always return UTC midnight in ISO format
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

const getTodayISOString = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString();
};

// Helper function to format date consistently for API calls
const formatDateForAPI = (dateString) => {
  const d = new Date(dateString);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
};

const MenuManagement = () => {
  // Store selectedDate as 'YYYY-MM-DD' string
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMenu, setEditMenu] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [addInputs, setAddInputs] = useState({}); // { meal: value }

  // Today's menu state
  const [todaysMenu, setTodaysMenu] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [modalEditMenu, setModalEditMenu] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [modalAddInputs, setModalAddInputs] = useState({});
  const [savingToday, setSavingToday] = useState(false);

  // Rating statistics state
  const [ratingStats, setRatingStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsDate, setStatsDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Menu notification state
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [lastNotificationSent, setLastNotificationSent] = useState(null);

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch today's menu on mount
  useEffect(() => {
    const fetchTodaysMenu = async () => {
      setLoadingToday(true);
      try {
        const res = await api.get('/api/cafeteria/menu/today');
        setTodaysMenu(res.data.data);
      } catch (err) {
        // 404 is expected when no menu exists for today
        if (err.response?.status !== 404) {
          console.error('Error fetching today\'s menu:', err);
        }
        setTodaysMenu(null);
      } finally {
        setLoadingToday(false);
      }
    };
    fetchTodaysMenu();
  }, []);

  // Fetch rating statistics for selected date
  useEffect(() => {
    const fetchRatingStats = async () => {
      setLoadingStats(true);
      try {
        const formattedDate = formatDateForAPI(statsDate);
        console.log('📊 Fetching rating stats for date:', statsDate, 'formatted:', formattedDate);
        const res = await api.get(`/api/cafeteria/menu/ratings/stats?date=${formattedDate}`);
        setRatingStats(res.data.data);
      } catch (err) {
        // 404 is expected when no menu or ratings exist for the date
        if (err.response?.status !== 404) {
          console.error('Error fetching rating stats:', err);
        }
        setRatingStats(null);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchRatingStats();
  }, [statsDate]);

  // Fetch menu for selected date
  useEffect(() => {
    if (isMounted.current) {
      fetchMenu();
    }
  }, [selectedDate]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      console.log('🍽️ Fetching menu for date:', selectedDate, 'formatted:', formattedDate);
      const res = await api.get(`/api/cafeteria/menu/date?date=${formattedDate}`);
      if (isMounted.current) {
        setMenu(res.data.data);
        setEditMenu({ ...res.data.data.meals });
        setAddInputs({});
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (isMounted.current) {
          setMenu(null);
          setEditMenu({ breakfast: [], lunch: [], dinner: [] });
          setAddInputs({});
        }
      } else {
        toast.error('Failed to fetch menu');
        console.error(err);
        if (isMounted.current) {
          setMenu(null);
          setEditMenu({ breakfast: [], lunch: [], dinner: [] });
          setAddInputs({});
        }
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAddInputChange = (meal, value) => {
    setAddInputs(prev => ({ ...prev, [meal]: value }));
  };

  const handleAddItem = (meal) => {
    const value = (addInputs[meal] || '').trim();
    if (!value) return;
    
    // Check for duplicates in current state
    const currentItems = editMenu[meal] || [];
    const normalizedValue = value.toLowerCase();
    const normalizedItems = currentItems.map(item => item.toLowerCase());
    
    if (normalizedItems.includes(normalizedValue)) {
      toast.error('Item already exists');
      return;
    }
    
    setEditMenu(prev => {
      const updated = { ...prev };
      updated[meal] = [...updated[meal], value];
      return updated;
    });
    setAddInputs(prev => ({ ...prev, [meal]: '' }));
  };

  const handleRemoveItem = (meal, idx) => {
    setEditMenu(prev => {
      const updated = { ...prev };
      updated[meal].splice(idx, 1);
      return { ...updated };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const formattedDate = formatDateForAPI(selectedDate);
      await api.post('/api/cafeteria/menu/date', {
        date: formattedDate,
        meals: editMenu
      });
      toast.success('Menu saved!');
      fetchMenu();
    } catch (err) {
      toast.error('Failed to save menu');
    } finally {
      setLoading(false);
    }
  };

  // Modal handlers for editing today's menu
  const openTodayModal = () => {
    setModalEditMenu(todaysMenu ? { ...todaysMenu.meals } : { breakfast: [], lunch: [], dinner: [] });
    setModalAddInputs({});
    setShowTodayModal(true);
  };
  const closeTodayModal = () => {
    setShowTodayModal(false);
  };
  const handleModalAddInputChange = (meal, value) => {
    setModalAddInputs(prev => ({ ...prev, [meal]: value }));
  };
  const handleModalAddItem = (meal) => {
    const value = (modalAddInputs[meal] || '').trim();
    if (!value) return;
    
    // Check for duplicates in current state
    const currentItems = modalEditMenu[meal] || [];
    const normalizedValue = value.toLowerCase();
    const normalizedItems = currentItems.map(item => item.toLowerCase());
    
    if (normalizedItems.includes(normalizedValue)) {
      toast.error('Item already exists');
      return;
    }
    
    setModalEditMenu(prev => {
      const updated = { ...prev };
      updated[meal] = [...updated[meal], value];
      return updated;
    });
    setModalAddInputs(prev => ({ ...prev, [meal]: '' }));
  };
  const handleModalRemoveItem = (meal, idx) => {
    setModalEditMenu(prev => {
      const updated = { ...prev };
      updated[meal] = updated[meal].filter((_, i) => i !== idx);
      return updated;
    });
  };
  const handleModalSave = async () => {
    setSavingToday(true);
    try {
      const todayFormatted = formatDateForAPI(new Date().toISOString().slice(0, 10));
      await api.post('/api/cafeteria/menu/date', {
        date: todayFormatted,
        meals: modalEditMenu
      });
      toast.success("Today's menu updated!");
      // Refetch today's menu to update card
      const res = await api.get('/api/cafeteria/menu/today');
      setTodaysMenu(res.data.data);
      // Refresh rating stats for today
      setStatsDate(new Date().toISOString().slice(0, 10));
      setShowTodayModal(false);
    } catch (err) {
      toast.error("Failed to update today's menu");
    } finally {
      setSavingToday(false);
    }
  };

  // Menu notification handlers
  const handleSendMenuNotification = async (mealType) => {
    setNotificationLoading(true);
    try {
      const mealEmojis = {
        breakfast: '🥞',
        lunch: '🍛',
        dinner: '🍽️'
      };
      
      const mealNames = {
        breakfast: 'Breakfast',
        lunch: 'Lunch',
        dinner: 'Dinner'
      };

      const response = await api.post('/api/notifications/send-menu-all', {
        mealType,
        title: `${mealEmojis[mealType]} ${mealNames[mealType]} is Ready!`,
        message: `🍽️ check out today's menu! Tap to see what's cooking.`,
        url: '/student'
      });

      if (response.data.success) {
        toast.success(`${mealNames[mealType]} notification sent to ${response.data.count} students!`);
        setLastNotificationSent({
          mealType,
          timestamp: new Date(),
          count: response.data.count
        });
      }
    } catch (err) {
      console.error('Error sending menu notification:', err);
      toast.error(`Failed to send ${mealType} notification`);
    } finally {
      setNotificationLoading(false);
    }
  };

  const getNextMealTime = () => {
    const now = new Date();
    const hour = now.getHours();
    
    const mealTimes = [
      { meal: 'breakfast', hour: 7, emoji: '🥞', name: 'Breakfast' },
      { meal: 'lunch', hour: 12, emoji: '🍛', name: 'Lunch' },
      { meal: 'dinner', hour: 19, emoji: '🍽️', name: 'Dinner' }
    ];
    
    // Find next meal
    for (const meal of mealTimes) {
      if (hour < meal.hour) {
        return meal;
      }
    }
    
    // If all meals passed today, return breakfast tomorrow
    return mealTimes[0];
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6  mt-8">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-xl shadow-lg">
        <img 
          src="/menu.png" 
          alt="Traditional Indian Thali Meal" 
          className="w-full h-32 sm:h-40 md:h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Menu Management</h1>
            <p className="text-sm sm:text-base md:text-lg opacity-90">Manage daily menus and meal schedules</p>
          </div>
        </div>
      </div>

      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
          <button
            onClick={openTodayModal}
            disabled={loadingToday}
            className="px-6 py-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md"
          >
            {loadingToday ? 'Loading...' : 'Update Today\'s Menu'}
          </button>
        </div>
      </div>

      {/* Today's Menu Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Menu</h2>
          <div className="flex flex-wrap gap-2">
            {todaysMenu && (
              <>
                {['breakfast', 'lunch', 'dinner'].map(mealType => (
                  <button
                    key={mealType}
                    onClick={() => handleSendMenuNotification(mealType)}
                    disabled={notificationLoading}
                    className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    Send {mealType} Notification
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
        
        {loadingToday ? (
          <div className="text-center py-8 text-gray-500">Loading today's menu...</div>
        ) : todaysMenu ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {['breakfast', 'lunch', 'dinner'].map(meal => {
              const mealItems = todaysMenu.meals[meal];
              const stats = ratingStats && ratingStats[meal] ? ratingStats[meal] : null;
              return (
                <div key={meal} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 capitalize text-sm sm:text-base">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'dinner' && '🍽️'}
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h3>
                    {stats && stats.totalRatings > 0 && (
                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-bold text-yellow-600">{stats.average}/5 ⭐</span>
                        <div className="text-xs text-gray-500">{stats.totalRatings} ratings</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Menu Items */}
                  <div className="text-sm text-gray-700 mb-3">
                    {mealItems.length ? (
                      <div className="space-y-1">
                        {mealItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No items</span>
                    )}
                  </div>

                  {/* Rating Statistics */}
                  {loadingStats ? (
                    <div className="text-center py-2 text-gray-500 text-xs">Loading ratings...</div>
                  ) : stats && stats.totalRatings > 0 ? (
                    <div className="border-t pt-3">
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-gray-700">Rating Distribution:</span>
                          <span className="text-gray-500">{stats.average}/5 avg</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <div key={star} className="flex-1 text-center">
                              <div className="text-xs text-gray-600">{star}★</div>
                              <div className="text-xs font-medium text-gray-800">
                                {stats.ratingCounts[star] || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Recent Comments */}
                      {stats.comments && stats.comments.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-700 mb-1">Recent Comments:</div>
                          <div className="space-y-1 max-h-20 overflow-y-auto">
                            {stats.comments.slice(0, 3).map((comment, idx) => (
                              <div key={idx} className="text-xs bg-white rounded p-1 border">
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-yellow-500">{'★'.repeat(comment.rating)}</span>
                                  <span className="text-gray-500 text-xs">
                                    {new Date(comment.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="text-gray-700 line-clamp-2">{comment.comment}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : stats ? (
                    <div className="border-t pt-3 text-center text-gray-500 text-xs">
                      No ratings yet
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No menu set for today</div>
            <button
              onClick={openTodayModal}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
            >
              Create Today's Menu
            </button>
          </div>
        )}
        
        {/* Loading Stats Indicator */}
        {loadingStats && (
          <div className="mt-4 text-center py-2 text-gray-500 text-sm">
            Loading rating statistics...
          </div>
        )}
      </div>

      {/* Detailed Rating Statistics Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Rating Statistics</h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <label className="text-xs sm:text-sm text-gray-600 font-medium">Stats Date:</label>
              <input
                type="date"
                value={statsDate}
                onChange={e => setStatsDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Showing ratings for: {new Date(statsDate).toLocaleDateString()}
          </div>
        </div>
        
        {loadingStats ? (
          <div className="text-center py-8 text-gray-500">Loading rating statistics...</div>
        ) : ratingStats && Object.values(ratingStats).some(stats => stats.totalRatings > 0) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {['breakfast', 'lunch', 'dinner'].map(meal => {
              const stats = ratingStats[meal];
              if (!stats || stats.totalRatings === 0) return null;
              
              return (
                <div key={meal} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-3 sm:p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl sm:text-2xl">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'dinner' && '🍽️'}
                    </span>
                    <h3 className="font-semibold text-gray-900 capitalize text-sm sm:text-base">{meal}</h3>
                  </div>
                  
                  {/* Average Rating */}
                  <div className="text-center mb-3">
                    <div className="text-2xl font-bold text-yellow-600">{stats.average}/5</div>
                    <div className="text-sm text-gray-600">{stats.totalRatings} total ratings</div>
                  </div>
                  
                  {/* Rating Distribution */}
                  <div className="space-y-2 mb-3">
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = stats.ratingCounts[star] || 0;
                      const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <div className="flex items-center gap-1 w-8">
                            <span className="text-xs text-gray-600">{star}★</span>
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 w-8 text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Recent Comments */}
                  {stats.comments && stats.comments.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-2">Recent Comments:</div>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {stats.comments.slice(0, 5).map((comment, idx) => (
                          <div key={idx} className="bg-white rounded p-2 border border-yellow-200">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-yellow-500 text-xs">{'★'.repeat(comment.rating)}</span>
                              <span className="text-gray-500 text-xs">
                                {new Date(comment.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs text-gray-700 line-clamp-3">{comment.comment}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No rating data available for {new Date(statsDate).toLocaleDateString()}</div>
            <div className="text-sm text-gray-500">Students haven't rated any meals for this date yet.</div>
          </div>
        )}
      </div>

      {/* Menu Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Menu Management</h2>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : menu ? (
          <div className="space-y-6">
            {/* Meal Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {MEALS.map(meal => (
                <div key={meal} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 capitalize text-sm sm:text-base">
                    {meal === 'breakfast' && '🥞'}
                    {meal === 'lunch' && '🍛'}
                    {meal === 'dinner' && '🍽️'}
                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                  </h3>
                  
                  {/* Items List */}
                  <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                    {editMenu[meal].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                        <span className="text-gray-700 truncate">{item}</span>
                        <button
                          onClick={() => handleRemoveItem(meal, idx)}
                          className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {editMenu[meal].length === 0 && (
                      <div className="text-gray-400 text-sm text-center py-4">No items added</div>
                    )}
                  </div>
                  
                  {/* Add Item Form */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleAddItem(meal);
                    }}
                    className="space-y-2"
                  >
                    <input
                      type="text"
                      placeholder={`Add ${meal} item`}
                      value={addInputs[meal] || ''}
                      onChange={e => handleAddInputChange(meal, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Add Item
                    </button>
                  </form>
                </div>
              ))}
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save Menu
              </button>
              <button
                onClick={fetchMenu}
                disabled={loading}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reset Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No menu data available for {new Date(selectedDate).toLocaleDateString()}</div>
            <div className="text-sm text-gray-500">Create a new menu by adding items below.</div>
            <div className="mt-4 space-y-6">
              {/* Meal Sections for Empty State */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {MEALS.map(meal => (
                  <div key={meal} className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 capitalize text-sm sm:text-base">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'dinner' && '🍽️'}
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h3>
                    
                    {/* Items List */}
                    <div className="space-y-2 mb-4 max-h-32 overflow-y-auto">
                      {editMenu[meal].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white rounded px-3 py-2 text-sm">
                          <span className="text-gray-700 truncate">{item}</span>
                          <button
                            onClick={() => handleRemoveItem(meal, idx)}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {editMenu[meal].length === 0 && (
                        <div className="text-gray-400 text-sm text-center py-4">No items added</div>
                      )}
                    </div>
                    
                    {/* Add Item Form */}
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleAddItem(meal);
                      }}
                      className="space-y-2"
                    >
                      <input
                        type="text"
                        placeholder={`Add ${meal} item`}
                        value={addInputs[meal] || ''}
                        onChange={e => handleAddInputChange(meal, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                      >
                        Add Item
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  Save Menu
                </button>
                <button
                  onClick={fetchMenu}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Reset Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal for editing today's menu */}
      {showTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Edit Today's Menu</h3>
              <button
                onClick={closeTodayModal}
                disabled={savingToday}
                className="text-gray-500 hover:text-gray-700 text-xl sm:text-2xl p-1"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              {MEALS.map(meal => (
                <div key={meal} className="space-y-3">
                  <h4 className="font-semibold text-gray-900 capitalize flex items-center gap-2 text-sm sm:text-base">
                    {meal === 'breakfast' && '🥞'}
                    {meal === 'lunch' && '🍛'}
                    {meal === 'dinner' && '🍽️'}
                    {meal}
                  </h4>
                  
                  {/* Items List */}
                  <div className="space-y-2 max-h-24 sm:max-h-32 overflow-y-auto">
                    {modalEditMenu[meal].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-2 sm:px-3 py-2">
                        <span className="text-xs sm:text-sm text-gray-700 flex-1 mr-2">{item}</span>
                        <button
                          onClick={() => handleModalRemoveItem(meal, idx)}
                          disabled={savingToday}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm px-2 py-1 rounded hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Add Item Form */}
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleModalAddItem(meal);
                    }}
                    className="flex flex-col sm:flex-row gap-2"
                  >
                    <input
                      type="text"
                      placeholder={`Add to ${meal}`}
                      value={modalAddInputs[meal] || ''}
                      onChange={e => handleModalAddInputChange(meal, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={savingToday}
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                      disabled={savingToday}
                    >
                      Add
                    </button>
                  </form>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleModalSave}
                disabled={savingToday}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                onClick={closeTodayModal}
                disabled={savingToday}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement; 