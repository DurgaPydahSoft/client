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

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 mt-6">
      {/* Today's Menu Section (Read-only, with Update button) */}
      <div className="mb-6">
        <div className="bg-green-50 rounded-lg p-4 shadow flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            <span className="font-bold text-green-900">Today's Menu</span>
            <button
              className="ml-auto px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
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
      {/* Modal for editing today's menu */}
      {showTodayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl"
              onClick={closeTodayModal}
              disabled={savingToday}
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4 text-green-900">Edit Today's Menu</h3>
            {MEALS.map(meal => (
              <div key={meal} className="mb-3">
                <div className="font-semibold capitalize mb-1">{meal}</div>
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
                >
                  <input
                    type="text"
                    placeholder={`Add to ${meal}`}
                    value={modalAddInputs[meal] || ''}
                    onChange={e => handleModalAddInputChange(meal, e.target.value)}
                    className="border px-2 py-1 rounded text-sm"
                    disabled={savingToday}
                  />
                  <button type="submit" className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs" disabled={savingToday}>Add</button>
                </form>
              </div>
            ))}
            <div className="flex gap-4 mt-4">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={handleModalSave}
                disabled={savingToday}
              >
                Save
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={closeTodayModal}
                disabled={savingToday}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-2xl font-bold mb-2 text-blue-900 mt-8">Menu Management</h2>
      <p className="text-gray-600 mb-4">Set the food menu for any day. You can add, edit, or remove items for breakfast, lunch, and dinner.</p>
      <div className="flex items-center gap-4 mb-6">
        <label className="font-medium">Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border px-3 py-2 rounded shadow-sm"
        />
      </div>
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div>
          <table className="w-full border mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">Meal</th>
                <th className="border px-2 py-1">Items</th>
              </tr>
            </thead>
            <tbody>
              {MEALS.map(meal => (
                <tr key={meal}>
                  <td className="border px-2 py-1 font-semibold capitalize">{meal}</td>
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
                    >
                      <input
                        type="text"
                        placeholder={`Add to ${meal}`}
                        value={addInputs[meal] || ''}
                        onChange={e => handleAddInputChange(meal, e.target.value)}
                        className="border px-2 py-1 rounded text-sm"
                      />
                      <button type="submit" className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs">Add</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleSave}
              disabled={loading}
            >
              Save Menu
            </button>
            <button
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={fetchMenu}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement; 