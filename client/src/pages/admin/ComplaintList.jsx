import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const ComplaintList = () => {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [members, setMembers] = useState({});
  const [expandedComplaint, setExpandedComplaint] = useState(null);
  const [assigningMember, setAssigningMember] = useState(null);

  useEffect(() => {
    fetchComplaints();
    fetchMembers();
  }, []);

  const fetchComplaints = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/complaints/admin/all');
      if (res.data.success) {
        setComplaints(res.data.data.complaints);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to fetch complaints');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get('/api/members');
      if (res.data.success) {
        // Group members by category
        const groupedMembers = res.data.data.members.reduce((acc, member) => {
          if (!acc[member.category]) {
            acc[member.category] = [];
          }
          acc[member.category].push(member);
          return acc;
        }, {});
        setMembers(groupedMembers);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error('Failed to fetch members');
      }
    }
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const res = await api.put(`/api/complaints/admin/${complaintId}/status`, {
        status: newStatus
      });
      if (res.data.success) {
        toast.success('Status updated successfully');
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to update status');
      }
    }
  };

  const handleAssignMember = async (complaintId, memberId) => {
    try {
      const res = await api.put(`/api/complaints/admin/${complaintId}/status`, {
        status: 'In Progress',
        memberId: memberId,
        note: 'Member assigned to complaint'
      });
      if (res.data.success) {
        toast.success('Member assigned successfully');
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error assigning member:', err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        toast.error(err.response?.data?.message || 'Failed to assign member');
      }
    } finally {
      setAssigningMember(null);
    }
  };

  const getStatusColor = status => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Resolved':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = status => {
    switch (status) {
      case 'Pending':
        return <ClockIcon className="w-5 h-5" />;
      case 'In Progress':
        return <ClockIcon className="w-5 h-5" />;
      case 'Resolved':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'Rejected':
        return <XCircleIcon className="w-5 h-5" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Complaint Management</h2>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {complaints.map(complaint => (
                <React.Fragment key={complaint._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {complaint.student.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {complaint.student.rollNumber}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {complaint.category}
                        {complaint.subCategory && (
                          <span className="text-gray-500"> - {complaint.subCategory}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 line-clamp-2">
                        {complaint.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          complaint.currentStatus
                        )}`}
                      >
                        {getStatusIcon(complaint.currentStatus)}
                        <span className="ml-1">{complaint.currentStatus}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {complaint.assignedTo ? (
                        <div className="text-sm text-gray-900">
                          {complaint.assignedTo.name}
                        </div>
                      ) : (
                        <button
                          onClick={() => setAssigningMember(complaint._id)}
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <UserIcon className="w-4 h-4 mr-1" />
                          Assign Member
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() =>
                          setExpandedComplaint(
                            expandedComplaint === complaint._id ? null : complaint._id
                          )
                        }
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {expandedComplaint === complaint._id ? (
                          <ChevronUpIcon className="w-5 h-5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  <AnimatePresence>
                    {expandedComplaint === complaint._id && (
                      <motion.tr
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-gray-50"
                      >
                        <td colSpan="6" className="px-6 py-4">
                          <div className="space-y-4">
                            {/* Student Details */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Student Details
                              </h4>
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Name:</span> {complaint.student.name}
                                </p>
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Roll No:</span> {complaint.student.rollNumber}
                                </p>
                                {complaint.student.studentPhone && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Phone:</span> {complaint.student.studentPhone}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium text-gray-900 mb-2">
                                Full Description
                              </h4>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                {complaint.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {complaint.currentStatus !== 'Resolved' && (
                                <button
                                  onClick={() => handleStatusChange(complaint._id, 'Resolved')}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  <CheckCircleIcon className="w-5 h-5 mr-1" />
                                  Mark as Resolved
                                </button>
                              )}
                              {complaint.currentStatus !== 'Rejected' && (
                                <button
                                  onClick={() => handleStatusChange(complaint._id, 'Rejected')}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  <XCircleIcon className="w-5 h-5 mr-1" />
                                  Reject
                                </button>
                              )}
                              {complaint.currentStatus === 'Pending' && (
                                <button
                                  onClick={() => handleStatusChange(complaint._id, 'In Progress')}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                  <ClockIcon className="w-5 h-5 mr-1" />
                                  Start Progress
                                </button>
                              )}
                            </div>

                            {/* Member Assignment Modal */}
                            <AnimatePresence>
                              {assigningMember === complaint._id && (
                                <motion.div
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                                >
                                  <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                                      Assign Member
                                    </h3>
                                    <div className="space-y-4">
                                      {members[complaint.category]?.map(member => (
                                        <button
                                          key={member._id}
                                          onClick={() => handleAssignMember(complaint._id, member._id)}
                                          className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                                        >
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {member.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                              {member.phoneNumber}
                                            </div>
                                          </div>
                                          <UserIcon className="w-5 h-5 text-blue-600" />
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                      <button
                                        onClick={() => setAssigningMember(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComplaintList; 