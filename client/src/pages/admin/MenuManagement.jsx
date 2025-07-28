import React, { useEffect, useState, useRef } from 'react';
import api from '../../utils/axios';
import { toast } from 'react-hot-toast';

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

  // Fetch rating statistics for today
  useEffect(() => {
    const fetchRatingStats = async () => {
      setLoadingStats(true);
      try {
        const today = getTodayISOString();
        const res = await api.get(`/api/cafeteria/menu/ratings/stats?date=${today}`);
        setRatingStats(res.data.data);
      } catch (err) {
        // 404 is expected when no menu exists for today
        if (err.response?.status !== 404) {
          console.error('Error fetching rating stats:', err);
        }
        setRatingStats(null);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchRatingStats();
  }, []);

  // Fetch menu for selected date
  useEffect(() => {
    if (isMounted.current) {
      fetchMenu();
    }
  }, [selectedDate]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/cafeteria/menu/date?date=${normalizeDateInput(selectedDate)}`);
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
      await api.post('/api/cafeteria/menu/date', {
        date: normalizeDateInput(selectedDate),
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
      await api.post('/api/cafeteria/menu/date', {
        date: getTodayISOString(),
        meals: modalEditMenu
      });
      toast.success("Today's menu updated!");
      // Refetch today's menu to update card
      const res = await api.get('/api/cafeteria/menu/today');
      setTodaysMenu(res.data.data);
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
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Cafeteria Management</h1>
            <p className="text-gray-600 mt-1">Manage daily menus and meal schedules</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={openTodayModal}
              disabled={loadingToday}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Update Today's Menu
            </button>
          </div>
        </div>
      </div>

      {/* Today's Menu Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Today's Menu</h2>
          {todaysMenu && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>
        
        {loadingToday ? (
          <div className="text-center py-8 text-gray-500">Loading today's menu...</div>
        ) : todaysMenu ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['breakfast', 'lunch', 'dinner'].map(meal => {
              const mealItems = todaysMenu.meals[meal];
              const stats = ratingStats && ratingStats[meal] ? ratingStats[meal] : null;
              return (
                <div key={meal} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 capitalize">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'dinner' && '🍽️'}
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h3>
                    {stats && stats.totalRatings > 0 && (
                      <div className="text-right">
                        <span className="text-sm font-bold text-yellow-600">{stats.average}/5 ⭐</span>
                        <div className="text-xs text-gray-500">{stats.totalRatings} ratings</div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-700">
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
      </div>

      {/* Menu Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Management</h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-6">
            {/* Meal Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {MEALS.map(meal => (
                <div key={meal} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 capitalize">
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
        )}
      </div>

      {/* Modal for editing today's menu */}
      {showTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Today's Menu</h3>
              <button
                onClick={closeTodayModal}
                disabled={savingToday}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              {MEALS.map(meal => (
                <div key={meal} className="space-y-3">
                  <h4 className="font-semibold text-gray-900 capitalize flex items-center gap-2">
                    {meal === 'breakfast' && '🥞'}
                    {meal === 'lunch' && '🍛'}
                    {meal === 'dinner' && '🍽️'}
                    {meal}
                  </h4>
                  
                  {/* Items List */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {modalEditMenu[meal].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                        <span className="text-sm text-gray-700">{item}</span>
                        <button
                          onClick={() => handleModalRemoveItem(meal, idx)}
                          disabled={savingToday}
                          className="text-red-500 hover:text-red-700 text-sm"
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
                    className="flex gap-2"
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
            
            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
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