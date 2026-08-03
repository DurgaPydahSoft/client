import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  XMarkIcon,
  EyeIcon,
  UserIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';

const NOCManagement = () => {
  const { user } = useAuth();
  const [nocRequests, setNocRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [action, setAction] = useState(''); // 'verify' (approve), 'reject', or 'view'
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create NOC on behalf of student state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [nocReason, setNocReason] = useState('');
  const [vacatingDate, setVacatingDate] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedAY, setSelectedAY] = useState('');

  // Meter readings and Breakage fee state
  const [breakageFee, setBreakageFee] = useState('');
  const [breakageRemarks, setBreakageRemarks] = useState('');
  const [meterType, setMeterType] = useState('single');
  const [startUnits, setStartUnits] = useState('');
  const [endUnits, setEndUnits] = useState('');
  const [meter1StartUnits, setMeter1StartUnits] = useState('');
  const [meter1EndUnits, setMeter1EndUnits] = useState('');
  const [meter2StartUnits, setMeter2StartUnits] = useState('');
  const [meter2EndUnits, setMeter2EndUnits] = useState('');

  // Reason type dropdown state
  const [reasonType, setReasonType] = useState('');

  const getWardenHostelLabel = () => {
    if (user?.assignedHostel?.name) return user.assignedHostel.name;
    if (user?.assignedHostelId?.name) return user.assignedHostelId.name;
    if (user?.hostelType?.toLowerCase() === 'boys') return 'Boys Hostel';
    if (user?.hostelType?.toLowerCase() === 'girls') return 'Girls Hostel';
    return 'Assigned Hostel';
  };

  const resetFields = () => {
    setBreakageFee('');
    setBreakageRemarks('');
    setMeterType('single');
    setStartUnits('');
    setEndUnits('');
    setMeter1StartUnits('');
    setMeter1EndUnits('');
    setMeter2StartUnits('');
    setMeter2EndUnits('');
    setReasonType('');
  };

  const handleDiscardStudent = () => {
    setSelectedStudent(null);
    resetFields();
  };

  // Auto-select meter type based on selected student's room meter type
  useEffect(() => {
    if (selectedStudent) {
      const autoType = selectedStudent.room?.meterType || 'single';
      setMeterType(autoType);
    }
  }, [selectedStudent]);

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

  useEffect(() => {
    fetchNOCRequests();
  }, [filter]);

  // Fetch students when create modal is open and search or selectedAY changes
  useEffect(() => {
    if (showCreateModal && selectedAY) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [showCreateModal, studentSearch, selectedAY]);

  const fetchStudents = async () => {
    if (!selectedAY) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    try {
      const params = new URLSearchParams();
      if (studentSearch) params.append('search', studentSearch);
      params.append('academicYear', selectedAY);
      
      const response = await api.get(`/api/noc/warden/students?${params.toString()}`);
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleCreateNOC = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student');
      return;
    }

    const finalReason = reasonType === 'Other' ? nocReason.trim() : reasonType;
    if (!finalReason) {
      toast.error('Please select or enter a reason for NOC');
      return;
    }

    if (finalReason.length < 10) {
      toast.error('Reason must be at least 10 characters long');
      return;
    }

    if (!vacatingDate) {
      toast.error('Please select a vacating date');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/api/noc/warden/create', {
        studentId: selectedStudent._id,
        reason: finalReason,
        vacatingDate: vacatingDate,
        breakageFee: Number(breakageFee) || 0,
        breakageRemarks: breakageRemarks
      });

      if (response.data.success) {
        toast.success('NOC request created and approved successfully');
        setShowCreateModal(false);
        setSelectedStudent(null);
        setNocReason('');
        setVacatingDate('');
        setStudentSearch('');
        setSelectedAY('');
        resetFields();
        fetchNOCRequests();
      }
    } catch (error) {
      console.error('Error creating NOC:', error);
      toast.error(error.response?.data?.message || 'Failed to create NOC request');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchNOCRequests = async () => {
    try {
      const url = filter === 'all' ? '/api/noc/warden/all' : `/api/noc/warden/all?status=${filter}`;
      const response = await api.get(url);
      if (response.data.success) {
        setNocRequests(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching NOC requests:', error);
      toast.error('Failed to fetch NOC requests');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request, actionType) => {
    setSelectedRequest(request);
    setAction(actionType);
    setRemarks('');

    // Auto-select meter type based on request student's room or existing request meter readings
    if (actionType === 'verify') {
      const autoType = request.meterReadings?.meterType 
        || request.student?.room?.meterType 
        || 'single';
      setMeterType(autoType);
    }

    setShowModal(true);
  };

  const handleSubmitAction = async () => {
    if (!selectedRequest) return;

    setIsSubmitting(true);
    try {
      const requestId = selectedRequest.id || selectedRequest._id;
      const url = action === 'verify' 
        ? `/api/noc/warden/${requestId}/verify`
        : `/api/noc/warden/${requestId}/reject`;
      
      const payload = action === 'verify' 
        ? {
            remarks,
            breakageFee: Number(breakageFee) || 0,
            breakageRemarks: breakageRemarks
          }
        : { rejectionReason: remarks };

      const response = await api.post(url, payload);
      
      if (response.data.success) {
        toast.success(`NOC request ${action === 'verify' ? 'approved successfully (deactivation scheduled)' : 'rejected successfully'}`);
        setShowModal(false);
        setSelectedRequest(null);
        setRemarks('');
        resetFields();
        fetchNOCRequests();
      }
    } catch (error) {
      console.error(`Error ${action}ing NOC request:`, error);
      toast.error(error.response?.data?.message || `Failed to ${action} NOC request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'Approved':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'Rejected':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRequests = nocRequests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen">
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Toolbar: hostel badge + create + filter */}
          <div className="-mx-4 px-4 py-2.5 mb-3 bg-white border-b border-gray-100 sm:mx-0 sm:rounded-xl sm:shadow-sm sm:border-0 sm:p-4 sm:mb-6 flex items-center gap-2">
            {getWardenHostelLabel() && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-green-50 text-green-700 border border-green-200 flex-shrink-0">
                {getWardenHostelLabel()}
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1.5 text-[11px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 max-w-[7.5rem] sm:max-w-none"
              >
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-[11px] sm:text-sm font-medium"
              >
                <PlusIcon className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Create NOC</span>
                <span className="sm:hidden ml-1">Create</span>
              </button>
            </div>
          </div>

          {/* NOC Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="-mx-4 sm:mx-0 bg-white sm:rounded-lg shadow-sm border-y sm:border border-gray-200 p-6 sm:p-12 text-center">
              <DocumentTextIcon className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No NOC Requests</h3>
              <p className="text-sm sm:text-base text-gray-600">
                {filter === 'all' 
                  ? 'No NOC requests found.' 
                  : `No ${filter.toLowerCase()} NOC requests found.`
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="sm:hidden space-y-2.5">
                {filteredRequests.map((request, index) => (
                  <div
                    key={request.id || request._id || `noc-card-${index}`}
                    className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
                          {request.studentName}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {request.rollNumber}
                          {request.course?.name ? ` · ${request.course.name}` : ''}
                          {request.year ? ` · Y${request.year}` : ''}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          #{(request.id || request._id) ? (request.id || request._id).slice(-8).toUpperCase() : 'N/A'}
                          {request.academicYear ? ` · AY ${request.academicYear}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span>{request.status}</span>
                        </span>
                        {request.raisedBy === 'warden' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-800">
                            Warden
                          </span>
                        ) : request.raisedBy === 'admin' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                            Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-800">
                            Student
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-600 mb-2.5">
                      Vacating:{' '}
                      <span className="font-medium text-gray-800">
                        {request.vacatingDate
                          ? new Date(request.vacatingDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setAction('view');
                          setShowModal(true);
                        }}
                        className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {request.status === 'Pending' && (
                        <div className="grid grid-cols-2 gap-2 flex-1">
                          <button
                            onClick={() => handleAction(request, 'verify')}
                            className="px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(request, 'reject')}
                            className="px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          NOC ID
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Academics
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Vacating Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Raised By
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRequests.map((request, index) => (
                        <tr key={request.id || request._id || `noc-request-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                            #{(request.id || request._id) ? (request.id || request._id).slice(-8).toUpperCase() : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{request.studentName}</div>
                            <div className="text-xs text-gray-500">{request.rollNumber}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-gray-900">{request.course?.name}</div>
                            <div className="text-xs text-gray-500">Year {request.year} (AY: {request.academicYear})</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700 font-sans">
                            {request.vacatingDate ? new Date(request.vacatingDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {request.raisedBy === 'warden' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <UserIcon className="h-3 w-3 mr-1" />
                                Warden
                              </span>
                            ) : request.raisedBy === 'admin' ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <UserIcon className="h-3 w-3 mr-1" />
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                <UserIcon className="h-3 w-3 mr-1" />
                                Student
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                              {getStatusIcon(request.status)}
                              <span className="ml-1">{request.status}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setAction('view');
                                  setShowModal(true);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                              </button>
                              
                              {request.status === 'Pending' && (
                                <div className="flex space-x-1.5">
                                  <button
                                    onClick={() => handleAction(request, 'verify')}
                                    className="px-2.5 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200 whitespace-nowrap"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleAction(request, 'reject')}
                                    className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200 whitespace-nowrap"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Action Modal */}
          {showModal && selectedRequest && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {action === 'view' ? 'NOC Request Details' : 
                     action === 'verify' ? 'Approve NOC Request' : 'Reject NOC Request'}
                  </h3>
                </div>
                
                <div className="px-4 sm:px-6 py-4">
                  {action === 'view' ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Student</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{selectedRequest.studentName} ({selectedRequest.rollNumber})</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Course & Branch</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900 break-words">{selectedRequest.course?.name} - {selectedRequest.branch?.name}</p>
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Reason</label>
                        <p className="mt-1 text-xs sm:text-sm text-gray-900 whitespace-pre-wrap break-words">{selectedRequest.reason}</p>
                      </div>
                      {selectedRequest.vacatingDate && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700">Vacating Date from Hostel</label>
                          <p className="mt-1 text-xs sm:text-sm text-gray-900">
                            {new Date(selectedRequest.vacatingDate).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700">Status</label>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                          {getStatusIcon(selectedRequest.status)}
                          <span className="ml-1">{selectedRequest.status}</span>
                        </span>
                      </div>
                      {selectedRequest.breakageFee > 0 && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700">Breakage Fee</label>
                          <div className="p-3 bg-red-50 border border-red-100 rounded-md mt-1">
                            <p className="text-xs sm:text-sm font-semibold text-red-700">₹{selectedRequest.breakageFee}</p>
                            {selectedRequest.breakageRemarks && (
                              <p className="text-xs text-red-600 mt-1">Remarks: {selectedRequest.breakageRemarks}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {selectedRequest.meterReadings && selectedRequest.meterReadings.meterType && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700">Meter Readings</label>
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs space-y-1 text-gray-700 mt-1">
                            <p><span className="font-semibold text-gray-800">Type:</span> {selectedRequest.meterReadings.meterType === 'single' ? 'Single Meter' : 'Dual Meter'}</p>
                            {selectedRequest.meterReadings.meterType === 'single' ? (
                              <>
                                <p><span className="font-semibold text-gray-800">Start Units:</span> {selectedRequest.meterReadings.startUnits}</p>
                                <p><span className="font-semibold text-gray-800">End Units:</span> {selectedRequest.meterReadings.endUnits}</p>
                              </>
                            ) : (
                              <>
                                <p><span className="font-semibold text-gray-800">Meter 1 Start:</span> {selectedRequest.meterReadings.meter1StartUnits} | <span className="font-semibold text-gray-800">End:</span> {selectedRequest.meterReadings.meter1EndUnits}</p>
                                <p><span className="font-semibold text-gray-800">Meter 2 Start:</span> {selectedRequest.meterReadings.meter2StartUnits} | <span className="font-semibold text-gray-800">End:</span> {selectedRequest.meterReadings.meter2EndUnits}</p>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                      {action === 'verify' && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <h4 className="text-xs sm:text-sm font-medium text-yellow-800">Approve NOC Request</h4>
                              <p className="mt-1 text-xs text-yellow-700">
                                Approving this request is final. The student profile deactivation and room vacating will be automatically processed by the nightly scheduler on or after the vacating date ({new Date(selectedRequest.vacatingDate).toLocaleDateString('en-IN')}).
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {action === 'verify' && (
                        <>
                          {/* Breakage Fee */}
                          <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-4">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-800">Breakage Fee</h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Breakage Fee Amount (₹)</label>
                                <input
                                  type="number"
                                  value={breakageFee}
                                  onChange={(e) => setBreakageFee(e.target.value)}
                                  placeholder="0"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  min="0"
                                />
                              </div>
                              {Number(breakageFee) > 0 && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks / Description</label>
                                  <textarea
                                    value={breakageRemarks}
                                    onChange={(e) => setBreakageRemarks(e.target.value)}
                                    placeholder="Reason for breakage charge..."
                                    rows={2}
                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                          {action === 'verify' ? 'Approval Remarks / Notes (Optional)' : 'Rejection Reason *'}
                        </label>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                          placeholder={action === 'verify' 
                            ? 'Add any remarks or notes about this approval...'
                            : 'Please provide a detailed reason for rejection...'
                          }
                          required={action === 'reject'}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-4 sm:px-6 py-4 bg-gray-50 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedRequest(null);
                      setRemarks('');
                    }}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                  >
                    {action === 'view' ? 'Close' : 'Cancel'}
                  </button>
                  {action !== 'view' && (
                    <button
                      onClick={handleSubmitAction}
                      disabled={isSubmitting || (action === 'reject' && !remarks.trim())}
                      className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-md text-xs sm:text-sm font-medium text-white focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        action === 'verify' 
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {isSubmitting ? 'Processing...' : (action === 'verify' ? 'Approve' : 'Reject')}
                    </button>
                  )}
                </div>
              </motion.div>
            </div>
          )}

          {/* Create NOC Modal — mobile-friendly bottom sheet */}
          {showCreateModal && (
            <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col"
              >
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-start justify-between gap-2 flex-shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                      Create NOC
                    </h3>
                    <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 truncate">
                      On behalf of a student
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedStudent(null);
                      setNocReason('');
                      setVacatingDate('');
                      setStudentSearch('');
                      setSelectedAY('');
                      resetFields();
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 flex-shrink-0"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-4 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                  {!selectedStudent ? (
                    <>
                      {/* Academic Year Selection */}
                      <div>
                        <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                          Academic Year *
                        </label>
                        <select
                          value={selectedAY}
                          onChange={(e) => {
                            setSelectedAY(e.target.value);
                            setSelectedStudent(null);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                        >
                          <option value="">Select Academic Year...</option>
                          {generateAcademicYears().map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Student Search */}
                      <div>
                        <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                          Search Student *
                        </label>
                        <div className="relative">
                          <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            disabled={!selectedAY}
                            placeholder={selectedAY ? "Name or roll number..." : "Select AY first..."}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>

                      {/* Student Selection */}
                      <div>
                        <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                          Select Student *
                        </label>
                        {!selectedAY ? (
                          <div className="text-center py-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">Select an Academic Year first</p>
                          </div>
                        ) : loadingStudents ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                            <span className="ml-2 text-xs text-gray-500">Loading...</span>
                          </div>
                        ) : students.length === 0 ? (
                          <div className="text-center py-3 bg-gray-50 rounded-md">
                            <p className="text-xs text-gray-500">
                              {studentSearch ? 'No students found' : 'No eligible students for this AY'}
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-40 sm:max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                            {students.map((student) => (
                              <div
                                key={student._id}
                                onClick={() => setSelectedStudent(student)}
                                className={`p-2.5 sm:p-3 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0 ${
                                  selectedStudent?._id === student._id
                                    ? 'bg-green-50 border-l-4 border-l-green-500'
                                    : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div className="min-w-0">
                                    <p className="font-medium text-gray-900 text-sm truncate">{student.name}</p>
                                    <p className="text-[11px] text-gray-500">{student.rollNumber}</p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-[11px] text-gray-600">{student.course?.name}</p>
                                    <p className="text-[10px] text-gray-500">Y{student.year} · {student.academicYear}</p>
                                  </div>
                                </div>
                                {student.roomNumber && (
                                  <p className="text-[10px] text-gray-400 mt-0.5">Room: {student.roomNumber}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-2.5 sm:p-3 bg-green-50 border border-green-200 rounded-md relative pr-9">
                      <button
                        type="button"
                        onClick={handleDiscardStudent}
                        className="absolute top-1.5 right-1.5 p-1 text-gray-500 hover:text-red-500 rounded-full"
                        title="Discard Student"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                      <p className="text-[10px] font-medium text-green-800">Selected</p>
                      <p className="text-sm font-semibold text-green-900 truncate">{selectedStudent.name} ({selectedStudent.rollNumber})</p>
                      <p className="text-[11px] text-green-700 truncate">{selectedStudent.course?.name} · Y{selectedStudent.year}</p>
                      {selectedStudent.roomNumber && (
                        <p className="text-[10px] text-green-600 mt-0.5">
                          Room {selectedStudent.roomNumber}
                          {selectedStudent.room?.meterType ? ` · ${selectedStudent.room.meterType === 'single' ? 'Single' : 'Dual'} Meter` : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reason + Vacating date — compact on mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                        Reason *
                      </label>
                      <select
                        value={reasonType}
                        onChange={(e) => {
                          setReasonType(e.target.value);
                          if (e.target.value !== 'Other') {
                            setNocReason('');
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                      >
                        <option value="">Select Reason...</option>
                        <option value="Academic Year Completed">Academic Year Completed</option>
                        <option value="Course Completed">Course Completed</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-sm font-medium text-gray-700 mb-1">
                        Vacating Date *
                      </label>
                      <input
                        type="date"
                        value={vacatingDate}
                        onChange={(e) => setVacatingDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                        required
                      />
                    </div>
                  </div>

                  {reasonType === 'Other' && (
                    <div>
                      <textarea
                        value={nocReason}
                        onChange={(e) => setNocReason(e.target.value)}
                        rows={3}
                        maxLength={500}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 text-sm"
                        placeholder="Enter reason (min 10 characters)..."
                      />
                      <p className="text-[10px] text-gray-500 mt-0.5 text-right">
                        {nocReason.length}/500
                      </p>
                    </div>
                  )}



                  {/* Breakage Fee */}
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2">
                    <h4 className="text-[11px] sm:text-sm font-semibold text-gray-800">Breakage Fee</h4>
                    <input
                      type="number"
                      value={breakageFee}
                      onChange={(e) => setBreakageFee(e.target.value)}
                      placeholder="Amount ₹"
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      min="0"
                    />
                    {Number(breakageFee) > 0 && (
                      <textarea
                        value={breakageRemarks}
                        onChange={(e) => setBreakageRemarks(e.target.value)}
                        placeholder="Remarks..."
                        rows={2}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0 safe-area-pb">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setSelectedStudent(null);
                      setNocReason('');
                      setVacatingDate('');
                      setStudentSearch('');
                      setSelectedAY('');
                      resetFields();
                    }}
                    className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateNOC}
                    disabled={isCreating || !selectedStudent || !reasonType || (reasonType === 'Other' && nocReason.trim().length < 10) || !vacatingDate}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create NOC'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default NOCManagement;
