import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/axios';

const GlobalSettingsContext = createContext();

export const useGlobalSettings = () => {
  const context = useContext(GlobalSettingsContext);
  if (!context) {
    throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
  }
  return context;
};

export const GlobalSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Default fallback settings
  const defaultSettings = {
    institution: {
      name: "Pydah",
      shortName: "Pydah Hostel",
      fullName: "Pydah Educational Institutions",
      type: "Educational Institution",
      description: "Digital hostel management system for Pydah Educational Institutions",
      address: {
        street: "Pydah Campus",
        city: "Visakhapatnam",
        state: "Andhra Pradesh",
        pincode: "530040",
        country: "India"
      },
      contact: {
        phone: "+91-891-1234567",
        email: "hostel@pydah.edu",
        website: "https://pydah.edu"
      }
    },
    urls: {
      website: "https://hms.pydahsoft.in",
      mainWebsite: "https://pydah.edu",
      hostelUrl: "https://hostel.pydah.edu",
      apiUrl: "https://api.hms.pydahsoft.in",
      supportUrl: "https://support.pydahsoft.in"
    },
    seo: {
      title: "Pydah Hostel Management System",
      description: "Digital hostel management system for Pydah Educational Institutions",
      keywords: "Pydah Hostel, Hostel Management, Student Portal, Digital Hostel",
      author: "Pydah Educational Institutions",
      ogImage: "https://hms.pydahsoft.in/og-image.jpg"
    },
    pydahsoft: {
      companyName: "PydahSoft",
      productName: "Hostel Management System",
      website: "https://pydahsoft.in"
    },
    system: {
      timezone: "Asia/Kolkata",
      currency: "INR",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "12h"
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/api/global-settings');
      
      if (response.data.success) {
        setSettings(response.data.data);
        console.log('✅ Global settings loaded successfully');
      } else {
        console.warn('⚠️ Failed to load global settings, using defaults');
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('❌ Error loading global settings:', error);
      console.error('❌ Error details:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      setError(error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  }, []); // Empty dependency array is correct here

  useEffect(() => {
    if (!isInitialized) {
      fetchSettings();
    }
  }, [fetchSettings, isInitialized]);

  // Helper functions for common operations
  const getInstitutionName = () => {
    return settings?.institution?.name || defaultSettings.institution.name;
  };

  const getInstitutionFullName = () => {
    return settings?.institution?.fullName || defaultSettings.institution.fullName;
  };

  const getInstitutionShortName = () => {
    return settings?.institution?.shortName || defaultSettings.institution.shortName;
  };

  const getWebsiteUrl = () => {
    return settings?.urls?.website || defaultSettings.urls.website;
  };

  const getMainWebsiteUrl = () => {
    return settings?.urls?.mainWebsite || defaultSettings.urls.mainWebsite;
  };

  const getFormattedAddress = () => {
    const address = settings?.institution?.address || defaultSettings.institution.address;
    return `${address.street}, ${address.city}, ${address.state} ${address.pincode}, ${address.country}`;
  };

  const getContactInfo = () => {
    return settings?.institution?.contact || defaultSettings.institution.contact;
  };

  const getSEOTitle = (pageTitle = '') => {
    const baseTitle = settings?.seo?.title || defaultSettings.seo.title;
    const institutionName = getInstitutionName();
    return pageTitle ? `${pageTitle} | ${institutionName}` : `${baseTitle} | ${institutionName}`;
  };

  const getSEODescription = (customDescription = '') => {
    return customDescription || settings?.seo?.description || defaultSettings.seo.description;
  };

  const getSEOKeywords = (customKeywords = '') => {
    return customKeywords || settings?.seo?.keywords || defaultSettings.seo.keywords;
  };

  const getPydahSoftInfo = () => {
    return settings?.pydahsoft || defaultSettings.pydahsoft;
  };

  const refetch = useCallback(() => {
    setIsInitialized(false);
    fetchSettings();
  }, [fetchSettings]);

  const value = {
    settings,
    loading,
    error,
    refetch,
    // Helper functions
    getInstitutionName,
    getInstitutionFullName,
    getInstitutionShortName,
    getWebsiteUrl,
    getMainWebsiteUrl,
    getFormattedAddress,
    getContactInfo,
    getSEOTitle,
    getSEODescription,
    getSEOKeywords,
    getPydahSoftInfo
  };

  return (
    <GlobalSettingsContext.Provider value={value}>
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export default GlobalSettingsContext;
