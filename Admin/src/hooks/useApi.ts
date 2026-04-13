import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const useApiHealth = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setIsLoading(true);
        const response = await api.health();
        setIsConnected(response.status === 'ok');
      } catch (error) {
        console.error('Backend connection error:', error);
        setIsConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  return { isConnected, isLoading };
};

