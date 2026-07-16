import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  UserIcon,
  CalendarIcon,
  ClockIcon,
  DocumentTextIcon,
  XMarkIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import SEO from '../../components/SEO';

const ApplyLeaveOnBehalf = () => {
  const navigate = useNavigate();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form state
  const [applicationType, setApplicationType] = useState('Leave');
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  
  // Date/Time inputs
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gatePassDateTime, setGatePassDateTime] = useState('');
  const [permissionDate, setPermissionDate] = useState('');
  const [outTime, setOutTime] = useState('');
  const [inTime, setInTime] = useState('');
  const [stayDate, setStayDate] = useState('');

  // Handle student search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const response = await api.get('/api/admin/warden/students', {
        params: { search: searchQuery.trim(), limit: 10 }
      });
      if (response.data.success) {
        setSearchResults(response.data.data.students || []);
      }
    } catch (err) {
      console.error('Error searching students:', err);
      toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, handleSearch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }

    const payload = {
      studentId: selectedStudent._id,
      applicationType,
      reason
    };

    if (applicationType === 'Leave') {
      if (!startDate || !endDate || !gatePassDateTime) {
        toast.error('All leave dates and times are required');
        return;
      }
      payload.startDate = startDate;
      payload.endDate = endDate;
      payload.gatePassDateTime = gatePassDateTime;
    } else if (applicationType === 'Permission') {
      if (!permissionDate || !outTime || !inTime) {
        toast.error('Permission date and outing times are required');
        return;
      }
      payload.permissionDate = permissionDate;
      payload.outTime = outTime;
      payload.inTime = inTime;
    } else if (applicationType === 'Stay in Hostel') {
      if (!stayDate) {
        toast.error('Stay date is required');
        return;
      }
      payload.stayDate = stayDate;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/api/leave/warden/apply-on-behalf', payload);
      if (response.data.success) {
        toast.success(response.data.message || 'Leave request submitted successfully');
        // Redirect back to warden leave list
        navigate('/warden/dashboard/leave-management');
      }
    } catch (err) {
      console.error('Error submitting leave on behalf:', err);
      toast.error(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SEO 
        title="Apply Leave On Behalf - Warden"
        description="Apply for leave, permission, or stay-in-hostel on behalf of a student"
        keywords="warden, leave, on behalf, hostel"
      />

      <div className="w-full mt-12 sm:mt-0 max-w-4xl mx-auto px-2 sm:px-4">
        {/* Back navigation */}
        <button
          onClick={() => navigate('/warden/dashboard/leave-management')}
          className="flex items-center gap-1.5 text-xs sm:text-sm text-green-700 hover:text-green-900 font-medium mb-3 sm:mb-4 transition-colors duration-200"
        >
          <ArrowLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Leave Management
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-green-100"
        >
          <h1 className="text-base sm:text-xl lg:text-2xl font-bold text-green-900 flex items-center gap-2 sm:gap-3">
            <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
            <span>Apply Student Leave</span>
          </h1>
          <p className="text-[11px] sm:text-xs lg:text-sm text-gray-600 mt-2 leading-relaxed">
            Submit a leave, permission, or stay-in-hostel request on behalf of a student. The parent will be sent an OTP via SMS for verification.
          </p>
        </motion.div>

        {/* Selection & Search */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6 border border-gray-200"
        >
          <h2 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            1. Select Student
          </h2>

          {!selectedStudent ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Search student by Roll Number or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm"
              />
              <div className="absolute right-3 top-2.5 sm:top-3">
                {searching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                ) : (
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>

              {/* Results Dropdown */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute z-20 w-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100"
                  >
                    {searchResults.map((student) => (
                      <button
                        key={student._id}
                        type="button"
                        onClick={() => {
                          setSelectedStudent(student);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-green-50/50 flex justify-between items-center transition-colors text-xs sm:text-sm"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-semibold text-gray-900 truncate">{student.name}</div>
                          <div className="text-[11px] sm:text-xs text-gray-500 truncate">{student.rollNumber} • {student.course} ({student.branch})</div>
                        </div>
                        <div className="text-[11px] sm:text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 sm:py-1 rounded-full border border-green-200 flex-shrink-0">
                          Select
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {searchQuery && !searching && searchResults.length === 0 && (
                <p className="text-[11px] sm:text-xs text-gray-500 mt-2">No students found matching "{searchQuery}"</p>
              )}
            </div>
          ) : (
            <div className="bg-green-50/50 rounded-lg p-3 sm:p-4 border border-green-200 flex justify-between items-start gap-2 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-green-900 text-sm sm:text-base truncate">{selectedStudent.name}</span>
                  <span className="text-[10px] sm:text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-300 font-semibold">{selectedStudent.rollNumber}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 sm:gap-y-1.5 mt-2 sm:mt-3 text-[11px] sm:text-xs lg:text-sm text-gray-700">
                  <div><strong>Course:</strong> {selectedStudent.course}</div>
                  <div><strong>Branch & Year:</strong> {selectedStudent.branch} (Year {selectedStudent.year})</div>
                  <div><strong>Parent Phone:</strong> {selectedStudent.parentPhone || 'N/A'}</div>
                  <div><strong>Hostel & Room:</strong> {selectedStudent.hostelName || 'Hostel'} (Room: {selectedStudent.roomNumber || 'N/A'})</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1 rounded-lg bg-white border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-200 shadow-sm transition-colors flex-shrink-0"
                title="Change Student"
              >
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          )}
        </motion.div>

        {/* Application details Form */}
        <AnimatePresence>
          {selectedStudent && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSubmit}
              className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200 space-y-4 sm:space-y-6 overflow-hidden mb-8"
            >
              <h2 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                2. Application Details
              </h2>

              {/* Tab selector for Application Type */}
              <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg">
                {['Leave', 'Permission', 'Stay in Hostel'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setApplicationType(type)}
                    className={`flex-1 text-center py-2 px-1 text-[11px] sm:text-sm font-semibold rounded-md transition-all duration-200 ${
                      applicationType === type
                        ? 'bg-white text-green-700 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Dynamic date/time pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {applicationType === 'Leave' && (
                  <>
                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                        Gate Pass Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={gatePassDateTime}
                        onChange={(e) => setGatePassDateTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                        required
                      />
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                        Gate pass time should be after 4:30 PM for future dates.
                      </p>
                    </div>
                  </>
                )}

                {applicationType === 'Permission' && (
                  <>
                    <div>
                      <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                        Permission Date
                      </label>
                      <input
                        type="date"
                        value={permissionDate}
                        onChange={(e) => setPermissionDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                          Out Time (HH:MM)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 09:30"
                          value={outTime}
                          onChange={(e) => setOutTime(e.target.value)}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                          In Time (HH:MM)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 17:30"
                          value={inTime}
                          onChange={(e) => setInTime(e.target.value)}
                          className="w-full px-2.5 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                {applicationType === 'Stay in Hostel' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                      Stay Date
                    </label>
                    <input
                      type="date"
                      value={stayDate}
                      onChange={(e) => setStayDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm bg-white"
                      required
                    />
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Stay date can only be today or tomorrow.
                    </p>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[11px] sm:text-xs font-semibold uppercase text-gray-500 tracking-wider mb-1">
                  Reason for {applicationType}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Provide a clear reason for the student's ${applicationType}...`}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-base sm:text-sm"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => navigate('/warden/dashboard/leave-management')}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit & Send OTP</span>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ApplyLeaveOnBehalf;
