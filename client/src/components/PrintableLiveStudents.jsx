import React from 'react';

const getDefaultAcademicYear = () => {
  const date = new Date();
  const currentMonth = date.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const currentYear = date.getFullYear();
  if (currentMonth >= 5) { // June or later
    return `${currentYear}-${currentYear + 1}`;
  }
  return `${currentYear - 1}-${currentYear}`;
};

const PrintableLiveStudents = ({ students = [], isLiveMode = false, academicYear = '' }) => {
  // 1. Group students for detail report: Hostel -> Category -> Room Number
  const grouped = {};
  
  // 2. Statistics for abstract page
  const hostelSummaries = {};
  let grandTotal = 0;

  students.forEach(student => {
    const hostelName = student.hostel?.name || 'Unassigned Hostel';
    const categoryName = student.hostelCategory?.name || student.category || 'Unassigned Category';
    const roomNo = student.roomNumber || 'Unassigned Room';
    const courseName = student.course || 'Unassigned Course';

    // Detail grouping
    if (!grouped[hostelName]) grouped[hostelName] = {};
    if (!grouped[hostelName][categoryName]) grouped[hostelName][categoryName] = {};
    if (!grouped[hostelName][categoryName][roomNo]) grouped[hostelName][categoryName][roomNo] = [];
    grouped[hostelName][categoryName][roomNo].push(student);

    // Summary calculations (total and category)
    if (!hostelSummaries[hostelName]) {
      hostelSummaries[hostelName] = {
        total: 0,
        categories: {}
      };
    }
    hostelSummaries[hostelName].total++;
    grandTotal++;

    if (!hostelSummaries[hostelName].categories[categoryName]) {
      hostelSummaries[hostelName].categories[categoryName] = 0;
    }
    hostelSummaries[hostelName].categories[categoryName]++;
  });

  const sortedHostels = Object.keys(grouped).sort();
  const uniqueYears = Array.from(new Set(students.map(s => s.academicYear).filter(Boolean)));
  const resolvedYear = academicYear || (uniqueYears.length === 1 ? uniqueYears[0] : (uniqueYears.length > 1 ? 'All Years' : ''));
  const displayYear = resolvedYear || getDefaultAcademicYear();

  return (
    <div>
      {/* PAGE 1: ABSTRACT & SUMMARY */}
      <div className="abstract-page page-break">
        <div className="header-container">
          <h1>{isLiveMode ? 'Live Hostel Occupancy Report' : `Hostel Occupancy Report (${displayYear})`}</h1>
          <div className="report-subtitle">
            {isLiveMode ? 'Live Overall Abstract & Summary' : 'Overall Abstract & Summary'}
          </div>
          <div className="report-date">
            Generated on: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="abstract-section">
          <div className="abstract-title">Overall Abstract</div>
          
          {/* Top overall counts in a single row */}
          <div className="summary-row">
            <span className="summary-item">
              {isLiveMode ? 'Total Active Residents' : 'Total Registered Students'}: <strong>{grandTotal}</strong>
            </span>
            {sortedHostels.map((hostelName) => (
              <span key={hostelName} className="summary-item">
                {hostelName}: <strong>{hostelSummaries[hostelName].total}</strong>
              </span>
            ))}
          </div>

          <div className="abstract-title">Breakdown by Category</div>
          <table className="summary-table">
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Hostel</th>
                <th style={{ width: '40%' }}>Category</th>
                <th style={{ width: '20%', textAlign: 'right' }}>
                  {isLiveMode ? 'Residents Count' : 'Students Count'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedHostels.flatMap((hostelName) => {
                const categories = hostelSummaries[hostelName].categories;
                const sortedCats = Object.keys(categories).sort();
                
                return sortedCats.map((catName, idx) => (
                  <tr key={`${hostelName}-${catName}`}>
                    {idx === 0 ? (
                      <td rowSpan={sortedCats.length} style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>
                        {hostelName}
                      </td>
                    ) : null}
                    <td>{catName}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{categories[catName]}</td>
                  </tr>
                ));
              })}
              <tr style={{ backgroundColor: '#ebf8ff', fontWeight: 'bold' }}>
                <td colSpan={2}>
                  {isLiveMode ? 'Grand Total Active Residents' : 'Grand Total Registered Students'}
                </td>
                <td style={{ textAlign: 'right' }}>{grandTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGE 2+: DETAIL LISTS (Grouped by Hostel -> Category -> Room) */}
      <div className="detail-pages">
        <div className="header-container">
          <h1>{isLiveMode ? 'Live Hostel Occupancy Report' : `Hostel Occupancy Report (${displayYear})`}</h1>
          <div className="report-subtitle">
            {isLiveMode ? 'Detailed Room-Wise Active List' : 'Detailed Room-Wise Student List'}
          </div>
        </div>

        {sortedHostels.map((hostelName) => {
          const categories = grouped[hostelName];
          const sortedCategories = Object.keys(categories).sort();

          return (
            <div key={hostelName} className="hostel-section">
              <div className="hostel-title">{hostelName}</div>

              {sortedCategories.map((categoryName) => {
                const rooms = categories[categoryName];
                const sortedRooms = Object.keys(rooms).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

                return (
                  <div key={categoryName} className="category-section">
                    <div className="category-title">Category: {categoryName}</div>

                    {sortedRooms.map((roomNo) => {
                      const roomStudentsList = rooms[roomNo];

                      return (
                        <div key={roomNo} className="room-section">
                          <div className="room-title">
                            Room {roomNo} ({roomStudentsList.length} {isLiveMode ? 'Residents' : 'Students'})
                          </div>
                          <table className="detail-table">
                            <thead>
                              <tr>
                                <th style={{ width: '8%' }}>#</th>
                                <th style={{ width: '30%' }}>Roll Number</th>
                                <th style={{ width: '35%' }}>Student Name</th>
                                <th style={{ width: '27%' }}>Course & Branch</th>
                              </tr>
                            </thead>
                            <tbody>
                              {roomStudentsList.map((student, index) => {
                                const courseBranch = `${student.course || ''} - ${student.branch || ''}`;
                                return (
                                  <tr key={student._id || index}>
                                    <td>{index + 1}</td>
                                    <td><strong>{student.rollNumber || 'N/A'}</strong></td>
                                    <td>{student.name}</td>
                                    <td>{courseBranch}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrintableLiveStudents;
