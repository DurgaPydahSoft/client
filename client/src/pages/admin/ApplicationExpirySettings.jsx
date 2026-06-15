import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  CalendarDaysIcon,
  AcademicCapIcon,
  ChevronRightIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import { canPerformAction } from '../../utils/permissionUtils';

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -2; i <= 3; i++) {
    const y = currentYear + i;
    years.push(`${y}-${y + 1}`);
  }
  return years;
};

const getAcademicYearEndYear = (academicYear) => {
  if (!academicYear || !/^\d{4}-\d{4}$/.test(academicYear)) return null;
  return parseInt(academicYear.split('-')[1], 10);
};

const configToDateInputValue = (academicYear, month, day) => {
  const endYear = getAcademicYearEndYear(academicYear);
  if (!endYear || !month || !day) return '';
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${endYear}-${m}-${d}`;
};

const dateInputToMonthDay = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  return {
    month: parseInt(parts[1], 10),
    day: parseInt(parts[2], 10)
  };
};

const formatDateLabel = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ApplicationExpirySettings = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const canManage = isSuperAdmin || canPerformAction(user, 'student_management', 'edit');

  const academicYears = useMemo(() => generateAcademicYears(), []);
  const defaultAY = academicYears.includes('2026-2027')
    ? '2026-2027'
    : (academicYears[2] || academicYears[0] || '');

  const [courses, setCourses] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAY, setSelectedAY] = useState(defaultAY);
  const [modalCourse, setModalCourse] = useState(null);
  const [modalYearDates, setModalYearDates] = useState({});
  const [modalConfigIds, setModalConfigIds] = useState({});
  const [saving, setSaving] = useState(false);

  const activeCourses = useMemo(
    () => courses.filter((c) => c.isActive !== false).sort((a, b) => a.name.localeCompare(b.name)),
    [courses]
  );

  const configsForAY = useMemo(
    () => configs.filter((c) => c.academicYear === selectedAY && c.isActive !== false),
    [configs, selectedAY]
  );

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedAY) fetchConfigs();
  }, [selectedAY]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/api/course-management/courses');
      if (res.data.success) {
        setCourses(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load courses');
    }
  };

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/application-expiry-config', {
        params: { academicYear: selectedAY }
      });
      if (res.data.success) {
        setConfigs(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load expiry settings');
    } finally {
      setLoading(false);
    }
  };

  const getCourseConfigSummary = (course) => {
    const duration = course.duration || 4;
    const courseConfigs = configsForAY.filter((c) => c.courseName === course.name);
    return { configured: courseConfigs.length, total: duration };
  };

  const openCourseModal = (course) => {
    const duration = course.duration || 4;
    const dates = {};
    const ids = {};

    for (let y = 1; y <= duration; y++) {
      const existing = configsForAY.find(
        (c) => c.courseName === course.name && c.yearOfStudy === y
      );
      dates[y] = existing
        ? configToDateInputValue(selectedAY, existing.expiryMonth, existing.expiryDay)
        : '';
      if (existing) ids[y] = existing._id;
    }

    setModalCourse(course);
    setModalYearDates(dates);
    setModalConfigIds(ids);
  };

  const closeModal = () => {
    setModalCourse(null);
    setModalYearDates({});
    setModalConfigIds({});
  };

  const handleSaveModal = async () => {
    if (!canManage || !modalCourse) return;
    setSaving(true);

    const duration = modalCourse.duration || 4;
    let saved = 0;
    let removed = 0;

    try {
      for (let y = 1; y <= duration; y++) {
        const dateVal = modalYearDates[y];
        const existingId = modalConfigIds[y];

        if (!dateVal) {
          if (existingId) {
            await api.delete(`/api/admin/application-expiry-config/${existingId}`);
            removed += 1;
          }
          continue;
        }

        const parts = dateInputToMonthDay(dateVal);
        if (!parts) continue;

        await api.post('/api/admin/application-expiry-config', {
          academicYear: selectedAY,
          courseName: modalCourse.name,
          yearOfStudy: y,
          expiryMonth: parts.month,
          expiryDay: parts.day,
          isActive: true
        });
        saved += 1;
      }

      toast.success(
        saved || removed
          ? `${modalCourse.name}: ${saved} saved${removed ? `, ${removed} cleared` : ''}`
          : 'No dates to save'
      );
      await fetchConfigs();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const endYear = getAcademicYearEndYear(selectedAY);
  const dateMin = endYear ? `${endYear}-01-01` : undefined;
  const dateMax = endYear ? `${endYear}-12-31` : undefined;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <SEO title="Application Expiry Settings" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CalendarDaysIcon className="w-7 h-7 text-blue-600" />
          Application Expiry Settings
        </h1>
        <p className="text-gray-600 mt-1 text-sm">
          Select academic year, then open a course to set expiry dates for each year of study.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Year</label>
        <select
          value={selectedAY}
          onChange={(e) => {
            setSelectedAY(e.target.value);
            closeModal();
          }}
          className="w-full sm:w-72 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {academicYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : activeCourses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500">
          No courses found. Add courses in Course Management first.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {activeCourses.map((course) => {
            const { configured, total } = getCourseConfigSummary(course);
            const complete = configured === total && total > 0;

            return (
              <button
                key={course._id}
                type="button"
                onClick={() => openCourseModal(course)}
                className="bg-white rounded-xl shadow-md p-5 text-left hover:shadow-lg hover:border-blue-200 border border-transparent transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <AcademicCapIcon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{course.name}</h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {total} year{total !== 1 ? 's' : ''} programme
                      </p>
                      <p className={`text-xs mt-2 font-medium ${complete ? 'text-green-600' : 'text-amber-600'}`}>
                        {configured}/{total} years configured
                      </p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 shrink-0 mt-1" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {modalCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-xl">
            <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{modalCourse.name}</h2>
                <p className="text-sm text-gray-500">
                  Academic year {selectedAY} · {modalCourse.duration || 4} years
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Dates are in the end year ({endYear})
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-100 rounded-lg shrink-0"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {Array.from({ length: modalCourse.duration || 4 }, (_, i) => i + 1).map((yearNum) => (
                <div key={yearNum} className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-800">
                    Year {yearNum}
                  </label>
                  <input
                    type="date"
                    value={modalYearDates[yearNum] || ''}
                    onChange={(e) =>
                      setModalYearDates((prev) => ({ ...prev, [yearNum]: e.target.value }))
                    }
                    disabled={!canManage}
                    min={dateMin}
                    max={dateMax}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  {modalYearDates[yearNum] && (
                    <span className="text-xs text-gray-500">
                      Expires {formatDateLabel(modalYearDates[yearNum])}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {saving ? 'Saving...' : 'Save dates'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationExpirySettings;
