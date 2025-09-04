import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ReceiptGenerator = {
  generateReceipt: (payment, user = null) => {
    try {
      const doc = new jsPDF();
      
      // Set page margins and dimensions
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      // Add header with better styling
      doc.setFontSize(24);
      doc.setTextColor(30, 64, 175); // Blue-900
      doc.setFont(undefined, 'bold');
      doc.text('PAYMENT RECEIPT', pageWidth / 2, 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.text('PYDAH SOFT HOSTEL MANAGEMENT SYSTEM', pageWidth / 2, 45, { align: 'center' });
      
      // Add decorative line
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.line(margin, 55, pageWidth - margin, 55);
      
      let currentY = 70;
      
      // Receipt details
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Receipt Details', margin, currentY);
      currentY += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Receipt number
      const receiptNumber = payment.receiptNumber || payment._id?.toString().slice(-8) || 'N/A';
      doc.text(`Receipt No: ${receiptNumber}`, margin, currentY);
      currentY += 10;
      
      // Transaction ID
      const transactionId = payment.transactionId || payment.cashfreeOrderId || payment._id?.toString().slice(-8) || 'N/A';
      doc.text(`Transaction ID: ${transactionId}`, margin, currentY);
      currentY += 10;
      
      // Fix date formatting
      const paymentDate = payment.paymentDate || payment.createdAt;
      const formattedDate = paymentDate ? new Date(paymentDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'N/A';
      doc.text(`Date: ${formattedDate}`, margin, currentY);
      currentY += 10;
      
      // Payment type
      const paymentTypeText = payment.paymentType === 'electricity' ? 'Electricity Bill' : 'Hostel Fee';
      doc.text(`Payment Type: ${paymentTypeText}`, margin, currentY);
      currentY += 15;
      
      // Student details
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Student Details', margin, currentY);
      currentY += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Student name
      const studentName = payment.studentName || user?.name || user?.fullName || 'N/A';
      doc.text(`Name: ${studentName}`, margin, currentY);
      currentY += 10;
      
      // Roll number
      const rollNumber = payment.studentRollNumber || user?.rollNumber || user?.rollNo || user?.studentId || 'N/A';
      doc.text(`Roll Number: ${rollNumber}`, margin, currentY);
      currentY += 10;
      
      // Room number
      const roomNumber = user?.roomNumber || payment.roomId?.roomNumber || 'N/A';
      doc.text(`Room Number: ${roomNumber}`, margin, currentY);
      currentY += 10;
      
      // Academic year
      const academicYear = payment.academicYear || user?.academicYear || 'N/A';
      doc.text(`Academic Year: ${academicYear}`, margin, currentY);
      currentY += 10;
      
      // Category
      const category = payment.category || user?.category || 'N/A';
      doc.text(`Category: ${category}`, margin, currentY);
      currentY += 15;
      
      // Payment details
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Payment Details', margin, currentY);
      currentY += 15;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Amount
      const amount = payment.amount || 0;
      doc.text(`Amount: ₹${amount.toLocaleString('en-IN')}`, margin, currentY);
      currentY += 10;
      
      // Show term for hostel fee or bill month for electricity
      if (payment.paymentType === 'electricity') {
        const billMonth = payment.billMonth || 'N/A';
        doc.text(`Bill Month: ${billMonth}`, margin, currentY);
      } else {
        const term = payment.term || 'N/A';
        doc.text(`Term: ${term}`, margin, currentY);
      }
      currentY += 10;
      
      // Payment method
      const paymentMethod = payment.paymentMethod || 'Cash';
      doc.text(`Payment Method: ${paymentMethod}`, margin, currentY);
      currentY += 10;
      
      // UTR number for online payments
      if (paymentMethod === 'Online' && payment.utrNumber) {
        doc.text(`UTR Number: ${payment.utrNumber}`, margin, currentY);
        currentY += 10;
      }
      
      // Status
      const status = payment.status?.toUpperCase() || 'SUCCESS';
      doc.text(`Status: ${status}`, margin, currentY);
      currentY += 10;
      
      // Collected by
      const collectedBy = payment.collectedByName || 'Admin';
      doc.text(`Collected By: ${collectedBy}`, margin, currentY);
      currentY += 15;
      
      // Add bill details for electricity payments
      if (payment.paymentType === 'electricity') {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Bill Details', margin, currentY);
        currentY += 15;
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        // Handle consumption from different possible fields
        const consumption = payment.consumption || payment.billDetails?.consumption;
        if (consumption !== undefined && consumption !== null) {
          doc.text(`Consumption: ${consumption} units`, margin, currentY);
          currentY += 10;
        }
        
        // Handle rate
        const rate = payment.billDetails?.rate;
        if (rate !== undefined && rate !== null) {
          doc.text(`Rate: ₹${rate} per unit`, margin, currentY);
          currentY += 10;
        }
        
        // Handle total bill
        const totalBill = payment.billDetails?.total;
        if (totalBill !== undefined && totalBill !== null) {
          doc.text(`Total Room Bill: ₹${totalBill.toLocaleString('en-IN')}`, margin, currentY);
          currentY += 10;
        }
        
        // Show student's share
        doc.text(`Your Share: ₹${amount.toLocaleString('en-IN')}`, margin, currentY);
        currentY += 15;
      }
      
      if (payment.notes) {
        doc.text(`Notes: ${payment.notes}`, margin, currentY);
        currentY += 15;
      }
      
      // Add border around the entire receipt
      doc.setDrawColor(209, 213, 219);
      doc.setLineWidth(0.5);
      doc.rect(margin - 5, margin - 5, pageWidth - (2 * margin) + 10, pageHeight - (2 * margin) + 10);
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text('This is a computer generated receipt and does not require a signature.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      
      // Save the PDF with unified naming
      const fileName = `payment_receipt_${payment.receiptNumber || payment._id || Date.now()}.pdf`;
      doc.save(fileName);
      
      return true;
    } catch (error) {
      console.error('Error generating receipt:', error);
      return false;
    }
  }
};

export default ReceiptGenerator;
