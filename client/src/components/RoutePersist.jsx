import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoutePersist = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, lastPath, updateLastPath } = useAuth();

  useEffect(() => {
    // Don't save login or register paths
    if (!location.pathname.includes('/login') && !location.pathname.includes('/register')) {
      updateLastPath(location.pathname);
    }
  }, [location.pathname, updateLastPath]);

  useEffect(() => {
    // If we have a last path and user is authenticated, restore it
    if (isAuthenticated && lastPath && location.pathname === '/') {
      navigate(lastPath);
    }
  }, [isAuthenticated, lastPath, location.pathname, navigate]);

  return null;
};

export default RoutePersist; 