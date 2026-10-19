import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { safeLocalStorage } from '../utils/axios';

const PORTAL_ID = 'hostel-automation';
const CRM_BASE_URL = 'https://crm.pydah.edu.in';
const CRM_BACKEND_URL = 'https://crm.pydah.edu.in';
const CDN_SCRIPT_SRC = 'https://crm.pydah.edu.in/portal-switcher.js';
const SCRIPT_ID = 'pydah-portal-switcher-script';

/**
 * Removes all DOM elements and instances related to the Pydah Portal Switcher.
 */
export const removePortalSwitcherElements = () => {
  try {
    if (typeof window !== 'undefined' && window.PydahSwitcher && typeof window.PydahSwitcher.destroy === 'function') {
      window.PydahSwitcher.destroy();
    }
  } catch (err) {
    console.warn('Error destroying PydahSwitcher instance:', err);
  }

  if (typeof document !== 'undefined') {
    const selectors = [
      'pydah-portal-switcher',
      '#pydah-portal-switcher',
      '#pydah-switcher-root',
      '.pydah-portal-switcher-container',
      '#pydah-portal-switcher-script'
    ];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        try {
          el.remove();
        } catch (e) {
          // ignore
        }
      });
    });
  }
};

/**
 * PortalSwitcher Component
 * 
 * Embeds the Pydah Universal Portal Switcher floating widget.
 * CRITICAL REQUIREMENT: Rendered ONLY for users who are logged in via SSO.
 */
export const PortalSwitcher = () => {
  const { user, token, isSSOUser, isAuthenticated } = useAuth();
  const scriptLoadedRef = useRef(false);

  // Determine if the current active session is from Single Sign-On (SSO)
  const isSSO = Boolean(
    isSSOUser ||
    (typeof window !== 'undefined' &&
      (safeLocalStorage.getItem('loginMethod') === 'sso' ||
       safeLocalStorage.getItem('isSSO') === 'true'))
  );

  // Render ONLY for authenticated users who logged in via SSO
  const shouldRender = Boolean(isAuthenticated && token && user && isSSO);

  useEffect(() => {
    // If not authenticated or not an SSO user, ensure the switcher is completely removed
    if (!shouldRender) {
      removePortalSwitcherElements();
      scriptLoadedRef.current = false;
      return;
    }

    const initSwitcher = () => {
      if (typeof window !== 'undefined' && window.PydahSwitcher && typeof window.PydahSwitcher.init === 'function') {
        window.PydahSwitcher.init({
          currentPortal: PORTAL_ID,
          apiBaseUrl: CRM_BACKEND_URL,
          landingUrl: CRM_BASE_URL,
          position: 'bottom-right',
          token: token || safeLocalStorage.getItem('token'),
          user: user || JSON.parse(safeLocalStorage.getItem('user') || '{}')
        });
      }
    };

    // If script is already loaded in the DOM, re-initialize with current user
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      initSwitcher();
      return;
    }

    // Inject CDN script
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = CDN_SCRIPT_SRC;
    script.async = true;
    script.setAttribute('data-current-portal', PORTAL_ID);
    script.setAttribute('data-api-base-url', CRM_BACKEND_URL);
    script.setAttribute('data-landing-url', CRM_BASE_URL);
    script.setAttribute('data-position', 'bottom-right');

    script.onload = () => {
      scriptLoadedRef.current = true;
      initSwitcher();
    };

    script.onerror = (e) => {
      console.warn('Failed to load Pydah Universal Portal Switcher from CDN:', e);
    };

    document.body.appendChild(script);

    return () => {
      // Clean up when component unmounts or user state changes
      removePortalSwitcherElements();
      scriptLoadedRef.current = false;
    };
  }, [shouldRender, token, user]);

  return null;
};

export default PortalSwitcher;
