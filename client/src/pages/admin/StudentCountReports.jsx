import React, { useState, useEffect, useMemo } from 'react';
import api from '../../utils/axios';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from '../../components/LoadingSpinner';
import SEO from '../../components/SEO';
import {
  PrinterIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';

const getDefaultAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
};

const generateAcademicYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = -3; i <= 3; i++) {
    const year = currentYear + i;
    years.push(`${year}-${year + 1}`);
  }
  return years;
};

const StudentCountReports = () => {
  const { user } = useAuth();
  const isPrincipal = user?.role === 'principal';

  // Theme configuration based on role
  const theme = {
    primaryBg: isPrincipal ? 'from-purple-600 to-purple-800' : 'from-deepsea-600 to-deepsea-800',
    primaryText: isPrincipal ? 'text-purple-700' : 'text-deepsea-700',
    accentText: isPrincipal ? 'text-purple-600 hover:text-purple-700' : 'text-deepsea-600 hover:text-deepsea-700',
    lightBg: isPrincipal ? 'bg-purple-50' : 'bg-deepsea-5',
    borderColor: isPrincipal ? 'border-purple-100' : 'border-deepsea-100',
    ringColor: isPrincipal ? 'focus:ring-purple-500' : 'focus:ring-deepsea-500',
    badgeColor: isPrincipal ? 'bg-purple-100 text-purple-800' : 'bg-deepsea-100 text-deepsea-800',
    buttonBg: isPrincipal ? 'bg-purple-600 hover:bg-purple-700' : 'bg-deepsea-600 hover:bg-deepsea-700',
    cardBorder: isPrincipal ? 'border-purple-500' : 'border-deepsea-500',
    hoverBg: isPrincipal ? 'hover:bg-purple-50/50' : 'hover:bg-deepsea-50/50',
    subtableBg: isPrincipal ? 'bg-purple-50/20' : 'bg-deepsea-50/10'
  };

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [overallCount, setOverallCount] = useState(0);
  
  // Export choices modal states
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState('pdf'); // 'pdf' | 'excel'
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [stats, setStats] = useState({
    collegesCount: 0,
    coursesCount: 0,
    hostelsCount: 0
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState({});
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [academicYear, setAcademicYear] = useState(getDefaultAcademicYear());

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (isLiveMode) {
        params.hostelStatus = 'Active';
      } else {
        if (academicYear) {
          params.academicYear = academicYear;
        }
      }

      const res = await api.get('/api/students/reports/count-summary', { params });
      if (res.data?.success) {
        const reportData = res.data.data;
        setData(reportData);
        setOverallCount(res.data.overallCount);

        // Derive summary statistics
        const colleges = reportData.length;
        const uniqueCourses = new Set();
        const uniqueHostels = new Set();

        reportData.forEach(college => {
          college.courses.forEach(course => {
            uniqueCourses.add(course.name);
            course.hostels.forEach(hostel => {
              uniqueHostels.add(hostel.name);
            });
          });
        });

        setStats({
          collegesCount: colleges,
          coursesCount: uniqueCourses.size,
          hostelsCount: uniqueHostels.size
        });
      } else {
        toast.error('Failed to load reports data');
      }
    } catch (error) {
      console.error('Error loading reports data:', error);
      toast.error('Error fetching reports data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [isLiveMode, academicYear]);

  // Group categories under their respective hostels dynamically
  const hostelGroups = useMemo(() => {
    const groups = {};
    data.forEach(college => {
      college.courses.forEach(course => {
        course.hostels.forEach(hostel => {
          if (!groups[hostel.name]) {
            groups[hostel.name] = new Set();
          }
          hostel.categories.forEach(category => {
            groups[hostel.name].add(category.name);
          });
        });
      });
    });

    const sortedGroups = [];
    Object.keys(groups).sort().forEach(hostelName => {
      const categories = Array.from(groups[hostelName]).sort();
      sortedGroups.push({
        hostelName,
        categories: categories.map(catName => ({
          categoryName: catName,
          key: `${hostelName} - ${catName}`
        }))
      });
    });
    return sortedGroups;
  }, [data]);

  // Flattened columns array for cell counts lookup compatibility
  const columns = useMemo(() => {
    const cols = [];
    hostelGroups.forEach(group => {
      group.categories.forEach(cat => {
        cols.push({
          hostelName: group.hostelName,
          categoryName: cat.categoryName,
          key: cat.key
        });
      });
    });
    return cols;
  }, [hostelGroups]);

  // Helper to get count for a specific college, hostel, and category
  const getCollegeColumnCount = (college, hostelName, categoryName) => {
    let count = 0;
    college.courses.forEach(course => {
      course.hostels.forEach(hostel => {
        if (hostel.name === hostelName) {
          hostel.categories.forEach(category => {
            if (category.name === categoryName) {
              count += category.count;
            }
          });
        }
      });
    });
    return count;
  };

  // Helper to get count for a specific course, hostel, and category
  const getCourseColumnCount = (course, hostelName, categoryName) => {
    let count = 0;
    course.hostels.forEach(hostel => {
      if (hostel.name === hostelName) {
        hostel.categories.forEach(category => {
          if (category.name === categoryName) {
            count += category.count;
          }
        });
      }
    });
    return count;
  };

  // Helper to get count for a specific year under a course, hostel, and category
  const getYearColumnCount = (course, yearName, hostelName, categoryName) => {
    let count = 0;
    course.hostels.forEach(hostel => {
      if (hostel.name === hostelName) {
        hostel.categories.forEach(category => {
          if (category.name === categoryName) {
            category.years.forEach(yr => {
              if (yr.year === yearName) {
                count += yr.count;
              }
            });
          }
        });
      }
    });
    return count;
  };

  // Helper to get all unique years under a course
  const getCourseYears = (course) => {
    const yearsSet = new Set();
    course.hostels.forEach(hostel => {
      hostel.categories.forEach(category => {
        category.years.forEach(yr => {
          yearsSet.add(yr.year);
        });
      });
    });
    return Array.from(yearsSet).sort();
  };

  // Helper to get overall year count under a course
  const getYearTotalCount = (course, yearName) => {
    let total = 0;
    course.hostels.forEach(hostel => {
      hostel.categories.forEach(category => {
        category.years.forEach(yr => {
          if (yr.year === yearName) {
            total += yr.count;
          }
        });
      });
    });
    return total;
  };

  const toggleRow = (path) => {
    setExpandedRows(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const expandAll = () => {
    const newExpanded = {};
    data.forEach(college => {
      newExpanded[college.name] = true;
      college.courses.forEach(course => {
        const coursePath = `${college.name}|${course.name}`;
        newExpanded[coursePath] = true;
      });
    });
    setExpandedRows(newExpanded);
    toast.success('All sections expanded');
  };

  const collapseAll = () => {
    setExpandedRows({});
    toast.success('All sections collapsed');
  };

  const handlePrint = async (incSummary, incDetails) => {
    const loadingToast = toast.loading('Preparing printable report...');
    try {
      const params = new URLSearchParams();
      params.append('limit', '1000000');
      params.append('skipFeesAndConcessions', 'true');
      if (isLiveMode) {
        params.append('hostelStatus', 'Active');
      } else {
        if (academicYear) params.append('academicYear', academicYear);
      }
      const res = await api.get(`/api/admin/students?${params.toString()}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch students');
      }

      const allActiveStudents = res.data.data.students || [];
      if (allActiveStudents.length === 0) {
        toast.error('No students found', { id: loadingToast });
        return;
      }

      console.log('Requesting Live Occupancy HTML from Print API...');
      const printResponse = await api.post('/api/print', {
        template: 'live-occupancy-report',
        data: {
          students: allActiveStudents,
          filters: { academicYear },
          isLiveMode,
          includeSummary: incSummary,
          includeDetails: incDetails
        }
      });

      const iframe = document.getElementById('print-iframe');
      if (!iframe) {
        toast.error('Failed to locate print frame', { id: loadingToast });
        return;
      }

      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(printResponse.data);
      iframeDoc.close();

      toast.dismiss(loadingToast);

      // Trigger print dialog on the iframe contentWindow
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }, 150);
    } catch (err) {
      console.error('Error printing PDF:', err);
      toast.error(err.message || 'Error printing PDF', { id: loadingToast });
    }
  };

  // Function to handle downloading live student list as Excel grouped/styled
  const handleDownloadExcelReport = async (incSummary, incDetails) => {
    const loadingToast = toast.loading('Preparing Excel report...');
    try {
      const params = new URLSearchParams();
      params.append('limit', '1000000');
      params.append('skipFeesAndConcessions', 'true');
      if (isLiveMode) {
        params.append('hostelStatus', 'Active');
      } else {
        if (academicYear) params.append('academicYear', academicYear);
      }
      const res = await api.get(`/api/admin/students?${params.toString()}`);
      if (!res.data.success) {
        throw new Error(res.data.message || 'Failed to fetch students');
      }

      const students = res.data.data.students || [];
      if (students.length === 0) {
        toast.error('No students found', { id: loadingToast });
        return;
      }

      // Grouping data (Hostel -> Category -> Room Number)
      const grouped = {};
      const hostelSummaries = {};
      let grandTotal = 0;

      students.forEach(student => {
        const hostelName = student.hostel?.name || 'Unassigned Hostel';
        const categoryName = student.hostelCategory?.name || student.category || 'Unassigned Category';
        const roomNo = student.roomNumber || 'Unassigned Room';

        if (!grouped[hostelName]) grouped[hostelName] = {};
        if (!grouped[hostelName][categoryName]) grouped[hostelName][categoryName] = {};
        if (!grouped[hostelName][categoryName][roomNo]) grouped[hostelName][categoryName][roomNo] = [];
        grouped[hostelName][categoryName][roomNo].push(student);

        if (!hostelSummaries[hostelName]) {
          hostelSummaries[hostelName] = { total: 0, categories: {} };
        }
        hostelSummaries[hostelName].total++;
        grandTotal++;

        if (!hostelSummaries[hostelName].categories[categoryName]) {
          hostelSummaries[hostelName].categories[categoryName] = 0;
        }
        hostelSummaries[hostelName].categories[categoryName]++;
      });

      const workbook = XLSX.utils.book_new();

      if (incSummary) {
        // --- SHEET 1: Summary Pivot Matrix ---
        const summaryRows = [];
        summaryRows.push([isLiveMode ? 'Hostel Occupancy Pivot Matrix Summary (Live)' : `Hostel Occupancy Pivot Matrix Summary (AY ${academicYear || 'All'})`]);
        summaryRows.push([]);

        // Build categories header row: 'Institution / Course / Year', col1, col2, ..., 'Total Count'
        const excelHeaders = ['Institution / Course / Year'];
        columns.forEach(col => {
          excelHeaders.push(`${col.hostelName} - ${col.categoryName}`);
        });
        excelHeaders.push('Total Count');
        summaryRows.push(excelHeaders);

        // Build data rows for colleges and courses
        filteredData.forEach(college => {
          // College Row
          const collegeRow = [college.name];
          columns.forEach(col => {
            const val = getCollegeColumnCount(college, col.hostelName, col.categoryName);
            collegeRow.push(val === 0 ? '-' : val);
          });
          collegeRow.push(college.count);
          summaryRows.push(collegeRow);

          // Course Rows
          college.courses.forEach(course => {
            const courseRow = [`   ↳ ${course.name}`];
            columns.forEach(col => {
              const val = getCourseColumnCount(course, col.hostelName, col.categoryName);
              courseRow.push(val === 0 ? '-' : val);
            });
            courseRow.push(course.count);
            summaryRows.push(courseRow);
          });
        });

        // Grand Total Row
        const grandTotalRow = ['Total'];
        let overallSum = 0;
        columns.forEach(col => {
          let colSum = 0;
          filteredData.forEach(college => {
            colSum += getCollegeColumnCount(college, col.hostelName, col.categoryName);
          });
          grandTotalRow.push(colSum === 0 ? '-' : colSum);
          overallSum += colSum;
        });
        grandTotalRow.push(overallSum);
        summaryRows.push(grandTotalRow);

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
        
        // Auto-fit summary sheet cols
        const summaryCols = [{ width: 45 }]; // first column wide
        columns.forEach(() => {
          summaryCols.push({ width: 18 });
        });
        summaryCols.push({ width: 15 });
        summarySheet['!cols'] = summaryCols;

        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Abstract & Summary');
      }

      if (incDetails) {
        // --- SHEET 2: Detailed Room-Wise ---
        const detailedRows = [];
        detailedRows.push(['Detailed Room-Wise Student List']);
        detailedRows.push([]);
        detailedRows.push([
          'S.No',
          'Roll Number',
          'Name',
          'Hostel',
          'Category',
          'Room Number',
          'Course',
          'Branch',
          'Academic Year',
          'Student Mobile',
          'Parent Mobile'
        ]);

        let serialNo = 1;
        Object.keys(grouped).sort().forEach(hostelName => {
          Object.keys(grouped[hostelName]).sort().forEach(categoryName => {
            Object.keys(grouped[hostelName][categoryName]).sort((a, b) => parseInt(a) - parseInt(b)).forEach(roomNo => {
              grouped[hostelName][categoryName][roomNo].forEach(student => {
                detailedRows.push([
                  serialNo++,
                  student.rollNumber || 'N/A',
                  student.name || 'N/A',
                  hostelName,
                  categoryName,
                  roomNo,
                  student.course || 'N/A',
                  student.branch || 'N/A',
                  student.academicYear || 'N/A',
                  student.studentPhone || 'N/A',
                  student.parentPhone || 'N/A'
                ]);
              });
            });
          });
        });

        const detailedSheet = XLSX.utils.aoa_to_sheet(detailedRows);
        const detailedCols = [
          { width: 8 }, { width: 18 }, { width: 30 }, { width: 18 }, 
          { width: 15 }, { width: 12 }, { width: 15 }, { width: 15 }, 
          { width: 15 }, { width: 16 }, { width: 16 }
        ];
        detailedSheet['!cols'] = detailedCols;

        XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed List');
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `Hostel_Occupancy_Report_${timestamp}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success('Excel report downloaded successfully', { id: loadingToast });
    } catch (err) {
      console.error('Error exporting Excel:', err);
      toast.error(err.message || 'Error exporting Excel', { id: loadingToast });
    }
  };

  const handleConfirmExport = () => {
    setIsExportModalOpen(false);
    if (exportType === 'pdf') {
      handlePrint(includeSummary, includeDetails);
    } else {
      handleDownloadExcelReport(includeSummary, includeDetails);
    }
  };



  // Filter hierarchical data by search query
  const filteredData = data.filter(college => {
    if (!searchQuery) return true;
    
    // Check if college matches
    const collMatch = college.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (collMatch) return true;

    // Check if course matches
    const courseMatch = college.courses.some(course => 
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (courseMatch) return true;

    // Check if hostel matches
    const hostelMatch = college.courses.some(course =>
      course.hostels.some(hostel =>
        hostel.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    return hostelMatch;
  });

  return (
    <div className="space-y-6">
      <SEO 
        title="Student Density Reports" 
        description="Comprehensive summary report of student density, college-wise, course-wise, hostel-wise, category-wise, and year-wise."
      />

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-md border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 font-display">Student Density Summary</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Hierarchical breakdown of student count distributions.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={fetchReportData}
            className={`p-2 bg-gray-55 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-600 transition-colors flex items-center gap-1.5 text-sm font-medium ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={expandAll}
            className="px-3 py-2 bg-gray-55 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors text-sm font-medium"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 bg-gray-55 hover:bg-gray-100 border border-gray-200 rounded-lg text-gray-700 transition-colors text-sm font-medium"
          >
            Collapse All
          </button>
          <button
            onClick={() => {
              setExportType('pdf');
              setIncludeSummary(true);
              setIncludeDetails(true);
              setIsExportModalOpen(true);
            }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow hover:shadow-md transition-all flex items-center gap-1.5 text-sm font-medium w-full sm:w-auto justify-center"
          >
            <PrinterIcon className="w-4 h-4" />
            Print PDF
          </button>
          <button
            onClick={() => {
              setExportType('excel');
              setIncludeSummary(true);
              setIncludeDetails(true);
              setIsExportModalOpen(true);
            }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-705 text-white rounded-lg shadow hover:shadow-md transition-all flex items-center gap-1.5 text-sm font-medium w-full sm:w-auto justify-center"
          >
            <DocumentArrowDownIcon className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall card */}
        <div className={`bg-white rounded-xl shadow-md border-l-4 ${theme.cardBorder} p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg`}>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Students</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : overallCount}</div>
          </div>
          <div className={`p-3 rounded-lg ${theme.lightBg} ${theme.primaryText}`}>
            <UserGroupIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Colleges card */}
        <div className="bg-white rounded-xl shadow-md border-l-4 border-emerald-500 p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Colleges</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.collegesCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Courses card */}
        <div className="bg-white rounded-xl shadow-md border-l-4 border-amber-500 p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Courses</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.coursesCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <AcademicCapIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Hostels card */}
        <div className="bg-white rounded-xl shadow-md border-l-4 border-rose-500 p-4 flex items-center justify-between transition-all duration-300 hover:shadow-lg">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Hostels</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{loading ? '...' : stats.hostelsCount}</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        {/* Search filter and controls */}
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <MagnifyingGlassIcon className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by college, course, or hostel..."
              className={`w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none transition-all ${theme.ringColor} focus:ring-2 focus:bg-white`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Live / AY-Wise Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-0.5 border border-gray-200 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setIsLiveMode(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  !isLiveMode
                    ? 'bg-white text-blue-650 shadow-sm'
                    : 'text-gray-650 hover:text-gray-900'
                }`}
              >
                AY-Wise
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLiveMode(true);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  isLiveMode
                    ? 'bg-white text-blue-650 shadow-sm'
                    : 'text-gray-650 hover:text-gray-900'
                }`}
              >
                Live
              </button>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="reports-academic-year" className="text-xs sm:text-sm text-gray-600 whitespace-nowrap font-medium">
                Academic Year
              </label>
              <select
                id="reports-academic-year"
                disabled={isLiveMode}
                value={isLiveMode ? "" : academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="min-w-[140px] px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed outline-none"
              >
                <option value="">All Years</option>
                {generateAcademicYears().map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <LoadingSpinner />
            <span className="text-sm text-gray-500">Compiling hierarchical density summary...</span>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-gray-400 text-lg mb-2">No Reports Found</div>
            <p className="text-gray-500 text-sm">No matches found for your filter criteria.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto p-4 ${isPrincipal ? 'bg-purple-50/10' : 'bg-deepsea-50/5'}`}>
            <table className={`w-full border-collapse rounded-xl overflow-hidden border ${isPrincipal ? 'border-purple-200' : 'border-deepsea-200'} bg-white shadow-md`}>
              <thead>
                <tr className={`${isPrincipal ? 'bg-purple-900 text-white border-b border-purple-800' : 'bg-deepsea-900 text-white border-b border-deepsea-800'} text-xs font-bold uppercase tracking-wider`}>
                  <th 
                    rowSpan={2} 
                    className={`py-3.5 px-4 text-left sticky left-0 z-20 ${isPrincipal ? 'bg-purple-900 border-purple-850' : 'bg-deepsea-900 border-deepsea-850'} border-r border-b shadow-[2px_0_5px_0_rgba(0,0,0,0.15)] min-w-[240px] sm:min-w-[320px]`}
                  >
                    Institution / Course / Year
                  </th>
                  {hostelGroups.map(group => (
                    <th 
                      key={group.hostelName} 
                      colSpan={group.categories.length} 
                      className={`py-2.5 px-4 text-center font-bold text-xs border-r border-b ${isPrincipal ? 'border-purple-800' : 'border-deepsea-800'} last:border-r-0`}
                    >
                      🏢 {group.hostelName}
                    </th>
                  ))}
                  <th 
                    rowSpan={2} 
                    className={`py-3.5 px-4 text-right pr-6 w-[120px] font-bold text-xs tracking-wider border-b ${isPrincipal ? 'border-purple-850' : 'border-deepsea-850'}`}
                  >
                    Total Count
                  </th>
                </tr>
                <tr className={`${isPrincipal ? 'bg-purple-850 text-white' : 'bg-deepsea-800 text-white'} text-[10px] font-bold uppercase tracking-wider`}>
                  {hostelGroups.map(group => (
                    group.categories.map(cat => (
                      <th 
                        key={cat.key} 
                        className={`py-2 px-2 text-center border-r border-b ${isPrincipal ? 'border-purple-800/80 border-b-purple-800/80' : 'border-deepsea-800/80 border-b-deepsea-800/80'} last:border-r-0 min-w-[120px]`}
                      >
                        {cat.categoryName}
                      </th>
                    ))
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredData.map((college) => {
                  const isCollExpanded = expandedRows[college.name];
                  
                  return (
                    <React.Fragment key={college.name}>
                      {/* LEVEL 1: College Row */}
                      <tr 
                        onClick={() => toggleRow(college.name)}
                        className="group bg-slate-50/70 hover:bg-slate-100/90 transition-colors cursor-pointer border-b border-gray-200"
                      >
                        <td className="py-4 px-4 sticky left-0 z-10 bg-slate-50 group-hover:bg-slate-100 transition-colors border-r border-slate-200 shadow-[2px_0_5px_0_rgba(0,0,0,0.03)]">
                          <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                            <span className="text-gray-400">
                              {isCollExpanded ? <ChevronDownIcon className="w-4 h-4 text-gray-700" /> : <ChevronRightIcon className="w-4 h-4 text-gray-700" />}
                            </span>
                            <span>🏛️ {college.name}</span>
                          </div>
                        </td>
                        {columns.map(col => {
                          const val = getCollegeColumnCount(college, col.hostelName, col.categoryName);
                          return (
                            <td key={col.key} className="py-4 px-4 text-center text-xs font-bold text-slate-800 border-r border-gray-150/40 last:border-r-0">
                              {val === 0 ? <span className="text-gray-300">-</span> : val}
                            </td>
                          );
                        })}
                        <td className="py-4 px-4 text-right pr-6 font-extrabold text-sm bg-slate-50/40 group-hover:bg-slate-100/30 transition-colors">
                          <span className={`px-2.5 py-0.5 rounded-full ${theme.badgeColor} border border-gray-200/50 shadow-sm font-extrabold`}>
                            {college.count}
                          </span>
                        </td>
                      </tr>

                      {/* LEVEL 2: Course Row */}
                      {isCollExpanded && college.courses.map((course) => {
                        const coursePath = `${college.name}|${course.name}`;
                        const isCourseExpanded = expandedRows[coursePath];
                        
                        return (
                          <React.Fragment key={coursePath}>
                            <tr 
                              onClick={() => toggleRow(coursePath)}
                              className="group bg-white hover:bg-slate-50 transition-colors cursor-pointer border-b border-gray-150"
                            >
                              <td className="py-3 px-4 sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors border-r border-gray-200 shadow-[2px_0_5px_0_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-2 pl-6 font-semibold text-xs text-gray-800">
                                  <span className="text-gray-400">
                                    {isCourseExpanded ? <ChevronDownIcon className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRightIcon className="w-3.5 h-3.5 text-gray-500" />}
                                  </span>
                                  <span>🎓 {course.name}</span>
                                </div>
                              </td>
                              {columns.map(col => {
                                const val = getCourseColumnCount(course, col.hostelName, col.categoryName);
                                return (
                                  <td key={col.key} className="py-3 px-4 text-center text-xs font-semibold text-gray-700 border-r border-gray-100 last:border-r-0">
                                    {val === 0 ? <span className="text-gray-300">-</span> : val}
                                  </td>
                                );
                              })}
                              <td className="py-3 px-4 text-right pr-6 font-bold text-xs text-gray-700 bg-gray-50/20 group-hover:bg-slate-50/40 transition-colors">
                                {course.count}
                              </td>
                            </tr>

                            {/* LEVEL 3: Year Row */}
                            {isCourseExpanded && getCourseYears(course).map((yearName) => {
                              const yearPath = `${coursePath}|${yearName}`;
                              const yearTotal = getYearTotalCount(course, yearName);

                              return (
                                <tr 
                                  key={yearPath}
                                  className="group bg-zinc-50/15 hover:bg-zinc-50/50 transition-colors border-b border-gray-100/50 last:border-b-0"
                                >
                                  <td className="py-2.5 px-4 sticky left-0 z-10 bg-zinc-50/10 group-hover:bg-zinc-50/40 transition-colors border-r border-gray-150/40 shadow-[2px_0_5px_0_rgba(0,0,0,0.01)]">
                                    <div className="flex items-center gap-1.5 pl-12 text-xs text-gray-650 font-medium">
                                      <span className="text-gray-400 text-[10px]">📅</span>
                                      <span>{yearName}</span>
                                    </div>
                                  </td>
                                  {columns.map(col => {
                                    const val = getYearColumnCount(course, yearName, col.hostelName, col.categoryName);
                                    return (
                                      <td key={col.key} className="py-2.5 px-4 text-center text-xs text-gray-500 border-r border-gray-100/50 last:border-r-0">
                                        {val === 0 ? <span className="text-gray-300">-</span> : val}
                                      </td>
                                    );
                                  })}
                                  <td className="py-2.5 px-4 text-right pr-6 text-xs text-gray-550 font-semibold bg-zinc-50/5 group-hover:bg-zinc-50/30 transition-colors">
                                    {yearTotal}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Export Choices Modal with Backdrop Blur */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsExportModalOpen(false)} />
          
          {/* Modal container */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-2xl relative z-10 w-full max-w-md transform transition-all duration-200">
            <h3 className="font-display font-bold text-lg text-gray-900 mb-2">
              {exportType === 'pdf' ? 'Print PDF Document Options' : 'Export Excel Document Options'}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Select which sections you want to compile and export.
            </p>
            
            <div className="space-y-4 mb-6">
              {/* Summary View option */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSummary}
                  onChange={(e) => setIncludeSummary(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-350"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">Summary View</span>
                  <span className="text-xs text-gray-500">Include the overall density pivot matrix and counts abstract.</span>
                </div>
              </label>

              {/* Detailed View option */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-slate-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDetails}
                  onChange={(e) => setIncludeDetails(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-350"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-800 block">Detailed View</span>
                  <span className="text-xs text-gray-500">Include detailed hostel category and room-wise student listings.</span>
                </div>
              </label>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!includeSummary && !includeDetails}
                onClick={handleConfirmExport}
                className={`px-4 py-2 text-xs font-medium text-white rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${(!includeSummary && !includeDetails) ? 'bg-gray-300 cursor-not-allowed' : exportType === 'pdf' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {exportType === 'pdf' ? 'Generate PDF' : 'Download Excel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden iframe for print-out generation */}
      <iframe
        id="print-iframe"
        style={{ display: 'none', width: 0, height: 0, border: 'none' }}
        title="Print Frame"
      />
    </div>
  );
};

export default StudentCountReports;
