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

const MEALS = ['breakfast', 'lunch', 'snacks', 'dinner'];

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

// Helper function to convert legacy string items to object format
const convertLegacyItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (typeof item === 'string') {
      return { name: item, imageUrl: null };
    }
    return item;
  });
};

// Helper function to ensure all meal types exist in the meals object
const ensureAllMealTypes = (meals) => {
  if (!meals) {
    return {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: []
    };
  }

  return {
    breakfast: convertLegacyItems(meals.breakfast || []),
    lunch: convertLegacyItems(meals.lunch || []),
    snacks: convertLegacyItems(meals.snacks || []),
    dinner: convertLegacyItems(meals.dinner || [])
  };
};

const MenuManagement = () => {
  // Store selectedDate as 'YYYY-MM-DD' string
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editMenu, setEditMenu] = useState({
    breakfast: [],
    lunch: [],
    snacks: [],
    dinner: []
  });
  const [addInputs, setAddInputs] = useState({}); // { meal: value }
  const [addImages, setAddImages] = useState({}); // { meal: file }

  // Today's menu state
  const [todaysMenu, setTodaysMenu] = useState(null);
  const [loadingToday, setLoadingToday] = useState(false);
  const [showTodayModal, setShowTodayModal] = useState(false);
  const [modalEditMenu, setModalEditMenu] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [modalAddInputs, setModalAddInputs] = useState({});
  const [modalAddImages, setModalAddImages] = useState({});
  const [modalDeletedImages, setModalDeletedImages] = useState([]);
  const [savingToday, setSavingToday] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('breakfast');

  // Rating statistics state
  const [ratingStats, setRatingStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [todaysRatingStats, setTodaysRatingStats] = useState(null);
  const [loadingTodaysStats, setLoadingTodaysStats] = useState(false);
  const [statsDate, setStatsDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Selected date menu state
  const [selectedDateMenu, setSelectedDateMenu] = useState(null);
  const [loadingSelectedDateMenu, setLoadingSelectedDateMenu] = useState(false);

  // Menu notification state
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [lastNotificationSent, setLastNotificationSent] = useState(null);

  // Today's menu popup state
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [selectedPopupMeal, setSelectedPopupMeal] = useState(null);

  // Food preparation count state
  const [foodCount, setFoodCount] = useState(null);
  const [loadingFoodCount, setLoadingFoodCount] = useState(false);

  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Fetch today's menu and food count on mount
  useEffect(() => {
    const fetchTodaysMenu = async () => {
      setLoadingToday(true);
      try {
        const res = await api.get('/api/cafeteria/menu/today');
        const menuData = res.data.data;
        // Convert legacy items to new format and ensure all meal types exist
        if (menuData && menuData.meals) {
          menuData.meals = ensureAllMealTypes(menuData.meals);
        } else {
          menuData.meals = ensureAllMealTypes(null);
        }
        setTodaysMenu(menuData);
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

    const fetchFoodCount = async () => {
      setLoadingFoodCount(true);
      try {
        const res = await api.get('/api/cafeteria/menu/food-count');
        setFoodCount(res.data.data);
      } catch (err) {
        console.error('Error fetching food count:', err);
        setFoodCount(null);
      } finally {
        setLoadingFoodCount(false);
      }
    };

    fetchTodaysMenu();
    fetchFoodCount();
  }, []);

  // Fetch rating statistics and menu for selected date
  useEffect(() => {
    const fetchRatingStatsAndMenu = async () => {
      setLoadingStats(true);
      setLoadingSelectedDateMenu(true);
      try {
        const formattedDate = formatDateForAPI(statsDate);

        // Fetch both rating stats and menu in parallel
        const [ratingRes, menuRes] = await Promise.allSettled([
          api.get(`/api/cafeteria/menu/ratings/stats?date=${formattedDate}`),
          api.get(`/api/cafeteria/menu/date?date=${formattedDate}`)
        ]);

        // Handle rating stats
        if (ratingRes.status === 'fulfilled') {
          setRatingStats(ratingRes.value.data.data);
        } else {
          // 404 is expected when no menu or ratings exist for the date
          if (ratingRes.reason.response?.status !== 404) {
            console.error('Error fetching rating stats:', ratingRes.reason);
          }
          setRatingStats(null);
        }

        // Handle menu data
        if (menuRes.status === 'fulfilled') {
          const menuData = menuRes.value.data.data;
          // Convert legacy items to new format and ensure all meal types exist
          if (menuData && menuData.meals) {
            menuData.meals = ensureAllMealTypes(menuData.meals);
          } else {
            menuData.meals = ensureAllMealTypes(null);
          }
          setSelectedDateMenu(menuData);
        } else {
          // 404 is expected when no menu exists for the date
          if (menuRes.reason.response?.status !== 404) {
            console.error('Error fetching menu:', menuRes.reason);
          }
          setSelectedDateMenu(null);
        }
      } catch (err) {
        console.error('Error in fetchRatingStatsAndMenu:', err);
        setRatingStats(null);
        setSelectedDateMenu(null);
      } finally {
        setLoadingStats(false);
        setLoadingSelectedDateMenu(false);
      }
    };
    fetchRatingStatsAndMenu();
  }, [statsDate]);

  // Fetch today's rating statistics
  useEffect(() => {
    const fetchTodaysRatingStats = async () => {
      setLoadingTodaysStats(true);
      try {
        const todayFormattedForStats = getTodayISOString();
        const res = await api.get(`/api/cafeteria/menu/ratings/stats?date=${todayFormattedForStats}`);
        setTodaysRatingStats(res.data.data);
      } catch (err) {
        // 404 is expected when no menu or ratings exist for today
        if (err.response?.status !== 404) {
          console.error('Error fetching today\'s rating stats:', err);
        }
        setTodaysRatingStats(null);
      } finally {
        setLoadingTodaysStats(false);
      }
    };
    fetchTodaysRatingStats();
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
      const formattedDate = formatDateForAPI(selectedDate);
      const res = await api.get(`/api/cafeteria/menu/date?date=${formattedDate}`);
      if (isMounted.current) {
        const menuData = res.data.data;
        // Convert legacy items to new format and ensure all meal types exist
        if (menuData && menuData.meals) {
          menuData.meals = ensureAllMealTypes(menuData.meals);
        } else {
          menuData.meals = ensureAllMealTypes(null);
        }
        setMenu(menuData);
        setEditMenu({ ...menuData.meals });
        setAddInputs({});
        setAddImages({});
      }
    } catch (err) {
      if (err.response?.status === 404) {
        if (isMounted.current) {
          setMenu(null);
          setEditMenu({
            breakfast: [],
            lunch: [],
            snacks: [],
            dinner: []
          });
          setAddInputs({});
          setAddImages({});
        }
      } else {
        toast.error('Failed to fetch menu');
        console.error(err);
        if (isMounted.current) {
          setMenu(null);
          setEditMenu({
            breakfast: [],
            lunch: [],
            snacks: [],
            dinner: []
          });
          setAddInputs({});
          setAddImages({});
        }
      }
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleAddInputChange = (meal, value) => {
    setAddInputs(prev => ({ ...prev, [meal]: value }));
  };

  const handleImageChange = (meal, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate file type
    if (file && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setAddImages(prev => ({ ...prev, [meal]: file }));

    if (file) {
      toast.success(`Image selected for ${meal}: ${file.name}`);
    }
  };

  const handleAddItem = (meal) => {
    const value = (addInputs[meal] || '').trim();
    if (!value) return;

    // Check for duplicates in current state
    const currentItems = editMenu[meal] || [];
    const normalizedValue = value.toLowerCase();
    const normalizedItems = currentItems.map(item => (item.name || item).toLowerCase());

    if (normalizedItems.includes(normalizedValue)) {
      toast.error('Item already exists');
      return;
    }

    const newItem = { name: value, imageUrl: null };
    const imageFile = addImages[meal];

    if (imageFile) {
      // Store the file directly, not in FormData
      newItem.imageFile = imageFile;
    }

    setEditMenu(prev => {
      const updated = { ...prev };
      if (!updated[meal]) {
        updated[meal] = [];
      }
      updated[meal] = [...updated[meal], newItem];
      return updated;
    });
    setAddInputs(prev => ({ ...prev, [meal]: '' }));
    setAddImages(prev => ({ ...prev, [meal]: null }));
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

      // Prepare meals data for API
      const mealsData = {};
      for (const mealType of MEALS) {
        mealsData[mealType] = editMenu[mealType].map(item => {
          if (item.imageFile) {
            // For items with new images, we need to handle the FormData
            return item;
          }
          return {
            name: item.name,
            imageUrl: item.imageUrl
          };
        });
      }

      // Create FormData for the entire request if there are images
      const hasImages = Object.values(mealsData).some(meal =>
        meal.some(item => item.imageFile)
      );

      if (hasImages) {
        const formData = new FormData();
        // Convert ISO string to simple date format
        const simpleDate = new Date(formattedDate).toISOString().split('T')[0];
        formData.append('date', simpleDate);

        // Add meals data without images first
        const mealsWithoutImages = {};
        for (const mealType of MEALS) {
          mealsWithoutImages[mealType] = mealsData[mealType].map(item => ({
            name: item.name,
            imageUrl: item.imageUrl
          }));
        }
        formData.append('meals', JSON.stringify(mealsWithoutImages));

        // Add image files to FormData
        for (const mealType of MEALS) {
          mealsData[mealType].forEach((item, index) => {
            if (item.imageFile) {
              const fileKey = `image_${mealType}_${index}`;
              formData.append(fileKey, item.imageFile);
            }
          });
        }

        try {
          const response = await api.post('/api/cafeteria/menu/date', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        } catch (error) {
          throw error;
        }
      } else {
        await api.post('/api/cafeteria/menu/date', {
          date: formattedDate,
          meals: mealsData
        });
      }

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
    const initialMeals = todaysMenu ? ensureAllMealTypes(todaysMenu.meals) : {
      breakfast: [],
      lunch: [],
      snacks: [],
      dinner: []
    };
    setModalEditMenu(initialMeals);
    setModalAddInputs({});
    setModalAddImages({});
    setModalDeletedImages([]); // Reset deleted images array
    setSelectedMealType('breakfast');
    setShowTodayModal(true);
  };
  const closeTodayModal = () => {
    setShowTodayModal(false);
  };
  const handleModalAddInputChange = (meal, value) => {
    setModalAddInputs(prev => ({ ...prev, [meal]: value }));
  };

  const handleModalImageChange = (meal, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Validate file type
    if (file && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setModalAddImages(prev => ({ ...prev, [meal]: file }));

    if (file) {
      toast.success(`Image selected for ${meal}: ${file.name}`);
    }
  };

  const handleModalAddItem = (meal) => {
    const value = (modalAddInputs[meal] || '').trim();
    if (!value) return;

    // Check for duplicates in current state
    const currentItems = modalEditMenu[meal] || [];
    const normalizedValue = value.toLowerCase();
    const normalizedItems = currentItems.map(item => (item.name || item).toLowerCase());

    if (normalizedItems.includes(normalizedValue)) {
      toast.error('Item already exists');
      return;
    }

    const newItem = { name: value, imageUrl: null };
    const imageFile = modalAddImages[meal];

    if (imageFile) {
      // Store the file directly, not in FormData
      newItem.imageFile = imageFile;
    }

    setModalEditMenu(prev => {
      const updated = { ...prev };
      if (!updated[meal]) {
        updated[meal] = [];
      }
      updated[meal] = [...updated[meal], newItem];
      return updated;
    });
    setModalAddInputs(prev => ({ ...prev, [meal]: '' }));
    setModalAddImages(prev => ({ ...prev, [meal]: null }));
  };
  const handleModalRemoveItem = (meal, idx) => {
    setModalEditMenu(prev => {
      const updated = { ...prev };
      const removedItem = updated[meal][idx];

      // If the item has an image URL, we need to track it for deletion
      if (removedItem && removedItem.imageUrl) {
        // Store the image URL for deletion when the modal is saved
        setModalDeletedImages(prev => {
          // Check if this image URL is already in the array to avoid duplicates
          if (!prev.includes(removedItem.imageUrl)) {
            const newArray = [...prev, removedItem.imageUrl];
            return newArray;
          }
          return prev;
        });
      }

      updated[meal] = updated[meal].filter((_, i) => i !== idx);
      return updated;
    });
  };
  const handleModalSave = async () => {
    setSavingToday(true);
    try {
      const todayFormatted = formatDateForAPI(new Date().toISOString().slice(0, 10));

      // Prepare meals data for API
      const mealsData = {};
      for (const mealType of MEALS) {
        mealsData[mealType] = modalEditMenu[mealType].map(item => {
          if (item.imageFile) {
            // For items with new images, we need to handle the FormData
            return item;
          }
          // Handle both string items (legacy) and object items (new format)
          if (typeof item === 'string') {
            return { name: item, imageUrl: null };
          }
          return {
            name: item.name || item,
            imageUrl: item.imageUrl
          };
        });
      }

      // Create FormData for the entire request if there are images
      const hasImages = Object.values(mealsData).some(meal =>
        meal.some(item => item.imageFile)
      );

      let savePromise;
      if (hasImages) {
        const formData = new FormData();
        // Convert ISO string to simple date format
        const simpleDate = new Date(todayFormatted).toISOString().split('T')[0];
        formData.append('date', simpleDate);

        // Add meals data without images first
        const mealsWithoutImages = {};
        for (const mealType of MEALS) {
          mealsWithoutImages[mealType] = mealsData[mealType].map(item => ({
            name: item.name,
            imageUrl: item.imageUrl
          }));
        }
        formData.append('meals', JSON.stringify(mealsWithoutImages));

        // Add image files to FormData
        for (const mealType of MEALS) {
          mealsData[mealType].forEach((item, index) => {
            if (item.imageFile) {
              const fileKey = `image_${mealType}_${index}`;
              formData.append(fileKey, item.imageFile);
            }
          });
        }

        savePromise = api.post('/api/cafeteria/menu/date', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        savePromise = api.post('/api/cafeteria/menu/date', {
          date: todayFormatted,
          meals: mealsData
        });
      }

      // Show immediate success feedback
      toast.success("Today's menu updated successfully!");
      setShowTodayModal(false);
      setModalDeletedImages([]); // Clear the deleted images array
      setSavingToday(false);

      // Continue processing in background
      try {
        await savePromise;

        // Delete images from S3 for removed items (background task)
        if (modalDeletedImages.length > 0) {
          api.post('/api/cafeteria/menu/delete-images', {
            imageUrls: modalDeletedImages
          }).catch(err => {
            console.error('Error deleting images from S3:', err);
          });
        }

        // Refetch today's menu to update card (background task)
        api.get('/api/cafeteria/menu/today').then(res => {
          const menuData = res.data.data;
          // Convert legacy items to new format and ensure all meal types exist
          if (menuData && menuData.meals) {
            menuData.meals = ensureAllMealTypes(menuData.meals);
          } else {
            menuData.meals = ensureAllMealTypes(null);
          }
          setTodaysMenu(menuData);
        }).catch(err => {
          console.error('Error refetching today\'s menu:', err);
        });

        // Refresh today's rating stats (background task)
        const todayFormattedForRefresh = getTodayISOString();
        api.get(`/api/cafeteria/menu/ratings/stats?date=${todayFormattedForRefresh}`).then(statsRes => {
          setTodaysRatingStats(statsRes.data.data);
        }).catch(err => {
          console.error('Error refreshing rating stats:', err);
        });

      } catch (error) {
        console.error('Background processing error:', error);
        toast.error('Menu saved but some background tasks failed');
      }

    } catch (err) {
      toast.error("Failed to update today's menu");
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

      {/* Food Preparation Count Section - Mobile Optimized */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl shadow-sm border border-orange-200 p-3 sm:p-4 lg:p-6">
        {/* Header - Mobile Stack */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🍽️</span>
            <h2 className="text-base sm:text-lg font-semibold text-orange-900">Food Preparation Count</h2>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full self-start sm:self-auto">
              Based on yesterday's night attendance
            </div>
            <button
              onClick={async () => {
                setLoadingFoodCount(true);
                try {
                  const res = await api.get('/api/cafeteria/menu/food-count');
                  setFoodCount(res.data.data);
                } catch (err) {
                  console.error('Error fetching food count:', err);
                  toast.error('Failed to refresh food count');
                } finally {
                  setLoadingFoodCount(false);
                }
              }}
              disabled={loadingFoodCount}
              className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50 self-start sm:self-auto"
              title="Refresh count"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {loadingFoodCount ? (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="inline-flex items-center gap-2 text-orange-600">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-xs sm:text-sm font-medium">Loading count...</span>
            </div>
          </div>
        ) : foodCount ? (
          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-3 lg:gap-4">
            {/* Students Count - Mobile First */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">{foodCount.counts.students}</div>
                  <div className="text-xs sm:text-sm text-gray-600 truncate">Students</div>
                </div>
                <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">👨‍🎓</div>
              </div>
            </div>

            {/* Staff Count - Mobile First */}
            <div className="bg-white rounded-lg p-3 sm:p-4 border border-orange-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-xl sm:text-2xl font-bold text-green-600">{foodCount.counts.staff}</div>
                  <div className="text-xs sm:text-sm text-gray-600 truncate">Staff/Guests</div>
                </div>
                <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">👨‍💼</div>
              </div>
            </div>

            {/* Total Count - Mobile First */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-3 sm:p-4 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-2xl sm:text-3xl font-bold">{foodCount.counts.total}</div>
                  <div className="text-xs sm:text-sm opacity-90 truncate">Total Count</div>
                </div>
                <div className="text-2xl sm:text-3xl ml-2 flex-shrink-0">🍽️</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <div className="text-orange-400 text-3xl sm:text-4xl mb-2">📊</div>
            <div className="text-orange-600 font-medium text-sm sm:text-base">No attendance data available</div>
            <div className="text-orange-500 text-xs sm:text-sm mt-1 px-4">
              Unable to fetch yesterday's attendance data
            </div>
          </div>
        )}

        {foodCount && (
          <div className="mt-3 sm:mt-4 text-xs text-orange-600 text-center">
            Last updated: {new Date(foodCount.lastUpdated).toLocaleString()}
          </div>
        )}
      </div>

      {/* Today's Menu Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg font-semibold text-blue-900">Today's Menu</h2>
          <div className="flex gap-1">
            {todaysMenu && ['breakfast', 'lunch', 'snacks', 'dinner'].map(mealType => (
              <button
                key={mealType}
                onClick={() => handleSendMenuNotification(mealType)}
                disabled={notificationLoading}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                title={`Send ${mealType} notification`}
              >
                {mealType.charAt(0).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {loadingToday ? (
          <div className="text-center py-4 text-gray-500 text-sm">Loading today's menu...</div>
        ) : todaysMenu ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => {
              const mealItems = todaysMenu.meals?.[meal] || [];
              const stats = todaysRatingStats && todaysRatingStats[meal] ? todaysRatingStats[meal] : null;
              return (
                <div
                  key={meal}
                  className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    // Reset popup state first to ensure clean state
                    setShowMenuPopup(false);
                    setSelectedPopupMeal(null);

                    // Use setTimeout to ensure state is reset before setting new state
                    setTimeout(() => {
                      setSelectedPopupMeal({ type: meal, items: mealItems, stats });
                      setShowMenuPopup(true);


                    }, 0);
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 flex items-center gap-1 capitalize text-xs sm:text-sm">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'snacks' && '🍿'}
                      {meal === 'dinner' && '🍽️'}
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </h3>
                    {stats && stats.totalRatings > 0 && (
                      <div className="text-right">
                        <span className="text-xs font-bold text-yellow-600">{stats.average}/5</span>
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="text-xs text-gray-700">
                    {mealItems.length ? (
                      <div className="space-y-1">
                        {mealItems.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                            <span className="truncate">{item.name || item}</span>
                          </div>
                        ))}
                        {mealItems.length > 3 && (
                          <div className="text-gray-500 text-xs italic">
                            +{mealItems.length - 3} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No items</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-gray-400 text-sm mb-2">No menu set for today</div>
            <button
              onClick={openTodayModal}
              className="px-3 py-1.5 bg-green-600 text-white rounded text-xs hover:bg-green-700"
            >
              Create Today's Menu
            </button>
          </div>
        )}
      </div>

      {/* Detailed Rating Statistics Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col gap-3 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-blue-900">Menu & Rating History</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 font-medium">Select Date:</label>
              <input
                type="date"
                value={statsDate}
                onChange={e => setStatsDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-auto"
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const currentDate = new Date(statsDate);
                  currentDate.setDate(currentDate.getDate() - 1);
                  setStatsDate(currentDate.toISOString().slice(0, 10));
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Previous Day"
              >
                ←
              </button>
              <button
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setStatsDate(today);
                }}
                className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="Today"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const currentDate = new Date(statsDate);
                  currentDate.setDate(currentDate.getDate() + 1);
                  setStatsDate(currentDate.toISOString().slice(0, 10));
                }}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                title="Next Day"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Menu Items for Selected Date */}
        {loadingSelectedDateMenu ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading menu items...
            </div>
          </div>
        ) : selectedDateMenu ? (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Menu Items for {new Date(statsDate).toLocaleDateString()}</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => {
                const mealItems = selectedDateMenu.meals?.[meal] || [];
                const stats = ratingStats && ratingStats[meal] ? ratingStats[meal] : null;
                return (
                  <div
                    key={meal}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900 flex items-center gap-1 capitalize text-sm">
                        {meal === 'breakfast' && '🥞'}
                        {meal === 'lunch' && '🍛'}
                        {meal === 'snacks' && '🍿'}
                        {meal === 'dinner' && '🍽️'}
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </h4>
                      {stats && stats.totalRatings > 0 && (
                        <div className="text-right">
                          <span className="text-xs font-bold text-yellow-600">{stats.average}/5</span>
                          <div className="text-xs text-gray-500">({stats.totalRatings})</div>
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <div className="text-xs text-gray-700">
                      {mealItems.length ? (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {mealItems.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0"></span>
                              <span className="truncate">{item.name || item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No items</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="text-center py-4">
              <div className="text-gray-400 text-sm mb-2">No menu found for {new Date(statsDate).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {loadingStats ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Loading rating statistics...
            </div>
          </div>
        ) : ratingStats && Object.values(ratingStats).some(stats => stats.totalRatings > 0) ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
            {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => {
              const stats = ratingStats[meal];
              if (!stats || stats.totalRatings === 0) return null;

              return (
                <div key={meal} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl sm:text-3xl">
                        {meal === 'breakfast' && '🥞'}
                        {meal === 'lunch' && '🍛'}
                        {meal === 'snacks' && '🍿'}
                        {meal === 'dinner' && '🍽️'}
                      </span>
                      <h3 className="font-bold text-gray-900 capitalize text-base sm:text-lg">{meal}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.average}/5</div>
                      <div className="text-xs text-gray-600">{stats.totalRatings} ratings</div>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Rating Breakdown</h4>
                    <div className="space-y-2">
                      {[5, 4, 3, 2, 1].map(star => {
                        const count = stats.ratingCounts[star] || 0;
                        const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-3">
                            <div className="flex items-center w-8">
                              <span className="text-sm font-medium text-gray-700">{star}★</span>
                            </div>
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-sm font-medium text-gray-700 w-8 text-right">{count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Comments */}
                  {stats.comments && stats.comments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Comments</h4>
                      <div className="space-y-3 max-h-32 overflow-y-auto">
                        {stats.comments.slice(0, 3).map((comment, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-yellow-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-500 text-sm font-medium">{'★'.repeat(comment.rating)}</span>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="text-sm text-gray-700 leading-relaxed line-clamp-3">{comment.comment}</div>
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
            <div className="inline-flex flex-col items-center gap-3">
              <div className="text-4xl">📊</div>
              <div className="text-gray-400 text-sm font-medium">No rating data available</div>
              <div className="text-xs text-gray-500 max-w-xs">
                Students haven't rated any meals for {new Date(statsDate).toLocaleDateString()} yet.
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Modal for editing today's menu */}
      {showTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-bold text-gray-900">Edit Today's Menu</h3>
              <button
                onClick={closeTodayModal}
                disabled={savingToday}
                className="text-gray-500 hover:text-gray-700 text-lg p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Meal Type Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {['breakfast', 'lunch', 'snacks', 'dinner'].map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`flex-1 px-2 py-2 text-xs font-medium transition-colors ${selectedMealType === meal
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                    }`}
                  disabled={savingToday}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">
                      {meal === 'breakfast' && '🥞'}
                      {meal === 'lunch' && '🍛'}
                      {meal === 'snacks' && '🍿'}
                      {meal === 'dinner' && '🍽️'}
                    </span>
                    <span className="capitalize">{meal}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {/* Items List */}
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Items</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {modalEditMenu[selectedMealType]?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <div className="flex items-center gap-2 flex-1">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name || item}
                            className="w-8 h-8 object-cover rounded border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                            crossOrigin="anonymous"
                          />
                        )}
                        <span className="text-xs text-gray-700 font-medium truncate">
                          {typeof item === 'string' ? item : (item.name || item)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleModalRemoveItem(selectedMealType, idx)}
                        disabled={savingToday}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Delete item"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {(!modalEditMenu[selectedMealType] || modalEditMenu[selectedMealType].length === 0) && (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No items added yet
                    </div>
                  )}
                </div>
              </div>

              {/* Add Item Form */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h5 className="text-xs font-medium text-gray-700 mb-3">Add New Item</h5>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleModalAddItem(selectedMealType);
                  }}
                  className="space-y-3"
                >
                  {/* Item Name Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      placeholder={`Enter ${selectedMealType} item name`}
                      value={modalAddInputs[selectedMealType] || ''}
                      onChange={e => handleModalAddInputChange(selectedMealType, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={savingToday}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Item Image (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => handleModalImageChange(selectedMealType, e.target.files[0])}
                        className="hidden"
                        id={`image-upload-${selectedMealType}`}
                        disabled={savingToday}
                      />
                      <label
                        htmlFor={`image-upload-${selectedMealType}`}
                        className="flex items-center justify-center w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                      >
                        <div className="text-center">
                          {modalAddImages[selectedMealType] ? (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-xs text-green-600 font-medium">{modalAddImages[selectedMealType].name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                              <span className="text-xs text-gray-500">Tap to upload image</span>
                            </div>
                          )}
                        </div>
                      </label>
                      {modalAddImages[selectedMealType] && (
                        <button
                          type="button"
                          onClick={() => setModalAddImages(prev => ({ ...prev, [selectedMealType]: null }))}
                          className="absolute top-1 right-1 text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                          disabled={savingToday}
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Max 5MB, JPG, PNG, GIF supported
                    </p>
                  </div>

                  {/* Add Button */}
                  <button
                    type="submit"
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    disabled={savingToday || !modalAddInputs[selectedMealType]?.trim()}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Item
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-3 sm:p-4 bg-gray-50">
              <div className="flex gap-2">
                <button
                  onClick={handleModalSave}
                  disabled={savingToday}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Changes
                </button>
                <button
                  onClick={closeTodayModal}
                  disabled={savingToday}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Today's Menu Items Popup */}
      {showMenuPopup && selectedPopupMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-2 sm:p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md sm:max-w-lg lg:max-w-4xl xl:max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl">
                  {selectedPopupMeal.type === 'breakfast' && '🥞'}
                  {selectedPopupMeal.type === 'lunch' && '🍛'}
                  {selectedPopupMeal.type === 'snacks' && '🍿'}
                  {selectedPopupMeal.type === 'dinner' && '🍽️'}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 capitalize">
                  {selectedPopupMeal.type}
                </h3>
                {selectedPopupMeal.stats && selectedPopupMeal.stats.totalRatings > 0 && (
                  <div className="ml-auto">
                    <span className="text-xs sm:text-sm font-bold text-yellow-600">
                      ⭐ {selectedPopupMeal.stats.average}/5
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowMenuPopup(false);
                  setSelectedPopupMeal(null);
                }}
                className="text-gray-500 hover:text-gray-700 text-lg p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {selectedPopupMeal.items.length > 0 ? (
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
                  {selectedPopupMeal.items.map((item, idx) => (
                    <div key={`${selectedPopupMeal.type}-${idx}`} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex flex-col items-center text-center">
                        {item.imageUrl && (
                          <div className="mb-3">
                            <img
                              src={item.imageUrl}
                              alt={item.name || item}
                              className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-cover rounded-lg border border-gray-200 shadow-md"
                              onError={(e) => {
                                // Show a placeholder when image fails to load
                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRkY2QjYwIi8+CjxwYXRoIGQ9Ik0zMiAxNkMyNC4yNjggMTYgMTggMjIuMjY4IDE4IDMwQzE4IDM3LjczMiAyNC4yNjggNDQgMzIgNDRDNDAuNzMyIDQ0IDQ3IDM3LjczMiA0NyAzMEM0NyAyMi4yNjggNDAuNzMyIDE2IDMyIDE2WiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNMzIgNTJDMjQuMjY4IDUyIDE4IDU4LjI2OCAxOCA2NkgxNkMzMi41NTIgNjYgNDYgNTIuNTUyIDQ2IDM2QzQ2IDI4LjI2OCAzOS43MzIgMjIgMzIgMjJDMjQuMjY4IDIyIDE4IDI4LjI2OCAxOCAzNkMxOCA0My43MzIgMjQuMjY4IDUwIDMyIDUwWiIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4K';
                                e.target.className = 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-cover rounded-lg border border-red-200 shadow-md opacity-75';
                                e.target.title = 'Image failed to load';
                              }}
                              onLoad={(e) => {
                                e.target.className = 'w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 object-cover rounded-lg border border-gray-200 shadow-md';
                                e.target.title = '';
                              }}
                              crossOrigin="anonymous"
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm sm:text-base lg:text-lg font-medium text-gray-900">
                            {typeof item === 'string' ? item : (item.name || item)}
                          </div>
                          {!item.imageUrl && (
                            <div className="text-xs text-gray-500 mt-1">
                              No image available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No items available for {selectedPopupMeal.type}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement; 