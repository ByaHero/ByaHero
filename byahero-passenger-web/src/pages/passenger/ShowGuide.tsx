import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const ShowGuide: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Set the active tour step state to start the real spotlight tour on dashboard (matching mobile showGuide)
    localStorage.setItem('byahero_active_tour_step', '0');
    navigate('/', { replace: true });
  }, [navigate]);

  return null;
};

export default ShowGuide;
