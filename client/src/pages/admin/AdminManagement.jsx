import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserIcon,
  KeyIcon,
  CheckIcon,
  ShieldCheckIcon,
  HomeIcon,
  BuildingOfficeIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';

const PERMISSIONS = [
  { id: 'dashboard_home', label: 'Dashboard Home' },
  { id: 'room_management', label: 'Room Management' },
  { id: 'student_management', label: 'Student Management' },
  { id: 'maintenance_ticket_management', label: 'Complaints Management' },
  { id: 'leave_management', label: 'Leave Management' },
  { id: 'announcement_management', label: 'Announcements' },
  { id: 'poll_management', label: 'Poll Management' },
  { id: 'menu_management', label: 'Menu Management' },
  { id: 'course_management', label: 'Course Management' },
  { id: 'attendance_management', label: 'Attendance Management' },
  { id: 'found_lost_management', label: 'Found & Lost Management' },
  { id: 'fee_management', label: 'Fee Management' },
  { id: 'concession_management', label: 'Concession Management' },
  { id: 'noc_management', label: 'NOC Management' },
  { id: 'security_management', label: 'Security Management' },
  { id: 'staff_guests_management', label: 'Staff/Guests Management' },
  { id: 'feature_controls', label: 'Feature Controls' }
];

// Course assignment permissions that need course selection
const COURSE_ASSIGNMENT_PERMISSIONS = ['leave_management', 'student_management', 'attendance_management'];

const ToggleSwitch = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer select-none">
    <span className="text-gray-800 font-medium">{label}</span>
    <span className="relative inline-block w-12 h-6 align-middle">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only peer"
      />
      <span
        className={`block w-12 h-6 rounded-full transition-colors duration-300
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
        `}
      ></span>
      <span
        className={`absolute left-0 top-0 w-6 h-6 bg-white border border-gray-300 rounded-full shadow transform transition-transform duration-300
          ${checked ? 'translate-x-6 border-blue-600' : ''}
        `}
      ></span>
    </span>
  </label>
);

const AccessLevelSelector = ({ permissionId, permissionLabel, accessLevel, onAccessLevelChange, disabled }) => {
  console.log('🔧 AccessLevelSelector props:', { permissionId, permissionLabel, accessLevel, disabled });

  return (
    <div className="ml-4 sm:ml-6 mt-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
      <label className="block text-xs sm:text-sm font-medium text-blue-700 mb-2">
        Access Level for {permissionLabel}
      </label>
      <div className="flex gap-3">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`access_${permissionId}`}
            value="view"
            checked={accessLevel === 'view'}
            onChange={() => {
              console.log('🔧 Radio change - View:', permissionId);
              onAccessLevelChange(permissionId, 'view');
            }}
            disabled={disabled}
            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-xs text-blue-700">View Access</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name={`access_${permissionId}`}
            value="full"
            checked={accessLevel === 'full'}
            onChange={() => {
              console.log('🔧 Radio change - Full:', permissionId);
              onAccessLevelChange(permissionId, 'full');
            }}
            disabled={disabled}
            className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
          />
          <span className="text-xs text-blue-700">Full Access</span>
        </label>
      </div>
      <div className="mt-2 text-xs text-blue-600">
        {accessLevel === 'view' ? (
          <span>• Can view data but cannot edit, add, or delete</span>
        ) : (
          <span>• Can view, edit, add, and delete data</span>
        )}
      </div>
    </div>
  );
};

const AdminManagement = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('sub-admins');
  const [subAdmins, setSubAdmins] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [principals, setPrincipals] = useState([]);
  const [customRoles, setCustomRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [passwordResetData, setPasswordResetData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    permissions: [],
    permissionAccessLevels: {}, // New field for access levels
    hostelType: '',
    course: '',
    branch: '', // Branch for principal (optional)
    leaveManagementCourses: [], // New field for course selection
    passwordDeliveryMethod: '', // New field for password delivery
    email: '', // New field for email
    phoneNumber: '', // New field for phone number
    customRoleId: '', // New field for custom role assignment
    principalEmail: '', // Email for principal (for leave notifications)
    principalCourses: [] // New field for principal multi-course selection
  });
  const [roleType, setRoleType] = useState('sub_admin'); // Track selected role type
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: [],
    permissionAccessLevels: {},
    courseAssignment: 'all',
    assignedCourses: []
  });
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subAdminsRes, wardensRes, principalsRes, customRolesRes] = await Promise.all([
        api.get('/api/admin-management/sub-admins'),
        api.get('/api/admin-management/wardens'),
        api.get('/api/admin-management/principals'),
        api.get('/api/admin-management/custom-roles')
      ]);

      console.log('🔍 Admin data responses:', {
        subAdmins: subAdminsRes.data,
        wardens: wardensRes.data,
        principals: principalsRes.data,
        customRoles: customRolesRes.data
      });

      if (subAdminsRes.data.success) {
        setSubAdmins(subAdminsRes.data.data || []);
      }
      if (wardensRes.data.success) {
        setWardens(wardensRes.data.data || []);
      }
      if (principalsRes.data.success) {
        setPrincipals(principalsRes.data.data || []);
      }
      if (customRolesRes.data.success) {
        setCustomRoles(customRolesRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };



  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setFormData(prev => {
        const newPermissions = checked
          ? [...prev.permissions, value]
          : prev.permissions.filter(p => p !== value);

        // If leave_management is being unchecked, clear course selections
        if (value === 'leave_management' && !checked) {
          return {
            ...prev,
            permissions: newPermissions,
            leaveManagementCourses: []
          };
        }

        // Set default access level when permission is added
        let newAccessLevels = { ...prev.permissionAccessLevels };
        if (checked) {
          // Set default access level to 'view' for new permissions
          newAccessLevels[value] = 'view';
        } else {
          // Remove access level when permission is unchecked
          delete newAccessLevels[value];
        }

        return {
          ...prev,
          permissions: newPermissions,
          permissionAccessLevels: newAccessLevels
        };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle course selection for leave management or principal courses
  const handleCourseSelection = (courseName, checked, fieldDataName = 'leaveManagementCourses') => {
    setFormData(prev => ({
      ...prev,
      [fieldDataName]: checked
        ? [...prev[fieldDataName], courseName]
        : prev[fieldDataName].filter(name => name !== courseName)
    }));
  };

  // Handle role form changes
  const handleRoleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === 'checkbox') {
      setRoleFormData(prev => {
        const newPermissions = checked
          ? [...prev.permissions, value]
          : prev.permissions.filter(p => p !== value);

        // Set default access level when permission is added
        let newAccessLevels = { ...prev.permissionAccessLevels };
        if (checked) {
          newAccessLevels[value] = 'view';
        } else {
          delete newAccessLevels[value];
        }

        return {
          ...prev,
          permissions: newPermissions,
          permissionAccessLevels: newAccessLevels
        };
      });
    } else {
      setRoleFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle role access level changes
  const handleRoleAccessLevelChange = (permission, accessLevel) => {
    setRoleFormData(prev => ({
      ...prev,
      permissionAccessLevels: {
        ...prev.permissionAccessLevels,
        [permission]: accessLevel
      }
    }));
  };

  // Handle role course assignment - store course names
  const handleRoleCourseSelection = (courseName, checked) => {
    console.log('🔧 Role course selection:', { courseName, checked });
    setRoleFormData(prev => {
      const newAssignedCourses = checked
        ? [...prev.assignedCourses, courseName]
        : prev.assignedCourses.filter(name => name !== courseName);

      console.log('🔧 Updated assigned courses:', newAssignedCourses);

      return {
        ...prev,
        assignedCourses: newAssignedCourses
      };
    });
  };

  // Handle access level changes for permissions
  const handleAccessLevelChange = (permission, accessLevel) => {
    console.log('🔧 Access level change:', { permission, accessLevel });
    setFormData(prev => {
      const newData = {
        ...prev,
        permissionAccessLevels: {
          ...prev.permissionAccessLevels,
          [permission]: accessLevel
        }
      };
      console.log('🔧 Updated form data:', newData.permissionAccessLevels);
      return newData;
    });
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();

    // Validate password delivery for sub-admins (optional)
    if (activeTab === 'sub-admins') {
      // If password delivery method is selected, validate accordingly
      if (formData.passwordDeliveryMethod === 'email' && !formData.email.trim()) {
        toast.error('Please enter an email address for password delivery');
        return;
      }

      if (formData.passwordDeliveryMethod === 'mobile' && !formData.phoneNumber.trim()) {
        toast.error('Please enter a phone number for mobile delivery');
        return;
      }
    }

    try {
      let endpoint;
      let requestData;

      if (activeTab === 'sub-admins') {
        endpoint = '/api/admin-management/sub-admins';
        requestData = {
          ...formData,
          leaveManagementCourses: formData.leaveManagementCourses,
          permissionAccessLevels: formData.permissionAccessLevels,
          passwordDeliveryMethod: formData.passwordDeliveryMethod,
          email: formData.email,
          phoneNumber: formData.phoneNumber
        };
      } else if (activeTab === 'wardens') {
        endpoint = '/api/admin-management/wardens';
        requestData = { ...formData, hostelType: formData.hostelType };
      } else if (activeTab === 'principals') {
        endpoint = '/api/admin-management/principals';
        requestData = {
          username: formData.username,
          password: formData.password,
          courses: formData.principalCourses, // Send array of courses
          course: formData.principalCourses[0], // Legacy support
          branch: formData.branch || undefined, // Optional branch
          email: formData.principalEmail
        };
      }

      const response = await api.post(endpoint, requestData);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' :
          activeTab === 'wardens' ? 'Warden' : 'Principal';

        // Handle delivery result for sub-admins
        if (activeTab === 'sub-admins' && response.data.deliveryResult) {
          if (response.data.deliveryResult.success) {
            const deliveryMethod = formData.passwordDeliveryMethod === 'email' ? 'email' :
              formData.passwordDeliveryMethod === 'mobile' ? 'SMS' : 'manual';
            toast.success(`${userType} added successfully! Credentials sent via ${deliveryMethod}.`);
          } else if (response.data.deliveryResult.error) {
            toast.success(`${userType} added successfully!`, { duration: 3000 });
            toast.error(`Failed to send credentials: ${response.data.deliveryResult.error}`, { duration: 5000 });
          } else if (response.data.deliveryResult.message) {
            if (response.data.deliveryResult.message.includes('No credentials sent')) {
              toast.success(`${userType} added successfully! No credentials sent - provide them manually.`);
            } else {
              toast.success(`${userType} added successfully! ${response.data.deliveryResult.message}`);
            }
          } else {
            toast.success(`${userType} added successfully!`);
          }
        } else {
          toast.success(`${userType} added successfully`);
        }

        setShowAddModal(false);
        setFormData({
          username: '',
          password: '',
          permissions: [],
          permissionAccessLevels: {},
          hostelType: '',
          course: '',
          branch: '',
          leaveManagementCourses: [],
          passwordDeliveryMethod: '',
          email: '',
          phoneNumber: '',
          principalEmail: ''
        });
        setFilteredBranches([]);
        fetchData();
      }
    } catch (error) {
      const userType = activeTab === 'sub-admins' ? 'sub-admin' :
        activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to add ${userType}`);
    }
  };

  const handleEditAdmin = async (e) => {
    e.preventDefault();
    try {
      console.log('🔧 Frontend: Sending update data:', formData);

      let endpoint;
      let updateData = {
        username: formData.username,
        permissions: formData.permissions
      };

      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      if (activeTab === 'sub-admins') {
        endpoint = `/api/admin-management/sub-admins/${selectedAdmin._id}`;
        updateData.leaveManagementCourses = formData.leaveManagementCourses;
        updateData.permissionAccessLevels = formData.permissionAccessLevels;
      } else if (activeTab === 'wardens') {
        endpoint = `/api/admin-management/wardens/${selectedAdmin._id}`;
        if (formData.hostelType) {
          updateData.hostelType = formData.hostelType;
        }
      } else if (activeTab === 'principals') {
        endpoint = `/api/admin-management/principals/${selectedAdmin._id}`;
        if (formData.principalCourses && formData.principalCourses.length > 0) {
          updateData.courses = formData.principalCourses;
          updateData.course = formData.principalCourses[0]; // Legacy
        }
        if (formData.branch !== undefined) {
          updateData.branch = formData.branch || undefined; // Can be empty to clear
        }
        // Always include email for principals (can be empty to clear it)
        updateData.email = formData.principalEmail;
      }

      console.log('🔧 Frontend: Final update data:', updateData);

      const response = await api.put(endpoint, updateData);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' :
          activeTab === 'wardens' ? 'Warden' : 'Principal';
        toast.success(`${userType} updated successfully`);

        // If the current user is being edited, refresh their data
        if (selectedAdmin && selectedAdmin._id === user?._id) {
          console.log('🔄 Current user updated, refreshing user data...');
          try {
            // Re-validate token to get updated user data
            const validationResponse = await api.get('/api/admin-management/validate');
            if (validationResponse.data.success && validationResponse.data.data?.user) {
              const updatedUserData = validationResponse.data.data.user;
              console.log('🔄 Updated user data:', updatedUserData);
              updateUser(updatedUserData);
            }
          } catch (error) {
            console.error('🔄 Error refreshing user data:', error);
          }
        }

        setShowEditModal(false);
        setSelectedAdmin(null);
        setFormData({
          username: '',
          password: '',
          permissions: [],
          permissionAccessLevels: {},
          hostelType: '',
          course: '',
          branch: '',
          leaveManagementCourses: [],
          passwordDeliveryMethod: '',
          email: '',
          phoneNumber: '',
          principalEmail: '',
          principalCourses: []
        });
        setFilteredBranches([]);
        fetchData();
      }
    } catch (error) {
      console.error('🔧 Frontend: Error updating:', error);
      const userType = activeTab === 'sub-admins' ? 'sub-admin' :
        activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to update ${userType}`);
    }
  };

  const handleDeleteAdmin = async (adminId) => {
    const userType = activeTab === 'sub-admins' ? 'sub-admin' :
      activeTab === 'wardens' ? 'warden' : 'principal';
    if (!window.confirm(`Are you sure you want to delete this ${userType}?`)) return;

    try {
      let endpoint;
      if (activeTab === 'sub-admins') {
        endpoint = `/api/admin-management/sub-admins/${adminId}`;
      } else if (activeTab === 'wardens') {
        endpoint = `/api/admin-management/wardens/${adminId}`;
      } else if (activeTab === 'principals') {
        endpoint = `/api/admin-management/principals/${adminId}`;
      }

      const response = await api.delete(endpoint);
      if (response.data.success) {
        const userType = activeTab === 'sub-admins' ? 'Sub-admin' :
          activeTab === 'wardens' ? 'Warden' : 'Principal';
        toast.success(`${userType} deleted successfully`);
        fetchData();
      }
    } catch (error) {
      const userType = activeTab === 'sub-admins' ? 'sub-admin' :
        activeTab === 'wardens' ? 'warden' : 'principal';
      toast.error(error.response?.data?.message || `Failed to delete ${userType}`);
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setRoleType(admin.role === 'custom' ? 'custom' : 'sub_admin');

    // Convert leaveManagementCourses to proper format for editing (now stores course names)
    const leaveManagementCourses = admin.leaveManagementCourses ? admin.leaveManagementCourses.map(course =>
      typeof course === 'object' ? course.name : course // If object, get name; otherwise it's already a name
    ) : [];

    console.log('🔧 Editing admin with leave management courses:', leaveManagementCourses);

    setFormData({
      username: admin.username,
      password: '',
      permissions: admin.permissions || [],
      permissionAccessLevels: admin.permissionAccessLevels || {},
      hostelType: admin.hostelType || '',
      course: admin.course?.name || admin.course || '', // Course is now a string (name)
      branch: admin.branch || '', // Branch is now a string (name)
      leaveManagementCourses: leaveManagementCourses,
      // Don't include password delivery fields for editing
      passwordDeliveryMethod: '',
      email: '',
      phoneNumber: '',
      customRoleId: admin.customRoleId || '',
      principalEmail: admin.email || '', // Load principal's email
      principalCourses: admin.assignedCourses || (admin.course ? [admin.course] : []) // Load principal's courses
    });
    setShowEditModal(true);
  };

  const openPasswordResetModal = (admin) => {
    setSelectedAdmin(admin);
    setPasswordResetData({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordResetModal(true);
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();

    // Validate password matching only
    if (passwordResetData.newPassword !== passwordResetData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await api.put(`/api/admin-management/sub-admins/${selectedAdmin._id}`, {
        password: passwordResetData.newPassword
      });

      if (response.data.success) {
        toast.success('Password reset successfully');
        setShowPasswordResetModal(false);
        setPasswordResetData({
          newPassword: '',
          confirmPassword: ''
        });
        setSelectedAdmin(null);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const resetForm = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowRoleModal(false);
    setShowPasswordResetModal(false);
    setSelectedAdmin(null);
    setSelectedRole(null);
    setRoleType('sub_admin');
    setFormData({
      username: '',
      password: '',
      permissions: [],
      permissionAccessLevels: {},
      hostelType: '',
      course: '',
      branch: '',
      leaveManagementCourses: [],
      passwordDeliveryMethod: '',
      email: '',
      phoneNumber: '',
      customRoleId: '',
      principalEmail: '',
      principalCourses: []
    });
    setPasswordResetData({
      newPassword: '',
      confirmPassword: ''
    });
    setRoleFormData({
      name: '',
      description: '',
      permissions: [],
      permissionAccessLevels: {},
      courseAssignment: 'all',
      assignedCourses: []
    });
  };

  // Custom Role Management Functions
  const handleCreateRole = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post('/api/admin-management/custom-roles', roleFormData);
      if (response.data.success) {
        toast.success('Custom role created successfully');
        setShowRoleModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create custom role');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();

    try {
      const response = await api.put(`/api/admin-management/custom-roles/${selectedRole._id}`, roleFormData);
      if (response.data.success) {
        toast.success('Custom role updated successfully');
        setShowRoleModal(false);
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update custom role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this custom role?')) return;

    try {
      const response = await api.delete(`/api/admin-management/custom-roles/${roleId}`);
      if (response.data.success) {
        toast.success('Custom role deleted successfully');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete custom role');
    }
  };

  const openRoleModal = (role = null) => {
    if (role) {
      setSelectedRole(role);
      // Convert assignedCourses to proper format for editing (now stores course names)
      const assignedCourses = role.assignedCourses ? role.assignedCourses.map(course =>
        typeof course === 'object' ? course.name : course // If object, get name; otherwise it's already a name
      ) : [];

      console.log('🔧 Editing role with assigned courses:', assignedCourses);

      setRoleFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions || [],
        permissionAccessLevels: role.permissionAccessLevels || {},
        courseAssignment: role.courseAssignment || 'all',
        assignedCourses: assignedCourses
      });
    } else {
      setSelectedRole(null);
      setRoleFormData({
        name: '',
        description: '',
        permissions: [],
        permissionAccessLevels: {},
        courseAssignment: 'all',
        assignedCourses: []
      });
    }
    setShowRoleModal(true);

    // Fetch courses when opening role modal
    console.log('🔍 Fetching courses for custom role modal...');
    api.get('/api/course-management/courses')
      .then(res => {
        console.log('✅ Courses fetched for role modal:', res.data);
        if (res.data.success) {
          setCourses(res.data.data);
          console.log('📚 Courses set in state for role modal:', res.data.data);
        } else {
          console.error('❌ API returned success: false for role modal');
          setCourses([]);
        }
      })
      .catch(error => {
        console.error('❌ Error fetching courses for role modal:', error);
        console.error('❌ Error response:', error.response?.data);
        setCourses([]);
      });
  };



  // Fetch courses when principal tab/modal is open, when sub-admin modal is open, or when custom role modal is open
  useEffect(() => {
    if ((activeTab === 'principals' || activeTab === 'sub-admins') && (showAddModal || showEditModal) || showRoleModal) {
      console.log('🔍 Fetching courses for admin/role creation...');
      api.get('/api/course-management/courses')
        .then(res => {
          console.log('✅ Courses fetched successfully:', res.data);
          if (res.data.success) {
            setCourses(res.data.data);
            console.log('📚 Courses set in state:', res.data.data);
          } else {
            console.error('❌ API returned success: false');
            setCourses([]);
          }
        })
        .catch(error => {
          console.error('❌ Error fetching courses:', error);
          console.error('❌ Error response:', error.response?.data);
          setCourses([]);
        });
    }
  }, [activeTab, showAddModal, showEditModal, showRoleModal]);

  // Fetch branches when course is selected for principal
  useEffect(() => {
    // Only fetch branches if exactly one course is selected
    if (activeTab === 'principals' && (showAddModal || showEditModal) && formData.principalCourses.length === 1) {
      const courseName = formData.principalCourses[0];
      console.log('🔍 Fetching branches for course:', courseName);
      // Find course ID from course name
      const selectedCourse = courses.find(c => c.name === courseName);
      if (selectedCourse) {
        api.get(`/api/course-management/branches/${selectedCourse._id}`)
          .then(res => {
            console.log('✅ Branches fetched successfully:', res.data);
            if (res.data.success) {
              setFilteredBranches(res.data.data);
            } else {
              setFilteredBranches([]);
            }
          })
          .catch(error => {
            console.error('❌ Error fetching branches:', error);
            setFilteredBranches([]);
          });
      } else {
        setFilteredBranches([]);
      }
    } else {
      setFilteredBranches([]);
      // Clear branch selection if multiple courses or no course selected
      if (formData.branch) {
        setFormData(prev => ({ ...prev, branch: '' }));
      }
    }
  }, [activeTab, showAddModal, showEditModal, formData.principalCourses, courses]);

  if (loading) return <LoadingSpinner />;

  const currentData = activeTab === 'sub-admins' ? subAdmins :
    activeTab === 'wardens' ? wardens : principals;
  const isWardenTab = activeTab === 'wardens';
  const isPrincipalTab = activeTab === 'principals';

  return (
    <div className="mx-auto mt-12 md:mt-2 px-2 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      <SEO title="Admin Management" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent">Admin Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage sub-admin, warden, and principal accounts</p>
        </div>
        <button
          onClick={() => activeTab === 'custom-roles' ? openRoleModal() : setShowAddModal(true)}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          <UserPlusIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          {activeTab === 'custom-roles' ? 'Add Custom Role' :
            isWardenTab ? 'Add Warden' :
              isPrincipalTab ? 'Add Principal' : 'Add Sub-Admin'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap space-x-1 bg-gray-100 p-1 rounded-lg mb-4 sm:mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sub-admins')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'sub-admins'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <ShieldCheckIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          Sub-Admins
        </button>
        <button
          onClick={() => setActiveTab('wardens')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'wardens'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          Wardens
        </button>
        <button
          onClick={() => setActiveTab('principals')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'principals'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <AcademicCapIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          Principals
        </button>
        <button
          onClick={() => setActiveTab('custom-roles')}
          className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-md transition-colors whitespace-nowrap text-xs sm:text-sm ${activeTab === 'custom-roles'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
            }`}
        >
          <ShieldCheckIcon className="w-3 h-3 sm:w-4 sm:h-4" />
          Custom Roles
        </button>
      </div>


      {/* Custom Roles Tab */}
      {activeTab === 'custom-roles' && (
        <>
          {/* Custom Roles List */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
            {customRoles.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <ShieldCheckIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-sm sm:text-base text-gray-500">No custom roles found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {customRoles.map((role) => (
                  <div key={role._id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                          <ShieldCheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                          <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{role.name}</h3>
                          <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-xs ${role.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} flex-shrink-0`}>
                            {role.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        {role.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mb-2">{role.description}</p>
                        )}
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {role.permissions && role.permissions.map(permission => {
                            const permissionLabel = PERMISSIONS.find(p => p.id === permission)?.label || permission;
                            const accessLevel = role.permissionAccessLevels?.[permission] || 'view';
                            return (
                              <span key={permission} className="px-1.5 sm:px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs flex items-center gap-1">
                                <span className="truncate">{permissionLabel}</span>
                                <span className={`px-1 py-0.5 rounded text-xs flex-shrink-0 ${accessLevel === 'full'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {accessLevel === 'full' ? 'Full' : 'View'}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                        {role.courseAssignment && (
                          <div className="mt-2">
                            <span className="text-xs text-gray-600">
                              Course Assignment: {role.courseAssignment === 'all' ? 'All Courses' : (
                                role.assignedCourses && role.assignedCourses.length > 0 ? (
                                  <span>
                                    {role.assignedCourses.map((course, index) => (
                                      <span key={course._id || course}>
                                        {typeof course === 'object' ? course.name : course}
                                        {index < role.assignedCourses.length - 1 ? ', ' : ''}
                                      </span>
                                    ))}
                                  </span>
                                ) : 'No courses selected'
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => openRoleModal(role)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role._id)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Management Content */}
      {activeTab !== 'custom-roles' && (
        <>
          {/* Users List - Card Layout */}
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
            {currentData.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <UserIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
                <p className="text-sm sm:text-base text-gray-500">No {isWardenTab ? 'wardens' : isPrincipalTab ? 'principals' : 'sub-admins'} found</p>
              </div>
            ) : (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {currentData.filter(admin => admin && admin._id).map((admin) => (
                    <div key={admin._id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 hover:shadow-md transition-all duration-200 hover:border-gray-300 flex flex-col h-full">
                      {/* Card Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isWardenTab ? 'bg-green-100' : isPrincipalTab ? 'bg-purple-100' : 'bg-blue-100'}`}>
                            {isWardenTab ? (
                              <HomeIcon className="w-5 h-5 text-green-600" />
                            ) : isPrincipalTab ? (
                              <AcademicCapIcon className="w-5 h-5 text-purple-600" />
                            ) : (
                              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{admin.username}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {admin.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Admin"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          {!isWardenTab && !isPrincipalTab && (
                            <button
                              onClick={() => openPasswordResetModal(admin)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Reset Password"
                            >
                              <KeyIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteAdmin(admin._id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Admin"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="space-y-3">
                        {/* Role Information */}
                        {!isWardenTab && !isPrincipalTab && (
                          <div>
                            {admin.role === 'custom' && admin.customRoleId && (
                              <div className="mb-2">
                                <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                  {admin.customRole || 'Unknown Role'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Warden/Principal Specific Info */}
                        {isWardenTab && admin.hostelType && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${admin.hostelType === 'boys'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-pink-50 text-pink-700'
                              }`}>
                              {admin.hostelType === 'boys' ? 'Boys Hostel' : 'Girls Hostel'}
                            </span>
                          </div>
                        )}

                        {isPrincipalTab && (
                          <div className="flex items-start gap-2">
                            <svg className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <div className="flex flex-wrap gap-1">
                              {admin.assignedCourses && admin.assignedCourses.length > 0 ? (
                                admin.assignedCourses.map((course, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium truncate max-w-[150px]">
                                    {course}
                                  </span>
                                ))
                              ) : admin.course ? (
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium truncate max-w-[150px]">
                                  {typeof admin.course === 'object' ? admin.course.name : admin.course}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500 italic">No course assigned</span>
                              )}
                            </div>
                          </div>
                        )}

                        {isPrincipalTab && (
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {admin.email ? (
                              <span className="text-xs text-gray-600 truncate max-w-[200px]" title={admin.email}>
                                {admin.email}
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                                No email configured
                              </span>
                            )}
                          </div>
                        )}

                        {/* Permissions for Sub-Admins */}
                        {!isWardenTab && !isPrincipalTab && admin.permissions && admin.permissions.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-gray-600 mb-2">Permissions ({admin.permissions.length})</div>
                            <div className="flex flex-wrap gap-1">
                              {admin.permissions.slice(0, 3).map(permission => {
                                const permissionLabel = PERMISSIONS.find(p => p.id === permission)?.label || permission;
                                const accessLevel = admin.permissionAccessLevels?.[permission] || 'view';
                                return (
                                  <span key={permission} className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                                    <span className="truncate">{permissionLabel}</span>
                                    <span className={`ml-1 px-1 py-0.5 rounded text-xs ${accessLevel === 'full'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-600'
                                      }`}>
                                      {accessLevel === 'full' ? 'Full' : 'View'}
                                    </span>
                                  </span>
                                );
                              })}
                              {admin.permissions.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                  +{admin.permissions.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Role Type Badge */}
                        <div className="pt-2 border-t border-gray-100">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isWardenTab
                            ? 'bg-green-50 text-green-700'
                            : isPrincipalTab
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-blue-50 text-blue-700'
                            }`}>
                            {isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-4xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                  {showAddModal ? `Add New ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}` : `Edit ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}`}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </button>
              </div>

              <form onSubmit={showAddModal ? handleAddAdmin : handleEditAdmin} className="space-y-3">
                {/* Basic Information - Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Username <span className="text-red-500">*</span>
                      </div>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleFormChange}
                        required
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter username"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Password {showEditModal && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                        {showAddModal && <span className="text-red-500">*</span>}
                      </div>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleFormChange}
                        required={showAddModal}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter password"
                      />
                    </div>
                  </div>
                </div>

                {!isWardenTab && !isPrincipalTab && (
                  <div className="space-y-3">
                    {/* Role Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Role Type
                        </div>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="roleType"
                            value="sub_admin"
                            checked={roleType === 'sub_admin'}
                            onChange={() => {
                              setRoleType('sub_admin');
                              setFormData(prev => ({
                                ...prev,
                                customRoleId: '',
                                permissions: [],
                                permissionAccessLevels: {},
                                leaveManagementCourses: []
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-gray-700">Sub-Admin</div>
                            <div className="text-xs text-gray-500">Custom Permissions</div>
                          </div>
                        </label>
                        <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="roleType"
                            value="custom"
                            checked={roleType === 'custom'}
                            onChange={() => {
                              setRoleType('custom');
                              setFormData(prev => ({
                                ...prev,
                                customRoleId: '',
                                permissions: [],
                                permissionAccessLevels: {},
                                leaveManagementCourses: []
                              }));
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-gray-700">Custom Role</div>
                            <div className="text-xs text-gray-500">Predefined Role</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {roleType === 'sub_admin' ? (
                      // Sub-Admin permissions
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Permissions
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                          {PERMISSIONS.map(permission => {
                            // Get appropriate icon for each permission
                            const getPermissionIcon = (permissionId) => {
                              const icons = {
                                'dashboard_home': (
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                                  </svg>
                                ),
                                'room_management': (
                                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                ),
                                'student_management': (
                                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                ),
                                'maintenance_ticket_management': (
                                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ),
                                'leave_management': (
                                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ),
                                'announcement_management': (
                                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                                  </svg>
                                ),
                                'poll_management': (
                                  <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                  </svg>
                                ),
                                'menu_management': (
                                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                                  </svg>
                                ),
                                'course_management': (
                                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                ),
                                'attendance_management': (
                                  <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                  </svg>
                                ),
                                'found_lost_management': (
                                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                ),
                                'fee_management': (
                                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                  </svg>
                                ),
                                'concession_management': (
                                  <svg className="w-5 h-5 text-lime-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                                  </svg>
                                ),
                                'noc_management': (
                                  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                ),
                                'security_management': (
                                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                  </svg>
                                ),
                                'staff_guests_management': (
                                  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                ),
                                'feature_controls': (
                                  <svg className="w-5 h-5 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                )
                              };
                              return icons[permissionId] || (
                                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              );
                            };

                            return (
                              <div key={permission.id} className="border border-gray-200 rounded-lg p-2 hover:bg-gray-50 transition-colors">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value={permission.id}
                                    checked={formData.permissions.includes(permission.id)}
                                    onChange={handleFormChange}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                  {getPermissionIcon(permission.id)}
                                  <span className="text-sm font-medium text-gray-700">{permission.label}</span>
                                </label>

                                {/* Access Level Selector for each permission */}
                                {formData.permissions.includes(permission.id) && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                    <div className="text-xs font-medium text-blue-700 mb-1">
                                      Access Level for {permission.label}
                                    </div>
                                    <div className="flex gap-2">
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`access_${permission.id}`}
                                          value="view"
                                          checked={formData.permissionAccessLevels[permission.id] === 'view'}
                                          onChange={() => handleAccessLevelChange(permission.id, 'view')}
                                          className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-blue-700">View Access</span>
                                      </label>
                                      <label className="flex items-center gap-2">
                                        <input
                                          type="radio"
                                          name={`access_${permission.id}`}
                                          value="full"
                                          checked={formData.permissionAccessLevels[permission.id] === 'full'}
                                          onChange={() => handleAccessLevelChange(permission.id, 'full')}
                                          className="w-3 h-3 text-blue-600 border-gray-300 focus:ring-blue-500"
                                        />
                                        <span className="text-xs text-blue-700">Full Access</span>
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {/* Course selection for Leave Management */}
                                {permission.id === 'leave_management' && formData.permissions.includes('leave_management') && (
                                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                                    <label className="block text-xs font-medium text-blue-700 mb-1">
                                      Select Courses for Leave Management Access
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-24 overflow-y-auto">
                                      {courses.length > 0 ? (
                                        courses.map(course => {
                                          const isChecked = formData.leaveManagementCourses.includes(course.name);
                                          return (
                                            <label key={course._id} className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => handleCourseSelection(course.name, e.target.checked)}
                                                className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                              />
                                              <span className="text-xs text-blue-700 truncate">{course.name}</span>
                                            </label>
                                          );
                                        })
                                      ) : (
                                        <p className="text-xs text-blue-600 col-span-2">Loading courses...</p>
                                      )}
                                    </div>
                                    {formData.leaveManagementCourses.length === 0 && (
                                      <p className="text-xs text-red-600 mt-2">Please select at least one course</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      // Custom Role selection
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Custom Role <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="customRoleId"
                          value={formData.customRoleId}
                          onChange={handleFormChange}
                          required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select a custom role</option>
                          {customRoles.filter(role => role.isActive).map(role => (
                            <option key={role._id} value={role._id}>
                              {role.name} - {role.description}
                            </option>
                          ))}
                        </select>
                        {customRoles.filter(role => role.isActive).length === 0 && (
                          <p className="text-xs text-red-600 mt-2">No active custom roles available. Create one first.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Password Delivery Section for Sub-Admins - Only show when adding new admin */}
                {!isWardenTab && !isPrincipalTab && showAddModal && (
                  <div className="border-t pt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Password Delivery Method <span className="text-gray-500 text-xs">(Optional)</span>
                      </div>
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      Leave this blank if you want to provide credentials to the sub-admin manually.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="passwordDeliveryMethod"
                          value=""
                          checked={formData.passwordDeliveryMethod === ''}
                          onChange={handleFormChange}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-700">Manual</div>
                          <div className="text-xs text-gray-500">Provide manually</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="passwordDeliveryMethod"
                          value="email"
                          checked={formData.passwordDeliveryMethod === 'email'}
                          onChange={handleFormChange}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-700">Email</div>
                          <div className="text-xs text-gray-500">Send via email</div>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name="passwordDeliveryMethod"
                          value="mobile"
                          checked={formData.passwordDeliveryMethod === 'mobile'}
                          onChange={handleFormChange}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <div className="text-sm font-medium text-gray-700">SMS</div>
                          <div className="text-xs text-gray-500">Send via mobile</div>
                        </div>
                      </label>
                    </div>

                    {/* Email Input */}
                    {formData.passwordDeliveryMethod === 'email' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Email Address <span className="text-red-500">*</span>
                          </div>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleFormChange}
                            required={formData.passwordDeliveryMethod === 'email'}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                    )}

                    {/* Phone Number Input */}
                    {formData.passwordDeliveryMethod === 'mobile' && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Phone Number <span className="text-red-500">*</span>
                          </div>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <input
                            type="tel"
                            name="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleFormChange}
                            required={formData.passwordDeliveryMethod === 'mobile'}
                            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter phone number (e.g., 9876543210)"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Enter 10-digit phone number without country code
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Warden and Principal specific sections */}
                {(isWardenTab || isPrincipalTab) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Info Section */}
                    <div className={isWardenTab ? "p-3 bg-green-50 rounded-lg" : "p-3 bg-purple-50 rounded-lg"}>
                      <h3 className="text-sm font-medium mb-1">
                        {isWardenTab ? "Warden Permissions" : "Principal Permissions"}
                      </h3>
                      <p className="text-xs text-gray-700">
                        {isWardenTab
                          ? "Wardens have access to student oversight, complaint management, leave approval, room monitoring, announcements, discipline management, and attendance tracking."
                          : "Principals have access to attendance management, student oversight, and course-specific analytics."
                        }
                      </p>
                    </div>

                    {/* Configuration Section */}
                    <div className="space-y-3">
                      {isWardenTab && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Hostel Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            name="hostelType"
                            value={formData.hostelType}
                            onChange={handleFormChange}
                            required={isWardenTab}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Hostel Type</option>
                            <option value="boys">Boys Hostel</option>
                            <option value="girls">Girls Hostel</option>
                          </select>
                        </div>
                      )}

                      {isPrincipalTab && (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Courses <span className="text-red-500">*</span>
                            </label>
                            <div className="border border-gray-300 rounded-lg p-2 max-h-48 overflow-y-auto bg-white">
                              {courses.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {courses.map(course => (
                                    <label key={course._id} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                      <input
                                        type="checkbox"
                                        checked={formData.principalCourses.includes(course.name)}
                                        onChange={(e) => handleCourseSelection(course.name, e.target.checked, 'principalCourses')}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                      />
                                      <span className="text-sm text-gray-700">{course.name} ({course.code})</span>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">Loading courses...</p>
                              )}
                            </div>
                            {formData.principalCourses.length === 0 && (
                              <p className="text-xs text-red-500 mt-1">Please select at least one course</p>
                            )}
                          </div>

                          {/* Branch field for principal (optional) */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Branch <span className="text-gray-500 text-xs">(Optional - available only for single course assignment)</span>
                            </label>
                            <select
                              name="branch"
                              value={formData.branch}
                              onChange={handleFormChange}
                              disabled={formData.principalCourses.length !== 1}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                            >
                              <option value="">All Branches</option>
                              {filteredBranches.length > 0 ? (
                                filteredBranches.map(branch => (
                                  <option key={branch._id} value={branch.name}>
                                    {branch.name} ({branch.code})
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  {formData.principalCourses.length === 1 ? 'Loading branches...' : 'Select exactly one course to enable branch selection'}
                                </option>
                              )}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                              {formData.principalCourses.length > 1
                                ? 'Branch selection is disabled when multiple courses are assigned. Principal will see all branches for assigned courses.'
                                : formData.branch
                                  ? `Principal will only see students from ${formData.branch} branch`
                                  : 'Principal will see students from all branches of the selected course'}
                            </p>
                          </div>

                          {/* Email field for principal */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                Email Address <span className="text-gray-500 text-xs">(for leave notifications)</span>
                              </div>
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <input
                                type="email"
                                name="principalEmail"
                                value={formData.principalEmail}
                                onChange={handleFormChange}
                                className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Enter principal's email address"
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Principal will receive email notifications when leave requests are forwarded for approval
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckIcon className="w-4 h-4" />
                    {showAddModal ? `Add ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}` : `Update ${isWardenTab ? 'Warden' : isPrincipalTab ? 'Principal' : 'Sub-Admin'}`}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Role Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                  {selectedRole ? `Edit Custom Role` : `Create Custom Role`}
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </button>
              </div>

              <form onSubmit={selectedRole ? handleUpdateRole : handleCreateRole} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={roleFormData.name}
                    onChange={handleRoleFormChange}
                    required
                    className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter role name (e.g., Security Manager)"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={roleFormData.description}
                    onChange={handleRoleFormChange}
                    rows="3"
                    className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter role description"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-1 sm:space-y-2 max-h-40 sm:max-h-48 lg:max-h-64 overflow-y-auto">
                    {PERMISSIONS.map(permission => (
                      <div key={permission.id}>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            value={permission.id}
                            checked={roleFormData.permissions.includes(permission.id)}
                            onChange={handleRoleFormChange}
                            className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm text-gray-700">{permission.label}</span>
                        </label>

                        {/* Access Level Selector for each permission */}
                        {roleFormData.permissions.includes(permission.id) && (
                          <AccessLevelSelector
                            permissionId={permission.id}
                            permissionLabel={permission.label}
                            accessLevel={roleFormData.permissionAccessLevels[permission.id] || 'view'}
                            onAccessLevelChange={handleRoleAccessLevelChange}
                            disabled={false}
                          />
                        )}

                        {/* Course selection for permissions that need courses */}
                        {COURSE_ASSIGNMENT_PERMISSIONS.includes(permission.id) && roleFormData.permissions.includes(permission.id) && (
                          <div className="ml-3 sm:ml-4 lg:ml-6 mt-2 p-2 sm:p-3 bg-purple-50 rounded-lg">
                            <label className="block text-xs sm:text-sm font-medium text-purple-700 mb-2">
                              Course Assignment for {permission.label}
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`courseAssignment_${permission.id}`}
                                  value="all"
                                  checked={roleFormData.courseAssignment === 'all'}
                                  onChange={() => setRoleFormData(prev => ({ ...prev, courseAssignment: 'all' }))}
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                />
                                <span className="text-xs sm:text-sm text-purple-700">All Courses</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`courseAssignment_${permission.id}`}
                                  value="selected"
                                  checked={roleFormData.courseAssignment === 'selected'}
                                  onChange={() => setRoleFormData(prev => ({ ...prev, courseAssignment: 'selected' }))}
                                  className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                                />
                                <span className="text-xs sm:text-sm text-purple-700">Selected Courses</span>
                              </label>
                            </div>

                            {roleFormData.courseAssignment === 'selected' && (
                              <div className="mt-2 space-y-1 sm:space-y-2 max-h-20 sm:max-h-24 lg:max-h-32 overflow-y-auto">
                                {courses.length > 0 ? (
                                  <>
                                    <p className="text-xs text-purple-600 mb-2">Available courses: {courses.length}</p>
                                    {courses.map(course => {
                                      const isChecked = roleFormData.assignedCourses.includes(course.name);
                                      console.log(`🔧 Course ${course.name} checked:`, isChecked);
                                      return (
                                        <label key={course._id} className="flex items-center gap-1 sm:gap-2">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={(e) => handleRoleCourseSelection(course.name, e.target.checked)}
                                            className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                          />
                                          <span className="text-xs text-purple-700 truncate">{course.name}</span>
                                        </label>
                                      );
                                    })}
                                    <p className="text-xs text-purple-600 mt-2">Selected courses: {roleFormData.assignedCourses.length}</p>
                                  </>
                                ) : (
                                  <p className="text-xs text-purple-600">Loading courses...</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-2.5 sm:px-3 lg:px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 sm:px-3 lg:px-4 py-2 text-sm sm:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1 sm:gap-2"
                  >
                    <CheckIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    {selectedRole ? 'Update Custom Role' : 'Create Custom Role'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPasswordResetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 w-full max-w-xs sm:max-w-sm md:max-w-md mx-2 sm:mx-4"
            >
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
                  Reset Password
                </h2>
                <button
                  onClick={resetForm}
                  className="p-1 sm:p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Reset password for: <span className="font-semibold text-gray-900">{selectedAdmin?.username}</span>
                </p>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordResetData.newPassword}
                    onChange={(e) => setPasswordResetData(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter new password"
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={passwordResetData.confirmPassword}
                    onChange={(e) => setPasswordResetData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    className="w-full px-2.5 sm:px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-2.5 sm:px-3 lg:px-4 py-2 text-sm sm:text-base text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 sm:px-3 lg:px-4 py-2 text-sm sm:text-base bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-1 sm:gap-2"
                  >
                    <KeyIcon className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    Reset Password
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminManagement; 