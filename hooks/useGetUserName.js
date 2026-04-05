import { useState, useEffect } from 'react';
import { GetUserNameValue } from '../LocalStorage/StoreUserName';

/**
 * Custom hook for getting user name from storage
 * @returns {string} - User name
 */
export const useGetUserName = () => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchUserName = async () => {
      try {
        const name = await GetUserNameValue();
        setUserName(name || '');
      } catch (error) {
        console.error('Error fetching user name:', error);
        setUserName('');
      }
    };

    fetchUserName();
  }, []);

  return userName;
};
