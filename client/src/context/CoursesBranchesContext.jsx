import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';
import { safeLocalStorage } from '../utils/axios';

const CoursesBranchesContext = createContext();

export const useCoursesBranches = () => {
  const context = useContext(CoursesBranchesContext);
  if (!context) {
    throw new Error('useCoursesBranches must be used within a CoursesBranchesProvider');
  }
  return context;
};

export const CoursesBranchesProvider = ({ children }) => {
  const [courses, setCourses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  // Cache duration: 5 minutes (300000 ms)
  const CACHE_DURATION = 5 * 60 * 1000;
  const CACHE_KEY_COURSES = 'courses_cache';
  const CACHE_KEY_BRANCHES = 'branches_cache';
  const CACHE_KEY_TIMESTAMP = 'courses_branches_timestamp';

  // Load from cache
  const loadFromCache = useCallback(() => {
    try {
      const cachedTimestamp = safeLocalStorage.getItem(CACHE_KEY_TIMESTAMP);
      if (cachedTimestamp) {
        const timeDiff = Date.now() - parseInt(cachedTimestamp);
        if (timeDiff < CACHE_DURATION) {
          const cachedCourses = safeLocalStorage.getItem(CACHE_KEY_COURSES);
          const cachedBranches = safeLocalStorage.getItem(CACHE_KEY_BRANCHES);
          
          if (cachedCourses && cachedBranches) {
            setCourses(JSON.parse(cachedCourses));
            setBranches(JSON.parse(cachedBranches));
            setLastFetchTime(parseInt(cachedTimestamp));
            return true;
          }
        }
      }
    } catch (err) {
      console.warn('Error loading from cache:', err);
    }
    return false;
  }, []);

  // Save to cache
  const saveToCache = useCallback((coursesData, branchesData) => {
    try {
      const timestamp = Date.now();
      safeLocalStorage.setItem(CACHE_KEY_COURSES, JSON.stringify(coursesData));
      safeLocalStorage.setItem(CACHE_KEY_BRANCHES, JSON.stringify(branchesData));
      safeLocalStorage.setItem(CACHE_KEY_TIMESTAMP, timestamp.toString());
      setLastFetchTime(timestamp);
    } catch (err) {
      console.warn('Error saving to cache:', err);
    }
  }, []);

  // Fetch courses and branches from API
  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh && loadFromCache()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const [coursesRes, branchesRes] = await Promise.all([
        api.get('/api/course-management/courses'),
        api.get('/api/course-management/branches')
      ]);

      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data);
      }
      if (branchesRes.data.success) {
        setBranches(branchesRes.data.data);
      }

      // Save to cache
      if (coursesRes.data.success && branchesRes.data.success) {
        saveToCache(coursesRes.data.data, branchesRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching courses/branches:', err);
      setError(err);
      
      // Try to load from cache even if API fails
      if (!loadFromCache()) {
        setCourses([]);
        setBranches([]);
      }
    } finally {
      setLoading(false);
    }
  }, [loadFromCache, saveToCache]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper function to get branches filtered by course
  const getBranchesByCourse = useCallback((courseId) => {
    if (!courseId) return branches;
    return branches.filter(b => 
      b.course === courseId || 
      (typeof b.course === 'object' && b.course._id === courseId)
    );
  }, [branches]);

  // Helper function to get course by ID
  const getCourseById = useCallback((courseId) => {
    return courses.find(c => c._id === courseId);
  }, [courses]);

  // Helper function to get branch by ID
  const getBranchById = useCallback((branchId) => {
    return branches.find(b => b._id === branchId);
  }, [branches]);

  // Invalidate cache and refetch
  const invalidateCache = useCallback(() => {
    try {
      safeLocalStorage.removeItem(CACHE_KEY_COURSES);
      safeLocalStorage.removeItem(CACHE_KEY_BRANCHES);
      safeLocalStorage.removeItem(CACHE_KEY_TIMESTAMP);
    } catch (err) {
      console.warn('Error invalidating cache:', err);
    }
    fetchData(true);
  }, [fetchData]);

  const value = {
    courses,
    branches,
    loading,
    error,
    lastFetchTime,
    fetchData,
    invalidateCache,
    getBranchesByCourse,
    getCourseById,
    getBranchById,
    // Check if cache is still valid
    isCacheValid: lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION
  };

  return (
    <CoursesBranchesContext.Provider value={value}>
      {children}
    </CoursesBranchesContext.Provider>
  );
};

export default CoursesBranchesContext;

