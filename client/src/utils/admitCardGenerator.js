import jsPDF from 'jspdf';
import 'jspdf-autotable';
import api from './axios';

// Cache for fee structures
let feeStructureCache = {};

// Fetch fee structure for a student
export const fetchFeeStructure = async (studentCourse, studentYear, studentCategory, studentAcademicYear) => {
  try {
    const cacheKey = `${studentAcademicYear}-${studentCourse}-${studentYear}-${studentCategory}`;

    // Check cache first
    if (feeStructureCache[cacheKey]) {
      console.log('Using cached fee structure for:', cacheKey);
      return feeStructureCache[cacheKey];
    }

    const response = await api.get(`/api/fee-structures/admit-card/${studentAcademicYear}/${studentCourse}/${studentYear}/${studentCategory}`);

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
    console.log('Generating PDF for student:', student);

    // Get academic year from student details (default to 2024-2025 if not available)
    const studentAcademicYear = student.academicYear || '2024-2025';

    // Fetch fee structure for the student's course, year, category and academic year
    const feeStructure = await fetchFeeStructure(student.courseId || student.course?._id, student.year, student.category || 'A', studentAcademicYear);

    // Fetch student password
    let studentPassword = null;
    if (student._id) {
      studentPassword = await fetchStudentPassword(student._id);
    }

    // For recently added students, use URL password if available
    const finalPassword = passwordFromURL || studentPassword;

    // Create A4 size document for full page with two copies
    const doc = new jsPDF('p', 'mm', 'a4');

    // Set up the page for full A4 size
    const pageWidth = doc.internal.pageSize.width; // 210mm
    const pageHeight = doc.internal.pageSize.height; // 297mm
    const halfPageHeight = pageHeight / 2; // 148.5mm
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    // Function to generate one copy of admit card
    const generateOneCopy = (startY, copyLabel, password) => {
      if (!student || typeof student !== 'object') {
        console.error('❌ Invalid student object:', student);
        throw new Error('Invalid student object provided to generateOneCopy');
      }

      // Get student gender and course for hostel name and emergency contacts
      const studentGender = student.gender?.toLowerCase();
      const studentCourse = getCourseName(student.course)?.toLowerCase();

      // Determine hostel name based on gender
      const hostelName = studentGender === 'female' ? 'Girls Hostel' : 'Boys Hostel';

      // Emergency contact numbers
      const emergencyContacts = {
        'b.tech': '+91-9490484418',
        'diploma': '+91-8688553555',
        'pharmacy': '+91-8886728886',
        'degree': '+91-9490484418',
        default: '+91-9490484418'
      };

      const wardenNumbers = {
        male: '+91-9493994233',
        female: '+91-8333068321',
        default: '+91-9493994233'
      };

      const securityNumber = '+91-8317612655';

      const aoPhone = emergencyContacts[studentCourse] || emergencyContacts.default;
      const wardenPhone = wardenNumbers[studentGender] || wardenNumbers.default;

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
        doc.addImage('/PYDAH_LOGO_PHOTO.jpg', 'JPEG', margin + 4, yPos, 22, 12);
      } catch (error) {
        console.error('Error adding logo image:', error);
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

      const centerX = pageWidth / 2;
      const photoWidth = 30;
      const photoHeight = 35;

      // QR Code section (left side)
      const qrCodeX = margin + 15;
      const qrCodeY = yPos + 2;
      const qrCodeSize = 30;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('Visit our website', qrCodeX + qrCodeSize / 2, qrCodeY - 3, { align: 'center' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.rect(qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);

      try {
        doc.addImage('/qrcode_hms.pydahsoft.in.png', 'PNG', qrCodeX, qrCodeY, qrCodeSize, qrCodeSize);
      } catch (error) {
        console.error('Error adding QR code image:', error);
        doc.setFontSize(4);
        doc.setFont('helvetica', 'bold');
        doc.text('QR CODE', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2 - 2, { align: 'center' });
        doc.text('PLACEHOLDER', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize / 2 + 2, { align: 'center' });
      }

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('www.hms.pydahsoft.in', qrCodeX + qrCodeSize / 2, qrCodeY + qrCodeSize + 4, { align: 'center' });

      // Emergency Contacts below QR code section
      const emergencyY = qrCodeY + qrCodeSize + 18;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('EMERGENCY CONTACTS:', qrCodeX, emergencyY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      doc.text(`1. Warden (${studentGender === 'female' ? 'Girls' : 'Boys'}): ${wardenPhone}`, qrCodeX, emergencyY + 5);
      doc.text(`2. AO (${getCourseName(student.course)}): ${aoPhone}`, qrCodeX, emergencyY + 10);
      doc.text(`3. Security: ${securityNumber}`, qrCodeX, emergencyY + 15);

      // Photo section (right side)
      const photoX = centerX + 35;
      const photoY = yPos + 4;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('STUDENT PHOTO', photoX + photoWidth / 2, photoY - 4, { align: 'center' });

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.rect(photoX, photoY, photoWidth, photoHeight);

      if (student.studentPhoto) {
        try {
          if (student.studentPhoto.startsWith('data:image')) {
            doc.addImage(student.studentPhoto, 'JPEG', photoX, photoY, photoWidth, photoHeight);
          } else {
            doc.setFontSize(4);
            doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
          }
        } catch (error) {
          doc.setFontSize(4);
          doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
        }
      } else {
        doc.setFontSize(4);
        doc.text('Photo', photoX + photoWidth / 2, photoY + photoHeight / 2, { align: 'center' });
      }

      // Student details section (between QR code and photo)
      const detailsX = qrCodeX + qrCodeSize + 15;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('STUDENT DETAILS', detailsX, yPos);
      yPos += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const studentDetails = [
        ['Name:', String(student.name || '')],
        ['Roll No:', String(student.rollNumber || '')],
        ['Course:', String(student.course?.name || student.course || '')],
        ['Year:', String(student.year || '')],
        ['Hostel:', String(hostelName)],
        ['Mobile No:', String(student.studentPhone || '')],
        ['Parent No:', String(student.parentPhone || '')],
        ['Address:', String(student.address || '')],
        ['Hostel ID:', String(student.hostelId || '')],
        ['Category:', String(student.category || '')],
        ['Room:', String(student.roomNumber || '')]
      ];

      if (copyLabel === 'STUDENT COPY') {
        const finalPwd = passwordFromURL || password;
        if (finalPwd) {
          studentDetails.push(['Password:', String(finalPwd)]);
        }
      }

      studentDetails.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, detailsX, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '', detailsX + 25, yPos);
        yPos += 3.5;
      });

      // Fee terms table
      yPos = startY + 75;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('FEE STRUCTURE', centerX - 35, yPos);
      yPos += 3;

      const actualFeeStructure = feeStructure?.data || feeStructure;

      const feeData = [
        ['Term', 'Original Amount', 'After Concession', 'Remarks'],
        ['1st Term', `Rs : ${actualFeeStructure?.term1Fee || 0}`, `Rs : ${student.calculatedTerm1Fee || actualFeeStructure?.term1Fee || 0}`, ''],
        ['2nd Term', `Rs : ${actualFeeStructure?.term2Fee || 0}`, `Rs : ${student.calculatedTerm2Fee || actualFeeStructure?.term2Fee || 0}`, 'Before 2nd MID Term'],
        ['3rd Term', `Rs : ${actualFeeStructure?.term3Fee || 0}`, `Rs : ${student.calculatedTerm3Fee || actualFeeStructure?.term3Fee || 0}`, 'Before 2nd Sem Start']
      ];

      const totalOriginalFee = (actualFeeStructure?.term1Fee || 0) + (actualFeeStructure?.term2Fee || 0) + (actualFeeStructure?.term3Fee || 0);
      const totalAfterConcession = (student.calculatedTerm1Fee || actualFeeStructure?.term1Fee || 0) +
        (student.calculatedTerm2Fee || actualFeeStructure?.term2Fee || 0) +
        (student.calculatedTerm3Fee || actualFeeStructure?.term3Fee || 0);

      feeData.push(['TOTAL', `Rs : ${totalOriginalFee.toLocaleString()}`, `Rs : ${totalAfterConcession.toLocaleString()}`, '']);

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
              0: { cellWidth: 20, fontSize: 6, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
              1: { cellWidth: 24, fontSize: 6, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
              2: { cellWidth: 24, fontSize: 6, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' },
              3: { cellWidth: 20, fontSize: 4, lineColor: [0, 0, 0], lineWidth: 0.2, halign: 'center' }
            },
            margin: { left: centerX - 35 },
            tableWidth: 'auto',
            showFoot: 'lastPage'
          });
        } catch (autoTableError) {
          console.error('❌ autoTable error:', autoTableError);
          renderManualTable(doc, feeData, yPos, centerX);
        }
      } else {
        renderManualTable(doc, feeData, yPos, centerX);
      }

      // Important notes
      const tableEndY = doc.lastAutoTable ? doc.lastAutoTable.finalY : (yPos + 4);
      yPos = tableEndY + 30;

      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPORTANT NOTES:', centerX - 35, yPos);
      yPos += 3;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5);
      doc.text('1. Late fee Rs.500/- per term if not paid on time', centerX - 35, yPos);
      yPos += 2.5;
      doc.text('2. Electricity bill extra monthly as per room sharing', centerX - 35, yPos);
      yPos += 2.5;
      doc.text('3. Present this card at hostel entrance for verification', centerX - 35, yPos);
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
    doc.save(fileName);

    console.log('PDF generated successfully');
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
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

