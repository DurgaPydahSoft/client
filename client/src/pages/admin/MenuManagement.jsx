import React, { useEffect, useState } from 'react';
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

  // Fetch today's menu on mount
  useEffect(() => {
    const fetchTodaysMenu = async () => {
      setLoadingToday(true);
      try {
        const res = await api.get('/api/menu/today');
        setTodaysMenu(res.data.data);
      } catch (err) {
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
        const res = await api.get('/api/menu/ratings/stats');
        setRatingStats(res.data.data);
      } catch (err) {
        setRatingStats(null);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchRatingStats();
  }, []);

  // Fetch menu for selected date
  useEffect(() => {
    fetchMenu();
    // eslint-disable-next-line
  }, [selectedDate]);

  const fetchMenu = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/menu/date?date=${normalizeDateInput(selectedDate)}`);
      setMenu(res.data.data);
      setEditMenu({ ...res.data.data.meals });
      setAddInputs({});
    } catch (err) {
      setTimeout(() => {
        setMenu(null);
        setEditMenu({ breakfast: [], lunch: [], dinner: [] });
        setAddInputs({});
      }, 0);
      if (err.response?.status === 404) {
        // No menu for this date: not an error, just info
        // Optionally: toast('No menu found for this date. You can create one.');
      } else {
        toast.error('Failed to fetch menu');
        console.error(err);
      }
    } finally {
      setLoading(false);
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
      if (updated[meal].includes(value)) {
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
      if (updated[meal].includes(value)) {
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
        message: `Check today's ${mealType} menu and rate your meal.`,
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
    <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-lg p-2 sm:p-4 md:p-6 mt-2 sm:mt-8">
      {/* Today's Menu Section (Read-only, with Update button) */}
      <div className="mb-4 sm:mb-6">
        <div className="bg-green-50 rounded-lg p-3 sm:p-4 shadow flex flex-col">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
            <span className="font-bold text-green-900 text-base sm:text-lg">Today's Menu</span>
            <button
              className="sm:ml-auto px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 mt-2 sm:mt-0"
              onClick={openTodayModal}
              disabled={loadingToday}
            >
              Update
            </button>
          </div>
          {loadingToday ? (
            <div className="text-gray-400 text-sm">Loading menu...</div>
          ) : todaysMenu ? (
            <div>
              <div className="mb-1"><span className="font-semibold">Breakfast:</span> {todaysMenu.meals.breakfast.length ? todaysMenu.meals.breakfast.join(', ') : <span className="text-gray-400">No items</span>}</div>
              <div className="mb-1"><span className="font-semibold">Lunch:</span> {todaysMenu.meals.lunch.length ? todaysMenu.meals.lunch.join(', ') : <span className="text-gray-400">No items</span>}</div>
              <div className="mb-1"><span className="font-semibold">Dinner:</span> {todaysMenu.meals.dinner.length ? todaysMenu.meals.dinner.join(', ') : <span className="text-gray-400">No items</span>}</div>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No menu set for today.</div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Left Column - Menu Management */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-blue-900">Menu Management</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Set the food menu for any day. You can add, edit, or remove items for breakfast, lunch, and dinner.</p>
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
              {/* Table for screens >= 480px */}
              <div className="hidden xs:block overflow-x-auto">
                <table className="w-full min-w-[400px] border mb-4 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Meal</th>
                      <th className="border px-2 py-1">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MEALS.map(meal => (
                      <tr key={meal}>
                        <td className="border px-2 py-1 font-semibold capitalize align-top">{meal}</td>
                        <td className="border px-2 py-1 align-top">
                          <ul className="mb-2">
                            {editMenu[meal].map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 mb-1">
                                <span>{item}</span>
                                <button
                                  className="text-xs text-red-500 hover:underline"
                                  onClick={() => handleRemoveItem(meal, idx)}
                                >Remove</button>
                              </li>
                            ))}
                          </ul>
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              handleAddItem(meal);
                            }}
                            className="flex flex-col sm:flex-row gap-2"
                          >
                            <input
                              type="text"
                              placeholder={`Add to ${meal}`}
                              value={addInputs[meal] || ''}
                              onChange={e => handleAddInputChange(meal, e.target.value)}
                              className="border px-2 py-1 rounded text-xs sm:text-sm flex-1"
                            />
                            <button type="submit" className="px-2 py-1 bg-green-500 text-white rounded text-xs">Add</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Card layout for screens < 480px */}
              <div className="block xs:hidden space-y-4">
                {MEALS.map(meal => (
                  <div key={meal} className="border rounded-lg p-2 bg-gray-50">
                    <div className="font-semibold capitalize mb-1 text-sm">{meal}</div>
                    <ul className="mb-2">
                      {editMenu[meal].map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2 mb-1">
                          <span>{item}</span>
                          <button
                            className="text-xs text-red-500 hover:underline"
                            onClick={() => handleRemoveItem(meal, idx)}
                          >Remove</button>
                        </li>
                      ))}
                    </ul>
                    <form
                      onSubmit={e => {
                        e.preventDefault();
                        handleAddItem(meal);
                      }}
                      className="flex flex-col gap-2"
                    >
                      <input
                        type="text"
                        placeholder={`Add to ${meal}`}
                        value={addInputs[meal] || ''}
                        onChange={e => handleAddInputChange(meal, e.target.value)}
                        className="border px-2 py-1 rounded text-xs flex-1"
                      />
                      <button type="submit" className="px-2 py-1 bg-green-500 text-white rounded text-xs">Add</button>
                    </form>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-2">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs sm:text-base"
                  onClick={handleSave}
                  disabled={loading}
                >
                  Save Menu
                </button>
                <button
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs sm:text-base"
                  onClick={fetchMenu}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right Column - Rating Statistics */}
        <div className="mt-6 lg:mt-0">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-blue-900">Rating Statistics</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Monitor student feedback and ratings for today's meals.</p>
          {loadingStats ? (
            <div className="text-center py-8">Loading statistics...</div>
          ) : ratingStats ? (
            <div className="space-y-4">
              {['breakfast', 'lunch', 'dinner'].map(mealType => {
                const stats = ratingStats[mealType];
                const mealEmojis = { breakfast: '🥞', lunch: '🍛', dinner: '🍽️' };
                return (
                  <div key={mealType} className="bg-white rounded-lg p-3 sm:p-4 border">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{mealEmojis[mealType]}</span>
                      <span className="font-semibold capitalize text-base sm:text-lg">{mealType}</span>
                    </div>
                    {stats.totalRatings > 0 ? (
                      <div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-2">
                          {stats.average}/5 ⭐
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mb-3">
                          {stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''}
                        </div>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map(rating => {
                            const count = stats.distribution[rating] || 0;
                            const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                            return (
                              <div key={rating} className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm text-gray-600 w-4">{rating}⭐</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-yellow-400 h-2 rounded-full" 
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-500 w-8">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-center py-4">No ratings yet</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-8">No rating data available</div>
          )}
        </div>
      </div>

      {/* Menu Notification Management Section */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-2 text-blue-900">Menu Notifications</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">Send timely notifications to students about meal times.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Next Meal Time */}
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 md:mb-0">
              <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2">Next Meal Time</h3>
              {(() => {
                const nextMeal = getNextMealTime();
                return (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{nextMeal.emoji}</span>
                    <div>
                      <div className="font-medium text-blue-900 text-sm sm:text-base">{nextMeal.name}</div>
                      <div className="text-xs sm:text-sm text-blue-600">at {nextMeal.hour}:00</div>
                    </div>
                  </div>
                );
              })()}
            </div>
            {/* Manual Notification Triggers */}
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <h3 className="text-base sm:text-lg font-semibold text-green-900 mb-2">Send Notifications</h3>
              <p className="text-xs sm:text-sm text-green-700 mb-3">Manually trigger meal notifications to all students</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleSendMenuNotification('breakfast')}
                  disabled={notificationLoading}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base flex items-center gap-2"
                >
                  🥞 Send Breakfast Notification
                </button>
                <button
                  onClick={() => handleSendMenuNotification('lunch')}
                  disabled={notificationLoading}
                  className="w-full px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base flex items-center gap-2"
                >
                  🍛 Send Lunch Notification
                </button>
                <button
                  onClick={() => handleSendMenuNotification('dinner')}
                  disabled={notificationLoading}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-base flex items-center gap-2"
                >
                  🍽️ Send Dinner Notification
                </button>
              </div>
            </div>
          </div>
          {/* Last Notification Status */}
          {lastNotificationSent && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs sm:text-sm text-gray-600">
                Last notification sent: <span className="font-medium">{lastNotificationSent.mealType}</span> 
                to <span className="font-medium">{lastNotificationSent.count} students</span> 
                at <span className="font-medium">{lastNotificationSent.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          )}
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