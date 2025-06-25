import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  CalendarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';

const BulkOuting = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkOutings, setBulkOutings] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    outingDate: '',
    reason: ''
  });
  
  // Filters
  const [filters, setFilters] = useState({
    course: '',
    branch: '',
    gender: '',
    category: '',
    roomNumber: '',
    batch: '',
    academicYear: '',
    hostelStatus: 'Active'
  });

  useEffect(() => {
    fetchStudents();
    fetchBulkOutings();
  }, [filters]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/bulk-outing/warden/students?${params}`);
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchBulkOutings = async () => {
    try {
      const response = await api.get('/api/bulk-outing/warden');
      if (response.data.success) {
        setBulkOutings(response.data.data.bulkOutings);
      }
    } catch (error) {
      console.error('Error fetching bulk outings:', error);
      toast.error('Failed to fetch bulk outing history');
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(student => student._id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.outingDate || !formData.reason) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/bulk-outing/create', {
        outingDate: formData.outingDate,
        reason: formData.reason,
        selectedStudentIds: selectedStudents,
        filters: filters
      });

      if (response.data.success) {
        toast.success(`Bulk outing request created for ${selectedStudents.length} students`);
        setFormData({ outingDate: '', reason: '' });
        setSelectedStudents([]);
        fetchBulkOutings();
      }
    } catch (error) {
      console.error('Error creating bulk outing:', error);
      toast.error(error.response?.data?.message || 'Failed to create bulk outing request');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'text-green-600 bg-green-50';
      case 'Rejected':
        return 'text-red-600 bg-red-50';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      case 'Pending':
        return <ExclamationCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <SEO title="Bulk Outing Management" />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">
          Bulk Outing Management
        </h1>
        <p className="text-gray-600 mt-2">
          Create outing requests for multiple students simultaneously
        </p>
      </div>

      {/* Toggle between form and history */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setShowHistory(false)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            !showHistory
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Create Outing
        </button>
        <button
          onClick={() => setShowHistory(true)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showHistory
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          View History
        </button>
      </div>

      {!showHistory ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Bulk Outing</h3>
          <p className="text-gray-600">Bulk outing form will be implemented here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bulk Outing History</h3>
          <p className="text-gray-600">Bulk outing history will be displayed here.</p>
        </div>
      )}
    </div>
  );
};

export default BulkOuting; 