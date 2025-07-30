import React, { useState, useEffect } from 'react';
import api from '../../utils/axios';
import toast from 'react-hot-toast';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  DocumentArrowDownIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  UserIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const AdmitCards = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    course: '',
    year: '',
    category: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    totalStudents: 0
  });
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [previewModal, setPreviewModal] = useState({
    open: false,
    student: null,
    loading: false,
    feeStructure: null
  });
  const [generating, setGenerating] = useState(false);
  const [feeStructureCache, setFeeStructureCache] = useState({});
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Fetch courses from backend
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true);
      const response = await api.get('/api/course-management/courses');
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoadingCourses(false);
    }
  };

  // Fetch students for admit cards
  const fetchStudents = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit: 20,
        search: debouncedSearch,
        ...filters
      });

      const response = await api.get(`/api/admin/students/admit-cards?${params}`);
      
      if (response.data.success) {
        setStudents(response.data.data.students);
        setPagination(response.data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [debouncedSearch, filters.course, filters.year, filters.category]);

  // Handle search
  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, current: 1 }));
    setSelectedStudents([]); // Clear selections when search changes
  };

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
    setSelectedStudents([]); // Clear selections when filters change
  };

  // Handle pagination
  const handlePageChange = (page) => {
    fetchStudents(page);
  };

  // Handle student selection
  const handleStudentSelect = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Handle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s._id));
    } else {
      setSelectedStudents([]);
    }
  };

  // Preview admit card
  const handlePreview = async (student) => {
    try {
      setPreviewModal({ 
        open: true, 
        student: null, 
        loading: true,
        feeStructure: null 
      });
      
      // Fetch student data first to get academic year
      const studentResponse = await api.post(`/api/admin/students/${student._id}/admit-card`);
      
      if (studentResponse.data.success) {
        const studentData = studentResponse.data.data.student;
        const studentAcademicYear = studentData.academicYear || '2024-2025';
        
        // Fetch fee structure using student's academic year
        const feeStructure = await fetchFeeStructure(student.category || 'A', studentAcademicYear);
        
        setPreviewModal({ 
          open: true, 
          student: studentData, 
          loading: false,
          feeStructure: feeStructure
        });
             } else {
         toast.error('Failed to load student data for preview');
         setPreviewModal({ 
           open: false, 
           student: null, 
           loading: false,
           feeStructure: null 
         });
       }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Failed to load student data for preview');
      setPreviewModal({ 
        open: false, 
        student: null, 
        loading: false,
        feeStructure: null 
      });
    }
  };

     // Generate individual admit card
   const handleGenerateAdmitCard = async (student) => {
     try {
       setGenerating(true);
       
       const response = await api.post(`/api/admin/students/${student._id}/admit-card`);
       
       if (response.data.success) {
         await generateAdmitCardPDF(response.data.data.student);
         toast.success('Admit card generated successfully');
       }
     } catch (error) {
       console.error('Error generating admit card:', error);
       if (error.response?.status === 400) {
         toast.error(error.response.data.message);
       } else {
         toast.error('Failed to generate admit card');
       }
     } finally {
       setGenerating(false);
     }
   };

  // Generate bulk admit cards
  const handleGenerateBulkAdmitCards = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select students to generate admit cards');
      return;
    }

    try {
      setGenerating(true);
      
      const response = await api.post('/api/admin/students/bulk-admit-cards', {
        studentIds: selectedStudents
      });
      
      if (response.data.success) {
        await generateBulkAdmitCardsPDF(response.data.data.students);
        toast.success(`${response.data.data.students.length} admit cards generated successfully`);
        setSelectedStudents([]);
      }
    } catch (error) {
      console.error('Error generating bulk admit cards:', error);
      if (error.response?.status === 400) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to generate admit cards');
      }
    } finally {
      setGenerating(false);
    }
  };



  // Fetch fee structure for a student
  const fetchFeeStructure = async (studentCategory, studentAcademicYear) => {
    try {
      const cacheKey = `${studentAcademicYear}-${studentCategory}`;
      
      // Check cache first
      if (feeStructureCache[cacheKey]) {
        console.log('Using cached fee structure for:', cacheKey);
        return feeStructureCache[cacheKey];
      }

      console.log('Fetching fee structure for:', { academicYear: studentAcademicYear, category: studentCategory });
      
      const response = await api.get(`/api/fee-structures/admit-card/${studentAcademicYear}/${studentCategory}`);
      
      if (response.data.success) {
        const feeStructure = response.data.data;
        console.log('Fee structure fetched:', feeStructure);
        
        // Cache the result
        setFeeStructureCache(prev => ({
          ...prev,
          [cacheKey]: feeStructure
        }));
        
        return feeStructure;
      } else {
        console.error('Failed to fetch fee structure:', response.data);
        return null;
      }
    } catch (error) {
      console.error('Error fetching fee structure:', error);
      return null;
    }
  };

  // Generate PDF for individual admit card
  const generateAdmitCardPDF = async (student) => {
    try {
      console.log('Generating PDF for student:', student);
      console.log('Student data types:', {
        name: typeof student.name,
        rollNumber: typeof student.rollNumber,
        course: typeof student.course,
        year: typeof student.year,
        studentPhone: typeof student.studentPhone,
        parentPhone: typeof student.parentPhone,
        address: typeof student.address,
        hostelId: typeof student.hostelId,
        category: typeof student.category,
        roomNumber: typeof student.roomNumber
      });
      console.log('jsPDF version:', jsPDF.version);
      
      // Get academic year from student details (default to 2024-2025 if not available)
      const studentAcademicYear = student.academicYear || '2024-2025';
      
      // Fetch fee structure for the student's category and academic year
      const feeStructure = await fetchFeeStructure(student.category || 'A', studentAcademicYear);
      console.log('Fee structure for student:', feeStructure);
      
      const doc = new jsPDF();
      console.log('doc.autoTable available:', typeof doc.autoTable);
      
      // Set up the page
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const contentWidth = pageWidth - (margin * 2);
      
      // Draw main border
      doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));
      
      // Header section
      let yPos = margin + 10;
      
      // Logo placeholder (left side)
      doc.rect(margin + 5, yPos, 30, 15);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PYDAH', margin + 20, yPos + 8, { align: 'center' });
      doc.text('GROUP', margin + 20, yPos + 12, { align: 'center' });
      
      // Main title (center)
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Pydah Group Of Institutions', pageWidth / 2, yPos + 10, { align: 'center' });
      
      // Right side - Admit Card title
      doc.setFontSize(12);
      doc.text('Hostel Admit Card', pageWidth - margin - 5, yPos + 5, { align: 'right' });
      doc.setFontSize(10);
      doc.text(`${studentAcademicYear} AY`, pageWidth - margin - 5, yPos + 12, { align: 'right' });
      
      // Student details section (left side)
      yPos = margin + 40;
      const leftColumnX = margin + 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Student Name & Details', leftColumnX, yPos);
      yPos += 8;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      
      // Student details in table format
      const studentDetails = [
        ['Name:', String(student.name || '')],
        ['Roll Number:', String(student.rollNumber || '')],
        ['Course:', String(student.course?.name || student.course || '')],
        ['Year:', String(student.year || '')],
        ['Student Mobile:', String(student.studentPhone || '')],
        ['Parent Mobile:', String(student.parentPhone || '')],
        ['Address:', String(student.address || '')],
        ['Hostel ID:', String(student.hostelId || '')],
        ['Category:', String(student.category || '')],
        ['Room Number:', String(student.roomNumber || '')]
      ];
      
      studentDetails.forEach(([label, value]) => {
        doc.text(label, leftColumnX, yPos);
        doc.text(value || '', leftColumnX + 40, yPos);
        yPos += 6;
      });
      
             // Photo section (right side)
       const photoX = pageWidth - margin - 45;
       const photoY = margin + 45;
       const photoWidth = 40;
       const photoHeight = 50;
       
       // Photo border
       doc.rect(photoX, photoY, photoWidth, photoHeight);
       
               // Add student photo if available
        if (student.studentPhoto) {
          try {
            console.log('Student photo data type:', typeof student.studentPhoto);
            
            // The backend now returns base64 image data
            if (student.studentPhoto.startsWith('data:image')) {
              // Add the image to PDF
              doc.addImage(student.studentPhoto, 'JPEG', photoX, photoY, photoWidth, photoHeight);
              console.log('Photo added to PDF successfully');
            } else {
              // Fallback to placeholder if not base64
              console.warn('Photo data is not in base64 format');
              doc.setFontSize(8);
              doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
            }
          } catch (error) {
            console.error('Error adding photo to PDF:', error);
            // Fallback to placeholder
            doc.setFontSize(8);
            doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
          }
        } else {
          // No photo available, show placeholder
          doc.setFontSize(8);
          doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
        }
      
      // Signature section below photo
      const signatureY = photoY + photoHeight + 5;
      doc.rect(photoX, signatureY, photoWidth, 20);
      doc.setFontSize(7);
      doc.text('Authorised Signature', photoX + photoWidth/2, signatureY + 8, { align: 'center' });
      doc.text('with Stamp', photoX + photoWidth/2, signatureY + 13, { align: 'center' });
      
      // Fee terms table
      yPos = margin + 160;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Fee Terms', leftColumnX, yPos);
      yPos += 8;
      
              // Use dynamic fee structure or fallback to 0
        const feeData = [
          ['Term', 'Due Amount', 'Due Date', 'Remarks'],
          ['First Term', `Rs${feeStructure?.term1Fee || 0}`, '', ''],
          ['Second Term', `Rs${feeStructure?.term2Fee || 0}`, '', 'On or before Second MID Term exam in First Sem'],
          ['Third Term', `Rs${feeStructure?.term3Fee || 0}`, '', 'On or before Second semester starting Date']
        ];
      
              if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: yPos,
            head: [feeData[0]],
            body: feeData.slice(1),
            theme: 'grid',
            styles: {
              fontSize: 7,
              cellPadding: 2
            },
            headStyles: {
              fillColor: [80, 80, 80],
              textColor: 255,
              fontStyle: 'bold',
              fontSize: 8
            },
            columnStyles: {
              0: { cellWidth: 25, fontSize: 7 },
              1: { cellWidth: 20, fontSize: 7 },
              2: { cellWidth: 20, fontSize: 7 },
              3: { cellWidth: 50, fontSize: 6 }
            }
          });
        } else {
          // Fallback: manually draw the table
          console.warn('doc.autoTable not available, using fallback table');
          doc.setFontSize(7);
          feeData.forEach((row, rowIndex) => {
            const rowY = yPos + (rowIndex * 7);
            doc.text(row[0], leftColumnX, rowY);
            doc.text(row[1], leftColumnX + 25, rowY);
            doc.text(row[2], leftColumnX + 45, rowY);
            doc.text(row[3], leftColumnX + 65, rowY);
          });
          yPos += (feeData.length * 7) + 8;
        }
      
      // Important notes
      const tableEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : yPos;
      yPos = tableEndY + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Important Note:', leftColumnX, yPos);
      yPos += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('1. Late fee of Rs.500/- will be applicable for each term if not paid on or before the above due dates', leftColumnX, yPos);
      yPos += 5;
      doc.text('2. Electricity bill have to be paid extra on monthly basis as per the room sharing for all type category hostels', leftColumnX, yPos);
      
      // Save the PDF
      const fileName = `AdmitCard_${student.name || 'Student'}_${student.rollNumber || 'Unknown'}.pdf`;
      console.log('Saving PDF as:', fileName);
      doc.save(fileName);
      
      console.log('PDF generated successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

     // Generate PDF for bulk admit cards
   const generateBulkAdmitCardsPDF = async (students) => {
     for (let i = 0; i < students.length; i++) {
       try {
         await generateAdmitCardPDF(students[i]);
         // Small delay between generations
         if (i < students.length - 1) {
           await new Promise(resolve => setTimeout(resolve, 500));
         }
       } catch (error) {
         console.error(`Error generating PDF for student ${students[i].name}:`, error);
       }
     }
   };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      <SEO title="Admit Cards - Admin" />
      
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">Admit Cards</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Generate hostel admit cards for students</p>
      </div>



      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, roll number, or hostel ID..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Course Filter */}
          <select
            value={filters.course}
            onChange={(e) => handleFilterChange('course', e.target.value)}
            className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loadingCourses}
          >
            <option value="">
              {loadingCourses ? 'Loading courses...' : 'All Courses'}
            </option>
            {courses.map(course => (
              <option key={course._id} value={course.name}>
                {course.name}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={filters.year}
            onChange={(e) => handleFilterChange('year', e.target.value)}
            className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>

          {/* Category Filter */}
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="A+">A+</option>
            <option value="A">A</option>
            <option value="B+">B+</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </div>
        
        {/* Clear Filters Button */}
        <div className="mt-3 sm:mt-4 flex justify-end">
          <button
            onClick={() => {
              setFilters({ course: '', year: '', category: '' });
              setSearch('');
              setPagination(prev => ({ ...prev, current: 1 }));
              setSelectedStudents([]);
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-1"
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Clear Filters</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex items-center space-x-2">
              <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <span className="text-blue-800 font-medium text-sm sm:text-base">
                {selectedStudents.length} student(s) selected
              </span>
            </div>
            <button
              onClick={handleGenerateBulkAdmitCards}
              disabled={generating}
              className="bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
            >
              <DocumentArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>Generate {selectedStudents.length} Admit Card(s)</span>
            </button>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-8 sm:py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Students ({pagination.totalStudents})
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === students.length && students.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-600">Select All</span>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="hidden sm:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course & Year
                    </th>
                    <th className="hidden lg:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hostel Details
                    </th>
                    <th className="hidden md:table-cell px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Photo Status
                    </th>
                    <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleStudentSelect(student._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                            {student.studentPhoto ? (
                              <img
                                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                                src={student.studentPhoto}
                                alt={student.name}
                              />
                            ) : (
                              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <UserIcon className="h-4 w-4 sm:h-6 sm:w-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {student.name}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 truncate">
                              {student.rollNumber}
                            </div>
                            {/* Mobile-only course info */}
                            <div className="sm:hidden text-xs text-gray-500 truncate">
                              {student.course?.name || student.course} • Year {student.year}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          {student.course?.name || student.course}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          Year {student.year}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="text-xs sm:text-sm text-gray-900">
                          ID: {student.hostelId || 'N/A'}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500">
                          {student.category} • Room {student.roomNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        {student.studentPhoto ? (
                          <div className="flex items-center text-green-600">
                            <PhotoIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Available</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Missing</span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <button
                            onClick={() => handlePreview(student)}
                            className="text-blue-600 hover:text-blue-900 flex items-center justify-center sm:justify-start"
                          >
                            <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Preview</span>
                          </button>
                          <button
                            onClick={() => handleGenerateAdmitCard(student)}
                            disabled={!student.studentPhoto || generating}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start"
                          >
                            <DocumentArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Generate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.total > 1 && (
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                    Showing page {pagination.current} of {pagination.total}
                  </div>
                  <div className="flex justify-center sm:justify-end space-x-2">
                    <button
                      onClick={() => handlePageChange(pagination.current - 1)}
                      disabled={pagination.current === 1}
                      className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.current + 1)}
                      disabled={pagination.current === pagination.total}
                      className="px-2 sm:px-3 py-1 border border-gray-300 rounded-md text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Admit Card Preview
                </h3>
                <button
                  onClick={() => setPreviewModal({ open: false, student: null, loading: false, feeStructure: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
              
                             {previewModal.loading ? (
                 <div className="flex justify-center items-center py-8 sm:py-12">
                   <LoadingSpinner />
                 </div>
               ) : previewModal.student ? (
                 <div className="border-2 border-gray-300 p-3 sm:p-6 bg-gray-50">
                   {/* Admit Card Preview */}
                   <div className="text-center mb-3 sm:mb-4">
                     <h4 className="text-lg sm:text-xl font-bold">Pydah Group Of Institutions</h4>
                     <p className="text-base sm:text-lg font-semibold">Hostel Admit Card</p>
                     <p className="text-xs sm:text-sm text-gray-600">{previewModal.student.academicYear || '2024-2025'} AY</p>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                     <div>
                       <h5 className="font-semibold mb-2 text-sm sm:text-base">Student Details</h5>
                       <div className="space-y-1 text-xs sm:text-sm">
                         <div><strong>Name:</strong> {previewModal.student.name}</div>
                         <div><strong>Roll Number:</strong> {previewModal.student.rollNumber}</div>
                         <div><strong>Course:</strong> {previewModal.student.course}</div>
                         <div><strong>Year:</strong> {previewModal.student.year}</div>
                         <div><strong>Mobile:</strong> {previewModal.student.studentPhone || 'N/A'}</div>
                         <div><strong>Parent Mobile:</strong> {previewModal.student.parentPhone || 'N/A'}</div>
                         <div><strong>Address:</strong> {previewModal.student.address || 'N/A'}</div>
                         <div><strong>Hostel ID:</strong> {previewModal.student.hostelId || 'N/A'}</div>
                         <div><strong>Category:</strong> {previewModal.student.category || 'N/A'}</div>
                         <div><strong>Room:</strong> {previewModal.student.roomNumber || 'N/A'}</div>
                       </div>
                     </div>
                     
                     <div className="text-center">
                       <div className="w-24 h-32 sm:w-32 sm:h-40 border-2 border-gray-300 mx-auto mb-3 sm:mb-4 bg-white flex items-center justify-center">
                         {previewModal.student.studentPhoto ? (
                           <img
                             src={previewModal.student.studentPhoto}
                             alt="Student Photo"
                             className="w-20 h-28 sm:w-28 sm:h-36 object-cover"
                           />
                         ) : (
                           <span className="text-gray-400 text-xs sm:text-sm">Photo</span>
                         )}
                       </div>
                       <div className="w-24 h-10 sm:w-32 sm:h-12 border-2 border-gray-300 mx-auto bg-white flex items-center justify-center">
                         <span className="text-xs text-gray-500">Signature</span>
                       </div>
                     </div>
                   </div>
                   
                   {/* Fee Structure Information */}
                   {previewModal.feeStructure && (
                     <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                       <h6 className="font-semibold text-sm sm:text-base text-blue-900 mb-2">Fee Structure Information</h6>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                         <div>
                           <span className="font-medium text-blue-700">Academic Year:</span>
                           <div className="text-blue-900">{previewModal.feeStructure.academicYear}</div>
                         </div>
                         <div>
                           <span className="font-medium text-blue-700">Category:</span>
                           <div className="text-blue-900">{previewModal.feeStructure.category}</div>
                         </div>
                         <div>
                           <span className="font-medium text-blue-700">Total Fee:</span>
                           <div className="text-blue-900">Rs{previewModal.feeStructure.totalFee?.toLocaleString() || '0'}</div>
                         </div>
                         <div>
                           <span className="font-medium text-blue-700">Status:</span>
                           <div className={`font-medium ${previewModal.feeStructure.found ? 'text-green-600' : 'text-red-600'}`}>
                             {previewModal.feeStructure.found ? 'Found' : 'Not Found (Using 0)'}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}
                  
                                     <div className="mt-4 sm:mt-6">
                     <h5 className="font-semibold mb-2 text-sm sm:text-base">Fee Terms</h5>
                     <div className="bg-white border border-gray-300 rounded overflow-x-auto">
                       <table className="w-full text-xs sm:text-sm">
                         <thead className="bg-gray-100">
                           <tr>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Term</th>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Due Amount</th>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Due Date</th>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Remarks</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">First Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term1Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2"></td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2"></td>
                           </tr>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Second Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term2Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2"></td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">On or before Second MID Term exam in First Sem</td>
                           </tr>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Third Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term3Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2"></td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">On or before Second semester starting Date</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>
                   </div>
                   
                   <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-600">
                     <p><strong>Important Note:</strong></p>
                     <p>1. Late fee of Rs.500/- will be applicable for each term if not paid on or before the above due dates</p>
                     <p>2. Electricity bill have to be paid extra on monthly basis as per the room sharing for all type category hostels</p>
                   </div>
                </div>
              ) : null}
              
                             <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                 <button
                   onClick={() => setPreviewModal({ open: false, student: null, loading: false, feeStructure: null })}
                   className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm sm:text-base"
                 >
                   Close
                 </button>
                 {previewModal.student && (
                   <button
                     onClick={async () => {
                       await generateAdmitCardPDF(previewModal.student);
                       setPreviewModal({ open: false, student: null, loading: false, feeStructure: null });
                     }}
                     className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm sm:text-base"
                   >
                     Generate PDF
                   </button>
                 )}
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdmitCards; 