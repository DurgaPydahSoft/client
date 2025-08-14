import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
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
  
  // Get password from URL parameters (for recently added students)
  const passwordFromURL = searchParams.get('password');
  
  // Check if we came from password popup (has password in URL)
  const isFromPasswordPopup = !!passwordFromURL;
  
  // Function to fetch password for a specific student
  const fetchStudentPassword = async (studentId) => {
    try {
      console.log('🔍 Frontend: Fetching password for student ID:', studentId);
      // Check if this student has a TempStudent record (recently added students)
      const tempResponse = await api.get(`/api/admin/students/${studentId}/temp-password`);
      console.log('🔍 Frontend: API response:', tempResponse.data);
      
      if (tempResponse.data.success && tempResponse.data.data.password) {
        console.log('🔍 Frontend: Password found:', tempResponse.data.data.password);
        return tempResponse.data.data.password;
      }
      console.log('❌ Frontend: No password found in response');
      return null;
    } catch (error) {
      console.error('❌ Frontend: Error fetching student password:', error);
      return null;
    }
  };

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

  // Generate PDF for individual admit card with student and warden copies
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
      
      // Fetch student password
      let studentPassword = null;
      if (student._id) {
        studentPassword = await fetchStudentPassword(student._id);
      console.log('Student password fetched:', studentPassword ? 'Yes' : 'No');
      } else {
        console.log('⚠️ Student ID is undefined, skipping password fetch');
      }
      
      // For recently added students, use URL password if available
      const finalPassword = passwordFromURL || studentPassword;
      console.log('Final password for student:', finalPassword ? 'Available' : 'Not available');
      
      // Create A4 size document for full page with two copies
      const doc = new jsPDF('p', 'mm', 'a4');
      console.log('doc.autoTable available:', typeof doc.autoTable);
      
      // Set up the page for full A4 size
      const pageWidth = doc.internal.pageSize.width; // 210mm
      const pageHeight = doc.internal.pageSize.height; // 297mm
      const halfPageHeight = pageHeight / 2; // 148.5mm
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2);
      
      // Function to generate one copy of admit card
      const generateOneCopy = (startY, copyLabel, password) => {
        // Validate student object
        if (!student || typeof student !== 'object') {
          console.error('❌ Invalid student object:', student);
          throw new Error('Invalid student object provided to generateOneCopy');
        }
        
        // Check if student has concession
        const hasConcession = student.concession && student.concession > 0;
        
        // Debug logging
        console.log('🔍 generateOneCopy called with:', {
          startY,
          copyLabel,
          hasConcession,
          studentConcession: student.concession,
          feeStructure: feeStructure,
          studentKeys: Object.keys(student)
        });
        
        // Draw border for this copy
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.5);
        doc.rect(margin, startY, contentWidth, halfPageHeight - (margin * 2));
        
        // Add copy label
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(copyLabel, margin + 5, startY + 5);
        
        // Header section
        let yPos = startY + 8;
        
                 // Logo image (left side)
         try {
           // Add the Pydah logo image
           doc.addImage('/PYDAH_LOGO_PHOTO.jpg', 'JPEG', margin + 4, yPos, 22, 12);
         } catch (error) {
           console.error('Error adding logo image:', error);
           // Fallback to placeholder if image fails to load
           doc.setFillColor(240, 240, 240);
           doc.rect(margin + 4, yPos, 22, 12);
           doc.setFontSize(6);
           doc.setFont('helvetica', 'bold');
           doc.setTextColor(0, 0, 0);
           doc.text('PYDAH', margin + 15, yPos + 6, { align: 'center' });
           doc.text('GROUP', margin + 15, yPos + 9, { align: 'center' });
         }
        
        // Main title (center)
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Pydah Group Of Institutions', pageWidth / 2, yPos + 8, { align: 'center' });
        
        // Right side - Admit Card title
        doc.setFontSize(8);
        doc.text('HOSTEL ADMIT CARD', pageWidth - margin - 5, yPos + 4, { align: 'right' });
        doc.setFontSize(6);
        doc.text(`${studentAcademicYear} AY`, pageWidth - margin - 5, yPos + 8, { align: 'right' });
        
        // Divider line
        yPos = startY + 24;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(margin + 5, yPos, pageWidth - margin - 5, yPos);
        
        // Student details and photo section
        yPos += 6;
        
        // Create a centered layout with photo and details side by side
        const centerX = pageWidth / 2;
        const photoWidth = 28;
        const photoHeight = 35;
        
        // Photo section
        const photoX = centerX + 25;
        const photoY = yPos;
        
        // Photo border
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.4);
        doc.rect(photoX, photoY, photoWidth, photoHeight);
        
        // Add student photo if available
        if (student.studentPhoto) {
          try {
            if (student.studentPhoto.startsWith('data:image')) {
              doc.addImage(student.studentPhoto, 'JPEG', photoX, photoY, photoWidth, photoHeight);
            } else {
              doc.setFontSize(4);
              doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
            }
          } catch (error) {
            doc.setFontSize(4);
            doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
          }
        } else {
          doc.setFontSize(4);
          doc.text('Photo', photoX + photoWidth/2, photoY + photoHeight/2, { align: 'center' });
        }
        
        // Signature section below photo
        const signatureY = photoY + photoHeight + 3;
        doc.rect(photoX, signatureY, photoWidth, 10);
        doc.setFontSize(4);
        doc.text('Signature', photoX + photoWidth/2, signatureY + 4, { align: 'center' });
        doc.text('& Stamp', photoX + photoWidth/2, signatureY + 7, { align: 'center' });
        
        // Student details section
        const detailsX = centerX - 40;
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('STUDENT DETAILS', detailsX, yPos);
        yPos += 4;
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
              // Student details
      const studentDetails = [
        ['Name:', String(student.name || '')],
        ['Roll No:', String(student.rollNumber || '')],
        ['Course:', String(student.course?.name || student.course || '')],
        ['Year:', String(student.year || '')],
        ['Mobile:', String(student.studentPhone || '')],
        ['Parent:', String(student.parentPhone || '')],
        ['Address:', String(student.address || '')],
        ['Hostel ID:', String(student.hostelId || '')],
        ['Category:', String(student.category || '')],
        ['Room:', String(student.roomNumber || '')]
      ];
      
      // Add password to student copy only
      if (copyLabel === 'STUDENT COPY') {
        // Priority: URL password (for recently added) > fetched password (for existing)
        const finalPassword = passwordFromURL || password;
        if (finalPassword) {
          studentDetails.push(['Password:', String(finalPassword)]);
        }
        // If no password available, don't add password field at all
      }
        
        studentDetails.forEach(([label, value]) => {
          doc.setFont('helvetica', 'bold');
          doc.text(label, detailsX, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(value || '', detailsX + 25, yPos);
          yPos += 3;
        });
        

        
                 // Fee terms table
         yPos = startY + 80;
         doc.setFontSize(8);
         doc.setFont('helvetica', 'bold');
         doc.setTextColor(0, 0, 0);
         doc.text('FEE STRUCTURE', centerX - 40, yPos);
         yPos += 4;
         

         
                          // Fee data with concession information
         const feeData = [
           ['Term', 'Original Amount', 'After Concession', 'Remarks'],
           ['1st Term', `Rs : ${feeStructure?.term1Fee || 0}`, `Rs : ${student.calculatedTerm1Fee || feeStructure?.term1Fee || 0}`, ''],
           ['2nd Term', `Rs : ${feeStructure?.term2Fee || 0}`, `Rs : ${student.calculatedTerm2Fee || feeStructure?.term2Fee || 0}`, 'Before 2nd MID Term'],
           ['3rd Term', `Rs : ${feeStructure?.term3Fee || 0}`, `Rs : ${student.calculatedTerm3Fee || feeStructure?.term3Fee || 0}`, 'Before 2nd Sem Start']
         ];
         
         // Always add total row
         const totalOriginalFee = (feeStructure?.term1Fee || 0) + (feeStructure?.term2Fee || 0) + (feeStructure?.term3Fee || 0);
         
         // Calculate total after concession: if calculated fees exist, use them; otherwise, use original fees
         const totalAfterConcession = (student.calculatedTerm1Fee || feeStructure?.term1Fee || 0) + 
                                    (student.calculatedTerm2Fee || feeStructure?.term2Fee || 0) + 
                                    (student.calculatedTerm3Fee || feeStructure?.term3Fee || 0);
         
         feeData.push(['TOTAL', `Rs : ${totalOriginalFee.toLocaleString()}`, `Rs : ${totalAfterConcession.toLocaleString()}`, '']);
        
        console.log('🔍 Fee data prepared:', {
          feeData,
          feeStructure,
          studentCalculatedFees: {
            term1: student.calculatedTerm1Fee,
            term2: student.calculatedTerm2Fee,
            term3: student.calculatedTerm3Fee
          }
        });
         
         // Check if autoTable is available
         console.log('🔍 autoTable availability check:', {
           hasAutoTable: typeof doc.autoTable === 'function',
           docType: typeof doc,
           docKeys: Object.keys(doc)
         });
         
         if (typeof doc.autoTable === 'function') {
           try {
           doc.autoTable({
               startY: yPos + 4,
             head: [feeData[0]],
             body: feeData.slice(1),
             theme: 'grid',
             styles: {
               fontSize: 5,
               cellPadding: 1.5,
               lineColor: [0, 0, 0],
                 lineWidth: 0.2,
                 halign: 'center',
                 valign: 'middle'
             },
             headStyles: {
               fillColor: [70, 70, 70],
               textColor: 255,
               fontStyle: 'bold',
               fontSize: 6,
               lineColor: [0, 0, 0],
                 lineWidth: 0.2,
                 halign: 'center',
                 valign: 'middle'
             },
             columnStyles: {
                 0: { cellWidth: 20, fontSize: 5, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
                 1: { cellWidth: 24, fontSize: 5, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
                 2: { cellWidth: 24, fontSize: 5, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
                 3: { cellWidth: 20, fontSize: 4, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' }
               },
               margin: { left: centerX - 40 },
               tableWidth: 'auto',
               showFoot: 'lastPage',
               didDrawPage: function(data) {
                 // Ensure borders are drawn
                 doc.setDrawColor(0, 0, 0);
                 doc.setLineWidth(0.5);
               }
             });
             console.log('✅ autoTable executed successfully');
           } catch (autoTableError) {
             console.error('❌ autoTable error:', autoTableError);
                        // Fallback to manual text rendering
           doc.setFontSize(5);
           const tableStartY = yPos + 4;
           
           // Draw table borders manually
           doc.setDrawColor(0, 0, 0);
           doc.setLineWidth(0.2);
           
           // Calculate table dimensions based on actual column positions
           const col1Start = centerX - 40;
           const col1End = centerX - 20;
           const col2Start = centerX - 20;
           const col2End = centerX + 4;
           const col3Start = centerX + 4;
           const col3End = centerX + 28;
           const col4Start = centerX + 28;
           const col4End = centerX + 48;
           
           const tableWidth = col4End - col1Start;
           const tableHeight = feeData.length * 5;
           
           // Draw outer border
           doc.rect(col1Start, tableStartY - 2, tableWidth, tableHeight + 2);
           
           // Draw horizontal lines between rows (but not the extra bottom line)
           for (let i = 0; i < feeData.length; i++) {
             const lineY = tableStartY - 2 + (i * 5);
             doc.line(col1Start, lineY, col4End, lineY);
           }
           
           // Draw vertical lines between columns
           doc.line(col2Start, tableStartY - 2, col2Start, tableStartY + tableHeight);
           doc.line(col3Start, tableStartY - 2, col3Start, tableStartY + tableHeight);
           doc.line(col4Start, tableStartY - 2, col4Start, tableStartY + tableHeight);
           
           feeData.forEach((row, rowIndex) => {
             const rowY = tableStartY + (rowIndex * 5);
             
             // Style the header row and total row differently
             if (rowIndex === 0 || row[0] === 'TOTAL') {
               doc.setFont('helvetica', 'bold');
               doc.setFontSize(6);
         } else {
               doc.setFont('helvetica', 'normal');
           doc.setFontSize(5);
             }
               
               // Center text in each column
               doc.text(row[0], centerX - 30, rowY, { align: 'center' });
               doc.text(row[1], centerX - 8, rowY, { align: 'center' });
               doc.text(row[2], centerX + 16, rowY, { align: 'center' });
               doc.text(row[3], centerX + 38, rowY, { align: 'center' });
             });
           }
         } else {
           console.log('⚠️ autoTable not available, using manual text rendering');
           doc.setFontSize(5);
           const tableStartY = yPos + 4;
           
           // Draw table borders manually
           doc.setDrawColor(0, 0, 0);
           doc.setLineWidth(0.2);
           
           // Calculate table dimensions based on actual column positions
           const col1Start = centerX - 40;
           const col1End = centerX - 20;
           const col2Start = centerX - 20;
           const col2End = centerX + 4;
           const col3Start = centerX + 4;
           const col3End = centerX + 28;
           const col4Start = centerX + 28;
           const col4End = centerX + 48;
           
           const tableWidth = col4End - col1Start;
           const tableHeight = feeData.length * 5;
           
           // Draw outer border
           doc.rect(col1Start, tableStartY - 2, tableWidth, tableHeight + 2);
           
           // Draw horizontal lines between rows (but not the extra bottom line)
           for (let i = 0; i < feeData.length; i++) {
             const lineY = tableStartY - 2 + (i * 5);
             doc.line(col1Start, lineY, col4End, lineY);
           }
           
           // Draw vertical lines between columns
           doc.line(col2Start, tableStartY - 2, col2Start, tableStartY + tableHeight);
           doc.line(col3Start, tableStartY - 2, col3Start, tableStartY + tableHeight);
           doc.line(col4Start, tableStartY - 2, col4Start, tableStartY + tableHeight);
           
           feeData.forEach((row, rowIndex) => {
             const rowY = tableStartY + (rowIndex * 5);
             
             // Style the header row and total row differently
             if (rowIndex === 0 || row[0] === 'TOTAL') {
               doc.setFont('helvetica', 'bold');
               doc.setFontSize(6);
             } else {
               doc.setFont('helvetica', 'normal');
               doc.setFontSize(5);
             }
             
             // Center text in each column
             doc.text(row[0], centerX - 30, rowY, { align: 'center' });
             doc.text(row[1], centerX - 8, rowY, { align: 'center' });
             doc.text(row[2], centerX + 16, rowY, { align: 'center' });
             doc.text(row[3], centerX + 38, rowY, { align: 'center' });
           });
         }
         
         // Important notes - positioned after fee table with proper spacing
         const tableEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : (yPos + 4);
         yPos = tableEndY + 30;
         
         doc.setFontSize(6);
         doc.setFont('helvetica', 'bold');
         doc.text('IMPORTANT NOTES:', centerX - 40, yPos);
         yPos += 3;
         
         doc.setFont('helvetica', 'normal');
         doc.setFontSize(5);
         doc.text('1. Late fee Rs.500/- per term if not paid on time', centerX - 40, yPos);
         yPos += 2.5;
         doc.text('2. Electricity bill extra monthly as per room sharing', centerX - 40, yPos);
         yPos += 2.5;
         doc.text('3. Present this card at hostel entrance for verification', centerX - 40, yPos);
      };
      
      // Generate Student Copy (top half)
      generateOneCopy(margin, 'STUDENT COPY', finalPassword);
      
      // Add divider line between copies
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(margin + 5, halfPageHeight, pageWidth - margin - 5, halfPageHeight);
      
      // Generate Warden Copy (bottom half)
      generateOneCopy(halfPageHeight + 2, 'WARDEN COPY', null);
      
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
                  {students.map((student, index) => {
                    // If we came from password popup, only enable the first student
                    const isDisabled = isFromPasswordPopup && index !== 0;
                    
                    return (
                      <tr key={student._id} className={`hover:bg-gray-50 ${isDisabled ? 'opacity-50 bg-gray-100' : ''}`}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={() => handleStudentSelect(student._id)}
                          disabled={isDisabled}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                              {isFromPasswordPopup && index === 0 && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Recent
                                </span>
                              )}
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
                            disabled={isDisabled}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start"
                          >
                            <EyeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Preview</span>
                          </button>
                          <button
                            onClick={() => handleGenerateAdmitCard(student)}
                            disabled={!student.studentPhoto || generating || isDisabled}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center sm:justify-start"
                          >
                            <DocumentArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="text-xs sm:text-sm">Generate</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Original Amount</th>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">After Concession</th>
                             <th className="px-2 sm:px-3 py-1 sm:py-2 text-left">Remarks</th>
                           </tr>
                         </thead>
                         <tbody>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">First Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term1Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.student.calculatedTerm1Fee || previewModal.feeStructure?.term1Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2"></td>
                           </tr>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Second Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term2Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.student.calculatedTerm2Fee || previewModal.feeStructure?.term2Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">On or before Second MID Term exam in First Sem</td>
                           </tr>
                           <tr>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Third Term</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.feeStructure?.term3Fee || 0}</td>
                             <td className="px-2 sm:px-3 py-1 sm:py-2">Rs{previewModal.student.calculatedTerm3Fee || previewModal.feeStructure?.term3Fee || 0}</td>
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