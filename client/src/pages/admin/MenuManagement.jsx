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
        const res = await api.get('/api/menu/today');
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
        const res = await api.get(`/api/menu/ratings/stats?date=${today}`);
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
      const res = await api.get(`/api/menu/date?date=${normalizeDateInput(selectedDate)}`);
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
    setEditMenu(prev => {
      const updated = { ...prev };
      // Case-insensitive check for duplicates
      const normalizedValue = value.toLowerCase();
      const normalizedItems = updated[meal].map(item => item.toLowerCase());
      if (normalizedItems.includes(normalizedValue)) {
        toast.error('Item already exists');
        return updated;
      }
      updated[meal].push(value);
      return { ...updated };
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
      await api.post('/api/menu/date', {
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
    setModalEditMenu(prev => {
      const updated = { ...prev };
      // Case-insensitive check for duplicates
      const normalizedValue = value.toLowerCase();
      const normalizedItems = updated[meal].map(item => item.toLowerCase());
      if (normalizedItems.includes(normalizedValue)) {
        toast.error('Item already exists');
        return updated;
      }
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
      await api.post('/api/menu/date', {
        date: getTodayISOString(),
        meals: modalEditMenu
      });
      toast.success("Today's menu updated!");
      // Refetch today's menu to update card
      const res = await api.get('/api/menu/today');
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
    <div className="w-full bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 mt-4 sm:mt-8">
      {/* Today's Menu Section (Read-only, with Update button) */}
      <div className="mb-6 sm:mb-8">
        <div className="bg-green-50 rounded-lg p-4 sm:p-6 shadow-sm border border-green-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div>
              <h2 className="font-bold text-green-900 text-lg sm:text-xl">Today's Menu</h2>
              <p className="text-green-700 text-sm mt-1">Current menu for today's meals</p>
            </div>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              onClick={openTodayModal}
              disabled={loadingToday}
            >
              Update Menu
            </button>
          </div>
          {loadingToday ? (
            <div className="text-gray-500 text-sm">Loading today's menu...</div>
          ) : todaysMenu ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['breakfast', 'lunch', 'dinner'].map(meal => {
                const mealItems = todaysMenu.meals[meal];
                const stats = ratingStats && ratingStats[meal] ? ratingStats[meal] : null;
                return (
                  <div key={meal} className="bg-white rounded-lg p-3 border border-green-200 relative flex flex-col min-h-[120px]">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-green-800 text-lg flex items-center gap-2 capitalize">
                        {meal === 'breakfast' && '🥞'}
                        {meal === 'lunch' && '🍛'}
                        {meal === 'dinner' && '🍽️'}
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </h3>
                      <div className="ml-2 text-right">
                        {stats && stats.totalRatings > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-base font-bold text-yellow-600">{stats.average}/5 <span className="text-yellow-500">⭐</span></span>
                            <span className="text-xs text-gray-500">{stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">No ratings yet</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      {mealItems.length ? mealItems.join(', ') : <span className="text-gray-400">No items</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-gray-400 text-sm">No menu set for today.</div>
              <button
                className="mt-2 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                onClick={openTodayModal}
              >
                Create Today's Menu
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Menu Management Column - Takes 2/3 of the space on large screens */}
        <div className="xl:col-span-3">
          <div className="bg-blue-50 rounded-lg p-4 sm:p-6 shadow-sm border border-blue-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-blue-900">Menu Management</h2>
                <p className="text-gray-600 text-sm sm:text-base mt-1">Set the food menu for any day. You can add, edit, or remove items for breakfast, lunch, and dinner.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <label className="font-medium text-sm sm:text-base">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border px-3 py-2 rounded shadow-sm text-sm sm:text-base"
              />
            </div>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {/* Grid layout for all screen sizes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {MEALS.map(meal => (
                  <div key={meal} className="bg-white rounded-lg p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3 capitalize flex items-center gap-2">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'dinner' && '🍽️'}
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h3>
                    <div className="space-y-2 mb-3">
                      {editMenu[meal].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <span className="text-sm text-gray-700">{item}</span>
                          <button
                            className="text-red-500 hover:text-red-700 text-lg font-bold"
                            onClick={() => handleRemoveItem(meal, idx)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {editMenu[meal].length === 0 && (
                        <div className="text-gray-400 text-sm text-center py-2">No items added</div>
                      )}
                    </div>
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleAddItem(meal);
                      }}
                      className="flex flex-col gap-2 mt-2"
                    >
                      <input
                        type="text"
                        placeholder={`Add ${meal} item`}
                        value={addInputs[meal] || ''}
                        onChange={e => handleAddInputChange(meal, e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="submit"
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors mt-1"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base disabled:opacity-50"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save Menu
                </button>
                <button
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  onClick={fetchMenu}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

      {/* Modal for editing today's menu */}
      {showTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-2 sm:px-0">
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={closeTodayModal}
              disabled={savingToday}
            >
              &times;
            </button>
            <h3 className="text-base sm:text-lg font-bold mb-4 text-green-900">Edit Today's Menu</h3>
            {MEALS.map(meal => (
              <div key={meal} className="mb-3">
                <div className="font-semibold capitalize mb-1 text-sm sm:text-base">{meal}</div>
                <ul className="mb-1">
                  {modalEditMenu[meal].map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 mb-1">
                      <span>{item}</span>
                      <button
                        className="text-xs text-red-500 hover:underline"
                        onClick={() => handleModalRemoveItem(meal, idx)}
                        disabled={savingToday}
                      >Remove</button>
                    </li>
                  ))}
                </ul>
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
                    className="border px-2 py-1 rounded text-xs sm:text-sm flex-1"
                    disabled={savingToday}
                  />
                  <button type="submit" className="px-2 py-1 bg-green-500 text-white rounded text-xs" disabled={savingToday}>Add</button>
                </form>
              </div>
            ))}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-xs sm:text-base"
                onClick={handleModalSave}
                disabled={savingToday}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs sm:text-base"
                onClick={closeTodayModal}
                disabled={savingToday}
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