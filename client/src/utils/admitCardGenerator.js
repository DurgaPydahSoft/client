import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from './axios';

// Cache for fee structures
let feeStructureCache = {};

// Fetch fee structure for a student (SQL course/branch)
export const fetchFeeStructure = async (studentCourse, studentBranch, studentYear, studentCategory, studentAcademicYear) => {
  try {
    const cacheKey = `${studentAcademicYear}-${studentCourse}-${studentBranch}-${studentYear}-${studentCategory}`;

    // Check cache first
    if (feeStructureCache[cacheKey]) {
      console.log('Using cached fee structure for:', cacheKey);
      return feeStructureCache[cacheKey];
    }

    const response = await api.get(`/api/fee-structures/admit-card/${studentAcademicYear}/${studentCourse}/${encodeURIComponent(studentBranch)}/${studentYear}/${studentCategory}`);

    if (response.data.success) {
      const feeStructure = response.data.data;

      // Cache the result
      feeStructureCache[cacheKey] = feeStructure;

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

// Function to fetch password for a specific student
export const fetchStudentPassword = async (studentId) => {
  try {
    console.log('🔍 Fetching password for student ID:', studentId);
    const tempResponse = await api.get(`/api/admin/students/${studentId}/temp-password`);

    if (tempResponse.data.success && tempResponse.data.data.password) {
      console.log('🔍 Password found');
      return tempResponse.data.data.password;
    }
    console.log('❌ No password found in response');
    return null;
  } catch (error) {
    console.error('❌ Error fetching student password:', error);
    return null;
  }
};

// Helper function to get course name
const getCourseName = (course) => {
  if (!course) return 'Unknown';
  if (typeof course === 'string') return course;
  return course.name || course;
};

// Generate PDF for individual admit card with student and warden copies
export const generateAdmitCardPDF = async (student, passwordFromURL = null) => {
  try {
    const studentId = student._id || student.id || student;
    console.log('Requesting Admit Card from Print API for student ID:', studentId);
    
    const response = await api.post('/api/print', {
      template: 'hostel-admit',
      data: {
        studentId
      }
    }, {
      responseType: 'blob'
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '800px';
    iframe.style.height = '600px';
    iframe.style.border = '0';
    iframe.src = url;
    document.body.appendChild(iframe);
    
    let printTriggered = false;
    const triggerPrint = () => {
      if (printTriggered) return;
      printTriggered = true;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Error invoking print inside iframe:', err);
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch (e) {}
        window.URL.revokeObjectURL(url);
      }, 60000);
    };

    iframe.onload = () => {
      setTimeout(triggerPrint, 500);
    };
    
    // Fallback if onload doesn't fire
    setTimeout(triggerPrint, 1500);
    return true;
  } catch (error) {
    console.error('Error generating PDF from Print API:', error);
    throw error;
  }
};

// Manual table rendering fallback
const renderManualTable = (doc, feeData, yPos, centerX) => {
  doc.setFontSize(5);
  const tableStartY = yPos + 4;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);

  const col1Start = centerX - 35;
  const col4End = centerX + 48;
  const tableWidth = col4End - col1Start;
  const tableHeight = feeData.length * 5;

  doc.rect(col1Start, tableStartY - 2, tableWidth, tableHeight + 2);

  for (let i = 0; i < feeData.length; i++) {
    const lineY = tableStartY - 2 + (i * 5);
    doc.line(col1Start, lineY, col4End, lineY);
  }

  const col2Start = centerX - 20;
  const col3Start = centerX + 4;
  const col4Start = centerX + 28;

  doc.line(col2Start, tableStartY - 2, col2Start, tableStartY + tableHeight);
  doc.line(col3Start, tableStartY - 2, col3Start, tableStartY + tableHeight);
  doc.line(col4Start, tableStartY - 2, col4Start, tableStartY + tableHeight);

  feeData.forEach((row, rowIndex) => {
    const rowY = tableStartY + (rowIndex * 5);

    if (rowIndex === 0 || row[0] === 'TOTAL') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
    }

    doc.text(row[0], centerX - 30, rowY, { align: 'center' });
    doc.text(row[1], centerX - 8, rowY, { align: 'center' });
    doc.text(row[2], centerX + 16, rowY, { align: 'center' });
    doc.text(row[3], centerX + 38, rowY, { align: 'center' });
  });
};

// Fetch student data for admit card (from API)
export const fetchStudentAdmitCardData = async (studentId) => {
  try {
    const response = await api.post(`/api/admin/students/${studentId}/admit-card`);
    if (response.data.success) {
      return response.data.data.student;
    }
    return null;
  } catch (error) {
    console.error('Error fetching student admit card data:', error);
    throw error;
  }
};

// Main function to download admit card for a student
export const downloadAdmitCard = async (student) => {
  try {
    // Fetch full student data for admit card
    const studentData = await fetchStudentAdmitCardData(student._id);
    if (!studentData) {
      throw new Error('Failed to fetch student data');
    }

    // Generate the PDF
    await generateAdmitCardPDF(studentData);
    return true;
  } catch (error) {
    console.error('Error downloading admit card:', error);
    throw error;
  }
};

