import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';

const useFeatureToggles = () => {
  const { user } = useAuth();
  const [featureToggles, setFeatureToggles] = useState({
    overview: true,
    raiseComplaint: true,
    myComplaints: true,
    attendance: true,
    leave: true,
    foundLost: true,
    hostelFee: true,
    paymentHistory: true,
    nocRequests: true,
    announcements: true,
    polls: true,
    profile: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && user.role === 'student') {
      fetchFeatureToggles();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchFeatureToggles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/feature-toggles/student');
      
      if (response.data.success) {
        setFeatureToggles(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching feature toggles:', err);
      setError('Failed to load feature settings');
      // Use default toggles (all enabled) if API fails
      setFeatureToggles({
        overview: true,
        raiseComplaint: true,
        myComplaints: true,
        attendance: true,
        leave: true,
        foundLost: true,
        hostelFee: true,
        paymentHistory: true,
        nocRequests: true,
        announcements: true,
        polls: true,
        profile: true
      });
    } finally {
      setLoading(false);
    }
  };

  const isFeatureEnabled = (feature) => {
    return featureToggles[feature] === true;
  };

  const getEnabledFeatures = () => {
    return Object.keys(featureToggles).filter(feature => featureToggles[feature]);
  };

  const getDisabledFeatures = () => {
    return Object.keys(featureToggles).filter(feature => !featureToggles[feature]);
  };

  return {
    featureToggles,
    loading,
    error,
    isFeatureEnabled,
    getEnabledFeatures,
    getDisabledFeatures,
    refresh: fetchFeatureToggles
  };
};

export default useFeatureToggles; 