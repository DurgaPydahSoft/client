import React from 'react';

const formatDisplayDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const PrintableStudentDates = ({ students = [], filters = {}, hostels = [] }) => {
  const activeFilters = [];
  if (filters.search) activeFilters.push(`Search: "${filters.search}"`);
  if (filters.academicYear) activeFilters.push(`Academic Year: ${filters.academicYear}`);
  if (filters.course) activeFilters.push(`Course: ${filters.course}`);
  if (filters.branch) activeFilters.push(`Branch: ${filters.branch}`);
  if (filters.hostel) {
    const hostelName = hostels.find(h => h._id === filters.hostel)?.name || filters.hostel;
    activeFilters.push(`Hostel: ${hostelName}`);
  }
  if (filters.category) activeFilters.push(`Category: ${filters.category}`);
  if (filters.roomNumber) activeFilters.push(`Room: ${filters.roomNumber}`);
  if (filters.hostelStatus) activeFilters.push(`Status: ${filters.hostelStatus}`);

  return (
    <div className="printable-dates-container" style={{ color: '#000000' }}>
      <div className="report-header" style={{ marginBottom: '20px', borderBottom: '2px solid #000000', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000000', margin: '0 0 5px 0', textAlign: 'center' }}>
          Student Admission & Stay Dates Report
        </h1>
        <div style={{ display: 'flex', justifyContent: 'between', fontSize: '12px', color: '#000000', marginTop: '10px' }}>
          <div>
            <strong>Active Filters:</strong> {activeFilters.length > 0 ? activeFilters.join(' | ') : 'All Students'}
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      <table className="dates-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#000000' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #000000' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '5%' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '30%' }}>Student Name</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '20%' }}>Roll Number</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '20%' }}>Admission No</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '13%' }}>Joining Date</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 'bold', color: '#000000', width: '12%' }}>Left Date</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => (
            <tr 
              key={student._id || index} 
              style={{ 
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#ffffff'
              }}
            >
              <td style={{ padding: '8px 10px', color: '#000000' }}>{index + 1}</td>
              <td style={{ padding: '8px 10px', fontWeight: '600', color: '#000000' }}>{student.name}</td>
              <td style={{ padding: '8px 10px', color: '#000000' }}>{student.rollNumber || '—'}</td>
              <td style={{ padding: '8px 10px', color: '#000000' }}>{student.admissionNumber || '—'}</td>
              <td style={{ padding: '8px 10px', color: '#000000', fontWeight: '500' }}>{formatDisplayDate(student.joiningDate)}</td>
              <td style={{ padding: '8px 10px', color: '#000000', fontWeight: '500' }}>{formatDisplayDate(student.leftDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PrintableStudentDates;
