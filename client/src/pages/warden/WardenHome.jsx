import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  MegaphoneIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  CheckCircleIcon,
  HomeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const WardenHome = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [studentRoster, setStudentRoster] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roomsByCategory, setRoomsByCategory] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  // Student dates + room assignment modal
  const [datesModalOpen, setDatesModalOpen] = useState(false);
  const [selectedStudentForDates, setSelectedStudentForDates] = useState(null);
  const [admitDateInput, setAdmitDateInput] = useState('');
  const [joiningDateInput, setJoiningDateInput] = useState('');
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [modalCategoryId, setModalCategoryId] = useState('');
  const [modalRooms, setModalRooms] = useState([]);
  const [loadingModalRooms, setLoadingModalRooms] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

  const getDefaultAcademicYear = () => {
    const year = new Date().getFullYear();
    return `${year}-${year + 1}`;
  };

  const generateAcademicYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = -3; i <= 3; i++) {
      const year = currentYear + i;
      years.push(`${year}-${year + 1}`);
    }
    return years;
  };

  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    todayAttendance: 0
  });

  const getWardenHostelId = () => {
    if (!user) return undefined;
    return user.assignedHostelId?._id || user.assignedHostelId || undefined;
  };

  const getCategoryId = (cat) => (cat?._id || cat?.id || '').toString();
  const getCategoryName = (cat) => cat?.name || cat?.categoryName || 'Category';

  const toDateInputValue = (d) => {
    if (!d) return '';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  const resolveStudentCategoryId = (student, categoryList = categories) => {
    const fromObj = student?.hostelCategory?._id || student?.hostelCategory;
    if (fromObj && /^[0-9a-fA-F]{24}$/.test(String(fromObj))) {
      return String(fromObj);
    }
    const name =
      (typeof student?.hostelCategory === 'object' && student?.hostelCategory?.name) ||
      student?.category ||
      '';
    if (!name) return '';
    const match = categoryList.find(
      (c) => (c.name || '').toLowerCase() === String(name).toLowerCase()
    );
    return match ? getCategoryId(match) : '';
  };

  const resolveStudentCategoryLabel = (student) => {
    if (typeof student?.hostelCategory === 'object' && student?.hostelCategory?.name) {
      return student.hostelCategory.name;
    }
    return student?.category || '—';
  };

  const fetchRoomsForModal = async (categoryId) => {
    if (!categoryId) {
      setModalRooms([]);
      return;
    }
    setLoadingModalRooms(true);
    try {
      const hostelId = getWardenHostelId();
      // Live occupancy (omit academicYear) so vacancy matches current active occupants.
      const params = new URLSearchParams({
        category: categoryId
      });
      if (hostelId) params.set('hostel', hostelId);
      const res = await api.get(`/api/rooms/warden/bed-availability?${params.toString()}`);
      if (res.data.success) {
        const rooms = res.data.data.rooms || [];
        setModalRooms(rooms);
        setRoomsByCategory((prev) => ({ ...prev, [categoryId]: rooms }));
      }
    } catch (error) {
      console.error('Error fetching modal rooms:', error);
      toast.error('Failed to load rooms for this category');
      setModalRooms([]);
    } finally {
      setLoadingModalRooms(false);
    }
  };

  const openStudentDatesModal = async (student) => {
    setSelectedStudentForDates(student);
    setAdmitDateInput(
      toDateInputValue(student?.hostelRequestCreatedAt || student?.admitDate || student?.createdAt)
    );
    setJoiningDateInput(toDateInputValue(student?.joiningDate));
    setRoomNumberInput(student?.roomNumber || '');
    const catId = resolveStudentCategoryId(student);
    setModalCategoryId(catId);
    setDatesModalOpen(true);
    setModalRooms([]);
    if (catId) {
      // Always refresh live counts when opening the modal.
      await fetchRoomsForModal(catId);
    } else {
      setModalRooms([]);
    }
  };

  const closeStudentDatesModal = () => {
    setDatesModalOpen(false);
    setSelectedStudentForDates(null);
    setAdmitDateInput('');
    setJoiningDateInput('');
    setRoomNumberInput('');
    setModalCategoryId('');
    setModalRooms([]);
  };

  const saveStudentDates = async () => {
    if (!selectedStudentForDates?._id) return;
    setSavingDates(true);
    try {
      const hostelId = getWardenHostelId();
      const payload = {
        academicYear
      };
      if (admitDateInput) payload.admitDate = admitDateInput;
      if (joiningDateInput) payload.joiningDate = joiningDateInput;

      if (roomNumberInput) {
        payload.roomNumber = roomNumberInput;
        if (hostelId) payload.hostel = hostelId;
        if (modalCategoryId) payload.hostelCategory = modalCategoryId;
        const cat = categories.find((c) => getCategoryId(c) === modalCategoryId);
        if (cat?.name) payload.category = cat.name;
      }

      const res = await api.put(`/api/admin/students/${selectedStudentForDates._id}`, payload);
      const allocated = res?.data?.data?.roomAllocated;
      toast.success(
        allocated
          ? `Saved and room ${allocated} assigned`
          : 'Saved successfully'
      );

      const savedId = selectedStudentForDates._id;
      if (joiningDateInput) {
        setStudentRoster((prev) => prev.filter((s) => s._id !== savedId));
      } else {
        setStudentRoster((prev) =>
          prev.map((s) =>
            s._id === savedId
              ? {
                  ...s,
                  admitDate: admitDateInput || s.admitDate,
                  joiningDate: joiningDateInput || s.joiningDate,
                  roomNumber: roomNumberInput || s.roomNumber
                }
              : s
          )
        );
      }

      if (roomNumberInput && modalCategoryId) {
        fetchCategoryRooms(modalCategoryId, { silent: true });
      }

      closeStudentDatesModal();
    } catch (error) {
      console.error('Error saving student dates:', error);
      toast.error(error?.response?.data?.message || 'Failed to save');
    } finally {
      setSavingDates(false);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const todayStr = new Date().toISOString().split('T')[0];
      const hostelId = getWardenHostelId();

      const [announcementsRes, rosterRes, categoriesRes] = await Promise.allSettled([
        api.get('/api/announcements/warden'),
        api.get(`/api/attendance/students?academicYear=${encodeURIComponent(academicYear)}&date=${encodeURIComponent(todayStr)}`),
        hostelId
          ? api.get(`/api/hostels/${hostelId}/categories`)
          : Promise.reject(new Error('No assigned hostel'))
      ]);

      if (announcementsRes.status === 'fulfilled' && announcementsRes.value.data.success) {
        setAnnouncements(announcementsRes.value.data.data || []);
      } else {
        setAnnouncements([]);
      }

      if (rosterRes.status === 'fulfilled' && rosterRes.value.data.success) {
        const { students = [], totalStudents = 0, attendanceTaken = 0 } = rosterRes.value.data.data || {};
        const missingJoiningDate = students.filter((s) => !s.joiningDate);
        setStudentRoster(missingJoiningDate);
        setStats({
          totalStudents,
          activeStudents: students.length,
          todayAttendance: attendanceTaken
        });
      } else {
        setStudentRoster([]);
        setStats({ totalStudents: 0, activeStudents: 0, todayAttendance: 0 });
      }

      if (categoriesRes.status === 'fulfilled' && categoriesRes.value.data.success) {
        const cats = categoriesRes.value.data.data || [];
        setCategories(cats);
        setSelectedCategoryId((prev) => {
          if (prev && cats.some((c) => getCategoryId(c) === prev)) return prev;
          return cats[0] ? getCategoryId(cats[0]) : '';
        });
      } else {
        setCategories([]);
        setSelectedCategoryId('');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [academicYear, user]);

  const fetchCategoryRooms = useCallback(async (categoryId, { silent = false } = {}) => {
    if (!categoryId) {
      setRoomsByCategory({});
      return;
    }
    if (!silent) setLoadingRooms(true);
    try {
      const hostelId = getWardenHostelId();
      // Live occupancy for vacancy cards (omit academicYear).
      const params = new URLSearchParams({
        category: categoryId
      });
      if (hostelId) params.set('hostel', hostelId);

      const res = await api.get(`/api/rooms/warden/bed-availability?${params.toString()}`);
      if (res.data.success) {
        setRoomsByCategory((prev) => ({
          ...prev,
          [categoryId]: res.data.data.rooms || []
        }));
      }
    } catch (error) {
      console.error('Error fetching room availability:', error);
      if (!silent) toast.error('Failed to load room availability');
    } finally {
      if (!silent) setLoadingRooms(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (selectedCategoryId) {
      fetchCategoryRooms(selectedCategoryId);
    }
  }, [selectedCategoryId, fetchCategoryRooms]);

  // Live refresh of the visible category every 45s
  useEffect(() => {
    if (!selectedCategoryId) return undefined;
    const timer = setInterval(() => {
      fetchCategoryRooms(selectedCategoryId, { silent: true });
    }, 45000);
    return () => clearInterval(timer);
  }, [selectedCategoryId, fetchCategoryRooms]);

  const selectedRooms = roomsByCategory[selectedCategoryId] || [];
  const availableRoomCount = selectedRooms.filter((r) => (r.availableBeds || 0) > 0).length;
  const totalAvailableBeds = selectedRooms.reduce((sum, r) => sum + (r.availableBeds || 0), 0);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <SEO title="Warden Dashboard" />
      
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6 mb-3 sm:mb-4 lg:mb-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent flex items-center gap-2 sm:gap-3">
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600 flex-shrink-0" />
                <span>Warden Dashboard</span>
              </h1>
              <p className="text-xs sm:text-sm lg:text-base text-gray-600 mt-1 sm:mt-2">
                Welcome back! Here's an overview of hostel announcements and room availability.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <select
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm font-medium text-gray-700 bg-white"
                >
                  {generateAcademicYears().map((year) => (
                    <option key={year} value={year}>
                      {year} AY
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-3 sm:mb-4 lg:mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Total Students
                  </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                    {stats.totalStudents}
                  </dd>
                </dl>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Active Students
                  </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                    {stats.activeStudents}
                  </dd>
                </dl>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="hidden sm:block bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 sm:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4 lg:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                    Today's Attendance
                  </dt>
                  <dd className="text-base sm:text-lg lg:text-xl font-medium text-gray-900">
                    {stats.todayAttendance}
                  </dd>
                </dl>
              </div>
            </div>
          </motion.div>
        </div>

        {/* New Joinings */}
        <div className="mt-4 sm:mt-6 mb-3 sm:mb-4 lg:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
                  New Joinings ({studentRoster.length})
                </h3>
              </div>
            </div>

            {studentRoster.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-500 text-xs sm:text-sm">
                  No new joinings pending for this academic year.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-auto pr-1">
                {studentRoster.slice(0, 50).map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => openStudentDatesModal(s)}
                    className="w-full text-left flex items-center justify-between gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {s.rollNumber}
                        {resolveStudentCategoryLabel(s) !== '—'
                          ? ` · ${resolveStudentCategoryLabel(s)}`
                          : ''}
                      </p>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      Room {s.roomNumber || '—'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category room availability */}
        <div className="mt-4 sm:mt-6 mb-3 sm:mb-4 lg:mb-6">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                  <span className="sm:hidden">Rooms</span>
                  <span className="hidden sm:inline">Category rooms & availability</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => selectedCategoryId && fetchCategoryRooms(selectedCategoryId)}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs sm:text-sm text-green-700 border border-green-200 rounded-md hover:bg-green-50"
                disabled={!selectedCategoryId || loadingRooms}
                aria-label="Refresh"
                title="Refresh"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loadingRooms ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="text-center py-6 sm:py-8">
                <p className="text-gray-500 text-xs sm:text-sm">No categories found for your assigned hostel.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                  {categories.map((cat) => {
                    const id = getCategoryId(cat);
                    const active = id === selectedCategoryId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedCategoryId(id)}
                        className={`px-3 py-1.5 rounded-md text-xs sm:text-sm border transition-colors ${
                          active
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-green-300'
                        }`}
                      >
                        {getCategoryName(cat)}
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-gray-600 mb-3">
                  <span>{selectedRooms.length} rooms</span>
                  <span>{availableRoomCount} with free beds</span>
                  <span>{totalAvailableBeds} beds free</span>
                  <span className="text-gray-400">Live · updates every 45s</span>
                </div>

                {loadingRooms && selectedRooms.length === 0 ? (
                  <div className="text-center py-6 text-sm text-gray-500">Loading rooms…</div>
                ) : selectedRooms.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <p className="text-gray-500 text-xs sm:text-sm">No rooms in this category.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    {selectedRooms.map((room) => {
                      const beds = room.bedCount || 0;
                      const available = room.availableBeds || 0;
                      const filled = Math.max(0, beds - available);
                      const isFull = available <= 0;
                      return (
                        <div
                          key={room._id || room.roomNumber}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                            isFull
                              ? 'bg-red-50 border-red-100'
                              : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              Room {room.roomNumber}
                            </p>
                            <p className="text-xs text-gray-500">
                              {filled}/{beds} occupied
                              {room.staffCount ? ` · ${room.staffCount} staff` : ''}
                            </p>
                          </div>
                          <div
                            className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${
                              isFull ? 'text-red-600' : 'text-green-700'
                            }`}
                          >
                            {isFull ? 'Full' : `${available} free`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mb-3 sm:mb-4 lg:mb-6 lg:hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6"
          >
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <button
                onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
              >
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Take Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
              >
                <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                View Attendance
              </button>
              <button
                onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
                className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
              >
                <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                Bulk Outing
              </button>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <MegaphoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Latest Announcements</h3>
                </div>
              </div>
              <div className="space-y-3 sm:space-y-4">
                {announcements.length === 0 ? (
                  <div className="text-center py-6 sm:py-8">
                    <MegaphoneIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                    <p className="text-gray-500 text-xs sm:text-sm">No announcements</p>
                  </div>
                ) : (
                  announcements.slice(0, 5).map((announcement) => (
                    <div key={announcement._id} className="p-3 sm:p-4 bg-gray-50 rounded-lg flex flex-col gap-2">
                      {announcement.imageUrl && (
                        <img
                          src={announcement.imageUrl}
                          alt={announcement.title}
                          className="w-full h-24 sm:h-32 object-cover rounded mb-2 border"
                          style={{ maxHeight: '130px' }}
                        />
                      )}
                      <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">{announcement.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{announcement.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(announcement.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4 sm:mb-6">
                <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Quick Actions</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={() => window.location.href = '/warden/dashboard/take-attendance'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Take Attendance
                </button>
                <button
                  onClick={() => window.location.href = '/warden/dashboard/view-attendance'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  View Attendance
                </button>
                <button
                  onClick={() => window.location.href = '/warden/dashboard/bulk-outing'}
                  className="w-full flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-xs sm:text-sm"
                >
                  <UserGroupIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  Bulk Outing
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </p>
        </div>
      </div>

      {datesModalOpen && selectedStudentForDates && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Update Dates & Room
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {selectedStudentForDates.name} ({selectedStudentForDates.rollNumber})
                </p>
                <p className="text-xs text-gray-500 mt-1">Academic year: {academicYear}</p>
              </div>
              <button
                type="button"
                onClick={closeStudentDatesModal}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  value={resolveStudentCategoryLabel(selectedStudentForDates)}
                  readOnly
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-700"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Room
                </label>
                <select
                  value={roomNumberInput}
                  onChange={(e) => setRoomNumberInput(e.target.value)}
                  disabled={loadingModalRooms}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-50"
                >
                  <option value="">
                    {loadingModalRooms
                      ? 'Loading rooms…'
                      : modalCategoryId
                        ? 'Select room'
                        : 'No category — cannot load rooms'}
                  </option>
                  {roomNumberInput &&
                    !modalRooms.some((r) => String(r.roomNumber) === String(roomNumberInput)) && (
                      <option value={roomNumberInput}>
                        Room {roomNumberInput} (current)
                      </option>
                    )}
                  {modalRooms.map((room) => {
                    const available = Number(room.availableBeds) || 0;
                    const beds = Number(room.bedCount) || 0;
                    const occupied =
                      room.totalOccupancy != null
                        ? Number(room.totalOccupancy) || 0
                        : Math.max(0, beds - available);
                    const isCurrent = String(room.roomNumber) === String(selectedStudentForDates?.roomNumber || '');
                    const isSelected = String(room.roomNumber) === String(roomNumberInput);
                    const label = isCurrent
                      ? `Room ${room.roomNumber} (${occupied}/${beds} live · ${available} free · current)`
                      : `Room ${room.roomNumber} (${occupied}/${beds} live · ${available} free)`;
                    const disabled = available <= 0 && !isCurrent && !isSelected;
                    return (
                      <option
                        key={room._id || room.roomNumber}
                        value={room.roomNumber}
                        disabled={disabled}
                      >
                        {label}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {loadingModalRooms
                    ? 'Loading live room vacancy…'
                    : modalRooms.length
                      ? 'Live vacancy (active occupants). Full rooms are disabled unless already assigned.'
                      : modalCategoryId
                        ? 'No rooms found for this category.'
                        : 'Student has no category — cannot load rooms.'}
                </p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Admit Date
                </label>
                <input
                  type="date"
                  value={admitDateInput}
                  onChange={(e) => setAdmitDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Joining Date
                </label>
                <input
                  type="date"
                  value={joiningDateInput}
                  onChange={(e) => setJoiningDateInput(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={closeStudentDatesModal}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={savingDates}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveStudentDates}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-60"
                disabled={savingDates}
              >
                {savingDates ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WardenHome;
