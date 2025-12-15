import React, { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/axios';
import { useCoursesBranches } from '../../context/CoursesBranchesContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  PlusIcon,
  TrashIcon,
  AcademicCapIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  Cog6ToothIcon,
  XMarkIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const academicYearOptions = () => {
  const current = new Date().getFullYear();
  const list = [];
  for (let i = -2; i <= 2; i += 1) {
    const year = current + i;
    list.push(`${year}-${year + 1}`);
  }
  return list;
};

const FeeStructureManagement = () => {
  const { courses = [] } = useCoursesBranches();

  const [hostels, setHostels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('structure'); // structure | additional
  const [showModal, setShowModal] = useState(false);
  const [selectedStructure, setSelectedStructure] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedYearsToApply, setSelectedYearsToApply] = useState([]);

  // Additional Fees state (mirrors Fee Management page behaviour)
  const [additionalFees, setAdditionalFees] = useState({});
  const [additionalFeesLoading, setAdditionalFeesLoading] = useState(false);
  const [showAdditionalFeeModal, setShowAdditionalFeeModal] = useState(false);
  const [selectedAdditionalFee, setSelectedAdditionalFee] = useState(null);
  const [availableCategories, setAvailableCategories] = useState([]); // fetched from API
  const [additionalFeeForm, setAdditionalFeeForm] = useState({
    feeType: '',
    amount: 0,
    description: '',
    isActive: true,
    categories: [],
    categoryAmounts: {},
  });
  const [additionalFeesFilter, setAdditionalFeesFilter] = useState({
    academicYear: academicYearOptions()[2],
  });
  const [additionalHostelId, setAdditionalHostelId] = useState('');
  const [additionalCategories, setAdditionalCategories] = useState([]);

  const [filters, setFilters] = useState({
    academicYear: academicYearOptions()[2],
    course: '',
    year: '',
    hostelId: '',
    categoryId: '',
  });

  const [form, setForm] = useState({
    academicYear: academicYearOptions()[2],
    course: '',
    year: '',
    hostelId: '',
    categoryId: '',
    amount: '',
  });

  const [rows, setRows] = useState([]);

  const loadHostels = async () => {
    try {
      const res = await api.get('/api/hostels');
      if (res.data.success) {
        const payload =
          res.data.data ||
          res.data.hostels ||
          res.data.data?.hostels ||
          [];
        setHostels(Array.isArray(payload) ? payload : []);
        // Preselect first hostel for additional fees if not already selected
        const firstHostelId = Array.isArray(payload) && payload.length > 0 ? payload[0]._id : '';
        if (!additionalHostelId && firstHostelId) {
          setAdditionalHostelId(firstHostelId);
          loadAdditionalCategories(firstHostelId);
        }
      } else {
        setHostels([]);
      }
    } catch (err) {
      console.error('Error loading hostels', err);
      toast.error('Failed to load hostels');
    }
  };

  const loadCategories = async (hostelId) => {
    if (!hostelId) {
      setCategories([]);
      return;
    }
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        const payload =
          res.data.data ||
          res.data.categories ||
          res.data.data?.categories ||
          [];
        setCategories(Array.isArray(payload) ? payload : []);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Error loading categories', err);
      toast.error('Failed to load categories');
    }
  };

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/fee-structures', { params: filters });
      if (res.data.success) {
        setRows(res.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching fee structures', err);
      toast.error(err.response?.data?.message || 'Failed to fetch fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHostels();
  }, []);

  useEffect(() => {
    fetchRows();
  }, [filters.academicYear, filters.course, filters.year, filters.hostelId, filters.categoryId]);

  useEffect(() => {
    if (form.hostelId) {
      loadCategories(form.hostelId);
    } else {
      setCategories([]);
    }
  }, [form.hostelId]);

  // Fetch additional fees for the selected academic year
  const fetchAdditionalFees = useCallback(async () => {
    if (!additionalFeesFilter.academicYear) {
      setAdditionalFees({});
      return;
    }
    // Require hostel to scope additional fees; if not selected, clear and return
    if (!additionalHostelId) {
      setAdditionalFees({});
      return;
    }
    try {
      setAdditionalFeesLoading(true);
      const res = await api.get(`/api/admin/fee-structures/additional-fees/${additionalFeesFilter.academicYear}`, {
        params: { hostelId: additionalHostelId },
      });
      if (res.data.success) {
        const data = res.data.data || {};
        // Attach hostelId for UI clarity
        const withHostel = {};
        Object.keys(data).forEach((key) => {
          withHostel[key] = { ...data[key], hostelId: additionalHostelId };
        });
        setAdditionalFees(withHostel);
      } else {
        setAdditionalFees({});
      }
    } catch (err) {
      console.error('Error fetching additional fees', err);
      setAdditionalFees({});
    } finally {
      setAdditionalFeesLoading(false);
    }
  }, [additionalFeesFilter.academicYear, additionalHostelId]);

  useEffect(() => {
    if (activeTab === 'additional') {
      fetchAdditionalFees();
    }
  }, [activeTab, additionalFeesFilter.academicYear, additionalHostelId, fetchAdditionalFees]);

  const getAvailableYearsForCourse = useCallback((courseName) => {
    if (!courseName) return [];
    const course = courses.find(c => c.name === courseName);
    if (!course) return [];
    return Array.from({ length: course.duration || 4 }, (_, i) => i + 1);
  }, [courses]);

  // Additional Fees helpers
  const openAdditionalFeeModal = (feeType = null) => {
    // Ensure a hostel is selected; fallback to first hostel
    if (!additionalHostelId && hostels.length > 0) {
      const firstId = hostels[0]._id;
      setAdditionalHostelId(firstId);
      loadAdditionalCategories(firstId);
    }

    if (feeType && additionalFees[feeType]) {
      const feeData = additionalFees[feeType];
      const categoryAmounts = {};
      if (feeData.categoryAmounts && typeof feeData.categoryAmounts === 'object') {
        Object.keys(feeData.categoryAmounts).forEach((cat) => {
          categoryAmounts[cat] = feeData.categoryAmounts[cat] || 0;
        });
      } else if (feeData.amount !== undefined) {
        const cats = Array.isArray(feeData.categories) && feeData.categories.length > 0 ? feeData.categories : additionalCategories;
        cats.forEach((cat) => { categoryAmounts[cat] = feeData.amount || 0; });
      }
      setSelectedAdditionalFee(feeType);
      setAdditionalFeeForm({
        feeType,
        amount: feeData.amount || 0,
        description: feeData.description || '',
        isActive: feeData.isActive !== undefined ? feeData.isActive : true,
        categories: Array.isArray(feeData.categories) && feeData.categories.length > 0 ? feeData.categories : additionalCategories,
        categoryAmounts,
      });
    } else {
      setSelectedAdditionalFee(null);
      setAdditionalFeeForm({
        feeType: '',
        amount: 0,
        description: '',
        isActive: true,
        categories: additionalCategories,
        categoryAmounts: {},
      });
    }
    setShowAdditionalFeeModal(true);
  };

  const handleAdditionalFeeSubmit = async (e) => {
    e.preventDefault();
    if (!additionalFeesFilter.academicYear) {
      toast.error('Please select an academic year');
      return;
    }
    if (!additionalHostelId) {
      toast.error('Please select a hostel to load categories');
      return;
    }
    if (!additionalFeeForm.feeType || !additionalFeeForm.feeType.trim()) {
      toast.error('Please enter a fee type name');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(additionalFeeForm.feeType.trim()) || additionalFeeForm.feeType.trim().length > 50) {
      toast.error('Fee type name must be alphanumeric with underscores only, max 50 characters');
      return;
    }

    const categoryAmounts = {};
    let hasValidAmount = false;
    (additionalFeeForm.categories || []).forEach((cat) => {
      const amount = Number(additionalFeeForm.categoryAmounts?.[cat]) || 0;
      if (amount < 0) {
        toast.error(`Amount for category ${cat} must be non-negative`);
        return;
      }
      if (amount > 0) hasValidAmount = true;
      categoryAmounts[cat] = amount;
    });

    if (!additionalFeeForm.categories || additionalFeeForm.categories.length === 0) {
      toast.error('Please select at least one category');
      return;
    }
    if (!hasValidAmount) {
      toast.error('Enter at least one amount greater than 0');
      return;
    }

    try {
      setAdditionalFeesLoading(true);
      const updatedAdditionalFees = { ...additionalFees };
      if (selectedAdditionalFee && selectedAdditionalFee !== additionalFeeForm.feeType.trim()) {
        delete updatedAdditionalFees[selectedAdditionalFee];
      }

      const amounts = Object.values(categoryAmounts).filter((amt) => amt > 0);
      const averageAmount = amounts.length > 0 ? (amounts.reduce((sum, a) => sum + a, 0) / amounts.length) : 0;

      updatedAdditionalFees[additionalFeeForm.feeType.trim()] = {
        categoryAmounts,
        amount: averageAmount,
        description: additionalFeeForm.description || '',
        isActive: additionalFeeForm.isActive !== undefined ? additionalFeeForm.isActive : true,
        categories: Array.isArray(additionalFeeForm.categories) && additionalFeeForm.categories.length > 0
          ? additionalFeeForm.categories
          : additionalCategories,
      };

      const res = await api.post('/api/admin/fee-structures/additional-fees', {
        academicYear: additionalFeesFilter.academicYear,
        additionalFees: updatedAdditionalFees,
      });

      if (res.data.success) {
        toast.success(`Additional fee ${selectedAdditionalFee ? 'updated' : 'created'} successfully`);
        setAdditionalFees(updatedAdditionalFees);
        setShowAdditionalFeeModal(false);
        setSelectedAdditionalFee(null);
        setAdditionalFeeForm({
          feeType: '',
          amount: 0,
          description: '',
          isActive: true,
          categories: additionalCategories,
          categoryAmounts: {},
        });
      } else {
        toast.error(res.data.message || 'Failed to save additional fee');
      }
    } catch (err) {
      console.error('Error saving additional fee', err);
      toast.error(err.response?.data?.message || 'Failed to save additional fee');
    } finally {
      setAdditionalFeesLoading(false);
    }
  };

  const deleteAdditionalFee = async (feeType) => {
    if (!window.confirm(`Delete additional fee "${feeType}"?`)) return;
    try {
      setAdditionalFeesLoading(true);
      const updatedAdditionalFees = { ...additionalFees };
      delete updatedAdditionalFees[feeType];
      const res = await api.post('/api/admin/fee-structures/additional-fees', {
        academicYear: additionalFeesFilter.academicYear,
        additionalFees: updatedAdditionalFees,
      });
      if (res.data.success) {
        toast.success('Additional fee deleted');
        setAdditionalFees(updatedAdditionalFees);
      } else {
        toast.error(res.data.message || 'Failed to delete additional fee');
      }
    } catch (err) {
      console.error('Error deleting additional fee', err);
      toast.error(err.response?.data?.message || 'Failed to delete additional fee');
    } finally {
      setAdditionalFeesLoading(false);
    }
  };

  const toggleAdditionalFeeStatus = async (feeType) => {
    try {
      setAdditionalFeesLoading(true);
      const updatedAdditionalFees = { ...additionalFees };
      if (updatedAdditionalFees[feeType]) {
        updatedAdditionalFees[feeType] = {
          ...updatedAdditionalFees[feeType],
          isActive: !updatedAdditionalFees[feeType].isActive,
        };
      }
      const res = await api.post('/api/admin/fee-structures/additional-fees', {
        academicYear: additionalFeesFilter.academicYear,
        additionalFees: updatedAdditionalFees,
      });
      if (res.data.success) {
        toast.success(`Additional fee ${updatedAdditionalFees[feeType].isActive ? 'activated' : 'deactivated'} successfully`);
        setAdditionalFees(updatedAdditionalFees);
      } else {
        toast.error(res.data.message || 'Failed to update additional fee');
      }
    } catch (err) {
      console.error('Error toggling additional fee status', err);
      toast.error(err.response?.data?.message || 'Failed to update additional fee');
    } finally {
      setAdditionalFeesLoading(false);
    }
  };

  // Fetch available categories for additional fees based on selected hostel
  const loadAdditionalCategories = useCallback(async (hostelId) => {
    if (!hostelId) {
      setAdditionalCategories([]);
      setAvailableCategories([]);
      setAdditionalFeeForm((prev) => ({ ...prev, categories: [], categoryAmounts: {} }));
      return;
    }
    try {
      const res = await api.get(`/api/hostels/${hostelId}/categories`);
      if (res.data.success) {
        const payload =
          res.data.data ||
          res.data.categories ||
          res.data.data?.categories ||
          [];
        const cats = Array.isArray(payload) ? payload : [];
        const catNames = cats
          .map((c) => (typeof c === 'string' ? c : c?.name))
          .filter(Boolean);
        setAdditionalCategories(catNames);
        setAvailableCategories(catNames);
        setAdditionalFeeForm((prev) => ({
          ...prev,
          categories: catNames,
          categoryAmounts: {},
        }));
      } else {
        setAdditionalCategories([]);
        setAvailableCategories([]);
        setAdditionalFeeForm((prev) => ({ ...prev, categories: [], categoryAmounts: {} }));
      }
    } catch (err) {
      console.error('Error fetching categories', err);
      setAdditionalCategories([]);
      setAvailableCategories([]);
      setAdditionalFeeForm((prev) => ({ ...prev, categories: [], categoryAmounts: {} }));
    }
  }, []);

  useEffect(() => {
    if (additionalHostelId) {
      loadAdditionalCategories(additionalHostelId);
    } else {
      setAdditionalCategories([]);
      setAvailableCategories([]);
      setAdditionalFeeForm((prev) => ({ ...prev, categories: [], categoryAmounts: {} }));
    }
  }, [additionalHostelId, loadAdditionalCategories]);

  const resetForm = () => {
    setForm({
      academicYear: filters.academicYear,
      course: '',
      year: '',
      hostelId: '',
      categoryId: '',
      amount: '',
    });
    setSelectedStructure(null);
    setIsEditMode(false);
    setSelectedYearsToApply([]);
    setCategories([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.academicYear || !form.course || !form.year || form.amount === '') {
      toast.error('Academic year, course, year, and amount are required');
      return;
    }
    setSaving(true);
    try {
      const course = courses.find(c => c.name === form.course);
      if (!course) {
        toast.error('Course not found');
        return;
      }

      const currentYear = parseInt(form.year);
      const yearsToSave = [currentYear, ...selectedYearsToApply].filter((year, index, self) => self.indexOf(year) === index);

      const savePromises = yearsToSave.map(async (year) => {
        const payload = {
          academicYear: form.academicYear,
          course: form.course,
          year: year,
          hostelId: form.hostelId || undefined,
          categoryId: form.categoryId || undefined,
          feeType: 'Hostel Fee',
          amount: Number(form.amount),
        };
        if (isEditMode && selectedStructure) {
          return api.put(`/api/admin/fee-structures/${selectedStructure._id}`, payload);
        } else {
          return api.post('/api/admin/fee-structures', payload);
        }
      });

      const responses = await Promise.allSettled(savePromises);
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value?.data?.success).length;
      const failed = responses.length - successful;

      if (successful > 0) {
        toast.success(
          yearsToSave.length === 1
            ? `Fee rule ${isEditMode ? 'updated' : 'created'} successfully!`
            : `Fee rule ${isEditMode ? 'updated' : 'created'} for ${successful} year(s)!${failed > 0 ? ` ${failed} failed.` : ''}`
        );
        resetForm();
        setShowModal(false);
        fetchRows();
      } else {
        toast.error('Failed to save fee rule(s)');
      }
    } catch (err) {
      console.error('Error saving fee rule', err);
      toast.error(err.response?.data?.message || 'Failed to save fee rule');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row) => {
    setSelectedStructure(row);
    setIsEditMode(true);
    const hostelId = typeof row.hostelId === 'object' ? row.hostelId?._id : row.hostelId;
    const categoryId = typeof row.categoryId === 'object' ? row.categoryId?._id : row.categoryId;
    setForm({
      academicYear: row.academicYear || '',
      course: row.course || '',
      year: String(row.year || ''),
      hostelId: hostelId || '',
      categoryId: categoryId || '',
      amount: String(row.amount || ''),
    });
    if (hostelId) {
      loadCategories(hostelId);
    }
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this fee rule?')) return;
    try {
      const res = await api.delete(`/api/admin/fee-structures/${id}`);
      if (res.data.success) {
        toast.success('Fee rule deleted');
        fetchRows();
      }
    } catch (err) {
      console.error('Error deleting fee rule', err);
      toast.error(err.response?.data?.message || 'Failed to delete fee rule');
    }
  };

  const openModal = (structure = null) => {
    if (structure) {
      handleEdit(structure);
    } else {
      resetForm();
      setShowModal(true);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };
      if (key === 'hostelId') {
        updated.categoryId = '';
      }
      return updated;
    });
  };

  // Group structures by academic year, course, year, hostel, category, and fee type
  const groupedStructures = useMemo(() => {
    const groups = {};
    rows.forEach((row) => {
      const key = `${row.academicYear}-${row.course}-${row.year}-${row.hostelId?._id || row.hostelId || 'all'}-${row.categoryId?._id || row.categoryId || 'all'}-${row.feeType}`;
      if (!groups[key]) {
        groups[key] = {
          academicYear: row.academicYear,
          course: row.course,
          year: row.year,
          hostelId: row.hostelId,
          categoryId: row.categoryId,
          feeType: row.feeType,
          amount: row.amount,
          _id: row._id,
        };
      }
    });
    return Object.values(groups);
  }, [rows]);

  const renderStructureTab = () => (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Fee Structure Management</h2>
          <div className="flex gap-2">
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              disabled={courses.length === 0}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Fee Structure</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Academic Year
              </label>
              <select
                value={filters.academicYear}
                onChange={(e) => handleFilterChange('academicYear', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {academicYearOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Course
              </label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Courses</option>
                {courses?.map((c) => (
                  <option key={c._id || c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Year
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="Year"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Hostel
              </label>
              <select
                value={filters.hostelId}
                onChange={(e) => handleFilterChange('hostelId', e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Hostels</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Filter Summary and Clear Button */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing {rows.length} fee rule{rows.length !== 1 ? 's' : ''}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFilters({
                  academicYear: academicYearOptions()[2],
                  course: '',
                  year: '',
                  hostelId: '',
                  categoryId: '',
                });
              }}
              className="px-3 py-1.5 sm:py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 text-xs sm:text-sm flex items-center gap-1"
            >
              <FunnelIcon className="w-4 h-4" />
              Clear Filters
            </button>
            <button
              onClick={fetchRows}
              className="px-3 py-1.5 sm:py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 text-xs sm:text-sm flex items-center gap-1"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No fee structures found matching the current filters</p>
              <p className="text-sm text-gray-400 mt-2">
                Try adjusting your filters or create new fee structures.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Academic Year
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Course
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Year
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Hostel
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Category
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rows.map((row) => (
                        <tr key={row._id} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                            <div className="flex items-center">
                              <AcademicCapIcon className="w-4 h-4 text-blue-500 mr-2" />
                              {row.academicYear}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                            <div className="flex items-center">
                              <UserGroupIcon className="w-4 h-4 text-green-500 mr-2" />
                              {row.course}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200">
                            <div className="flex items-center justify-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Year {row.year}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                            {row.hostelId?.name || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 border-r border-gray-200">
                            {row.categoryId?.name || '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center border-r border-gray-200">
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                              <div className="text-lg font-bold text-green-700">
                                ₹{row.amount?.toLocaleString() || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-center">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openModal(row)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors duration-200"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(row._id)}
                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors duration-200"
                                title="Delete"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {rows.map((row) => (
                  <div
                    key={row._id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <AcademicCapIcon className="w-4 h-4 text-blue-500 mr-2" />
                          <span className="text-sm font-semibold text-gray-900">{row.academicYear}</span>
                        </div>
                        <div className="flex items-center mb-1">
                          <UserGroupIcon className="w-4 h-4 text-green-500 mr-2" />
                          <span className="text-sm font-medium text-gray-700">{row.course}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-gray-600">
                            Hostel: <span className="font-medium">{row.hostelId?.name || 'All'}</span>
                          </div>
                          <div className="text-xs text-gray-600">
                            Category: <span className="font-medium">{row.categoryId?.name || 'All'}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Year {row.year}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200 mb-2">
                          <div className="text-base sm:text-lg font-bold text-green-700">
                            ₹{row.amount?.toLocaleString() || 0}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(row)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded hover:bg-blue-50"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(row._id)}
                            className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fee Structure Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Edit Fee Structure' : 'Add Fee Structure'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={form.academicYear}
                      onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      {academicYearOptions().map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Course (SQL)
                    </label>
                    <select
                      value={form.course}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, course: e.target.value, year: '' }));
                        setSelectedYearsToApply([]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select Course</option>
                      {courses?.map((c) => (
                        <option key={c._id || c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year of Study
                    </label>
                    <select
                      value={form.year}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, year: e.target.value }));
                        setSelectedYearsToApply([]);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                      disabled={!form.course}
                    >
                      <option value="">
                        {!form.course ? 'Select Course first' : 'Select Year'}
                      </option>
                      {getAvailableYearsForCourse(form.course).map(year => (
                        <option key={year} value={String(year)}>Year {year}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hostel
                    </label>
                    <select
                      value={form.hostelId}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, hostelId: e.target.value, categoryId: '' }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Hostels</option>
                      {hostels.map((h) => (
                        <option key={h._id} value={h._id}>{h.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={!form.hostelId}
                    >
                      <option value="">All Categories</option>
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Type
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700">
                      Hostel Fee
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                </div>

                {/* Apply to Other Years Section */}
                {form.course && form.year && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <AcademicCapIcon className="w-4 h-4 text-blue-600 mr-2" />
                      Apply Same Values to Other Years
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Select additional years to apply the same fee structure values. The current year (Year {form.year}) will always be saved.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {getAvailableYearsForCourse(form.course)
                        .filter(year => year !== parseInt(form.year))
                        .map(year => (
                          <label key={year} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedYearsToApply.includes(year)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedYearsToApply(prev => [...prev, year]);
                                } else {
                                  setSelectedYearsToApply(prev => prev.filter(y => y !== year));
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Year {year}</span>
                          </label>
                        ))}
                    </div>
                    {selectedYearsToApply.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-800">
                        Will apply to: Year {form.year} (current) + {selectedYearsToApply.length} other year(s)
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  const renderAdditionalTab = () => (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Additional Fees Setup</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Configure additional fees (caution deposit, diesel charges, etc.) per academic year with category-specific amounts.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openAdditionalFeeModal()}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
              disabled={!additionalFeesFilter.academicYear}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Add Additional Fee</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <select
                value={additionalFeesFilter.academicYear}
                onChange={(e) => setAdditionalFeesFilter((p) => ({ ...p, academicYear: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {academicYearOptions().map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hostel
              </label>
              <select
                value={additionalHostelId}
                onChange={(e) => setAdditionalHostelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Select hostel</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>{h.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {additionalFeesLoading ? (
          <div className="flex justify-center items-center py-12">
            <LoadingSpinner />
            <p className="ml-3 text-gray-500">Loading additional fees...</p>
          </div>
        ) : !additionalFeesFilter.academicYear ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-lg">Select an academic year to view additional fees</p>
          </div>
        ) : Object.keys(additionalFees).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <PlusIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 text-lg mb-2">No additional fees configured</p>
            <p className="text-sm text-gray-400 mb-4">Click "Add Additional Fee" to create a new fee type</p>
            <button
              onClick={() => openAdditionalFeeModal()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              disabled={!additionalFeesFilter.academicYear}
            >
              Add Additional Fee
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(additionalFees).map(([feeType, feeData]) => (
              <div
                key={feeType}
                className={`bg-white rounded-lg border-2 p-4 ${
                  feeData.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-90'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 capitalize">
                      {feeType.replace(/_/g, ' ')}
                    </h3>
                    {feeData.description && (
                      <p className="text-xs text-gray-600 mt-1">{feeData.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      feeData.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feeData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">Categories</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.isArray(feeData.categories) && feeData.categories.length > 0 ? (
                      feeData.categories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">All categories</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 mb-3">
                  {(() => {
                    const hostelId = typeof feeData.hostelId === 'object' ? feeData.hostelId?._id : feeData.hostelId;
                    const hostelName = hostels.find((h) => h._id === hostelId)?.name;
                    return hostelName ? `Hostel: ${hostelName}` : hostelId ? `Hostel: ${hostelId}` : 'Hostel: (not set)';
                  })()}
                </div>

                <div className="mb-3">
                  <div className="text-xl font-bold text-blue-600">
                    ₹{feeData.amount?.toLocaleString() || 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Average amount (category specific applied)</div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => openAdditionalFeeModal(feeType)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => toggleAdditionalFeeStatus(feeType)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      feeData.isActive
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {feeData.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => deleteAdditionalFee(feeType)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdditionalFeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedAdditionalFee ? 'Edit Additional Fee' : 'Add Additional Fee'}
              </h3>
              <button
                onClick={() => {
                  setShowAdditionalFeeModal(false);
                  setSelectedAdditionalFee(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdditionalFeeSubmit}>
              <div className="space-y-4">
                {/* Scope selectors inside modal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Academic Year
                    </label>
                    <select
                      value={additionalFeesFilter.academicYear}
                      onChange={(e) => setAdditionalFeesFilter((p) => ({ ...p, academicYear: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {academicYearOptions().map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hostel
                    </label>
                    <select
                      value={additionalHostelId}
                      onChange={(e) => setAdditionalHostelId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Select hostel</option>
                      {hostels.map((h) => (
                        <option key={h._id} value={h._id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fee Type
                    </label>
                    <input
                      type="text"
                      value={additionalFeeForm.feeType}
                      onChange={(e) => setAdditionalFeeForm((p) => ({ ...p, feeType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., caution_deposit"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6 sm:mt-0">
                    <label className="text-sm font-medium text-gray-700">Active</label>
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      checked={additionalFeeForm.isActive}
                      onChange={(e) => setAdditionalFeeForm((p) => ({ ...p, isActive: e.target.checked }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={additionalFeeForm.description}
                    onChange={(e) => setAdditionalFeeForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Short note about this fee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Specific Amounts
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {(additionalFeeForm.categories || []).map((cat) => (
                      <div key={cat} className="border border-gray-200 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">{cat}</div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={additionalFeeForm.categoryAmounts?.[cat] || ''}
                          onChange={(e) =>
                            setAdditionalFeeForm((p) => ({
                              ...p,
                              categoryAmounts: { ...p.categoryAmounts, [cat]: e.target.value },
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Amount"
                        />
                      </div>
                    ))}
                  </div>
                  {(!additionalFeeForm.categories || additionalFeeForm.categories.length === 0) && (
                    <p className="text-xs text-red-500 mt-2">No categories available. Please configure categories.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdditionalFeeModal(false);
                    setSelectedAdditionalFee(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={additionalFeesLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {additionalFeesLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900 mb-1 sm:mb-2">
            Fee Structure Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage fee structures mapped to courses, hostels, and categories
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-gray-200 overflow-x-auto">
            <nav className="-mb-px flex space-x-2 sm:space-x-4 lg:space-x-8 min-w-max">
              <button
                onClick={() => setActiveTab('structure')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Fee Structure
              </button>
              <button
                onClick={() => setActiveTab('additional')}
                className={`py-2 px-2 sm:px-3 lg:px-4 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'additional'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Additional Fees Setup
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'structure' ? renderStructureTab() : renderAdditionalTab()}
      </div>
    </div>
  );
};

export default FeeStructureManagement;
