import { useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { safeLocalStorage } from '../utils/axios';

/**
 * SSOHandler Component
 * 
 * Implements Section 5 of the Portal Switcher Integration Guide:
 * Session Replacement in Target Portals (Incoming SSO).
 * 
 * When a user switches into this portal via the switcher or CRM,
 * an encrypted SSO token arrives in the URL query (?token=...).
 * 
 * To ensure old cached sessions don't override the incoming login,
 * this handler intercepts the incoming token, clears any stale sessions,
 * records the SSO flag, and smoothly redirects to /login to complete verification.
 */
export const SSOHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const ssoToken = searchParams.get('token');
    const crmUrl = searchParams.get('crmUrl') || searchParams.get('redirectUrl') || searchParams.get('returnUrl');

    if (ssoToken) {
      console.log('🔗 Incoming SSO token detected. Preparing clean session replacement.');

      // Prevent stale localhost URLs from persisting
      if (crmUrl && !crmUrl.includes('localhost') && !crmUrl.includes('127.0.0.1')) {
        safeLocalStorage.setItem('crmPortalUrl', crmUrl);
      }

      // Mark session as SSO
      safeLocalStorage.setItem('loginMethod', 'sso');
      safeLocalStorage.setItem('isSSO', 'true');

      // If not already on /login, forward to /login with the search params so verification proceeds
      if (location.pathname !== '/login') {
        const search = searchParams.toString();
        navigate(`/login${search ? `?${search}` : ''}`, { replace: true });
      }
    }
  }, [searchParams, location.pathname, navigate]);

  return null;
};

export default SSOHandler;
