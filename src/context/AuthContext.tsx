import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { getUserProfile } from '../lib/api';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  adminLoggedIn: boolean;
  isLoading: boolean;
  loginAsUser: (user: UserProfile) => void;
  logoutUser: () => void;
  loginAsAdmin: () => void;
  logoutAdmin: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  adminLoggedIn: false,
  isLoading: true,
  loginAsUser: () => {},
  logoutUser: () => {},
  loginAsAdmin: () => {},
  logoutAdmin: () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check session data on load
    const storedUserId = sessionStorage.getItem('fixboard_user_id');
    const storedAdmin = sessionStorage.getItem('fixboard_admin_active');

    if (storedAdmin === 'true') {
      setAdminLoggedIn(true);
    }

    if (storedUserId) {
      getUserProfile(storedUserId)
        .then((profile) => {
          if (profile) {
            setUser(profile);
          } else {
            sessionStorage.removeItem('fixboard_user_id');
          }
        })
        .catch((err) => {
          console.error('Failed to restore user session:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const loginAsUser = (newUser: UserProfile) => {
    setUser(newUser);
    sessionStorage.setItem('fixboard_user_id', newUser.id);
  };

  const logoutUser = () => {
    setUser(null);
    sessionStorage.removeItem('fixboard_user_id');
  };

  const loginAsAdmin = () => {
    setAdminLoggedIn(true);
    sessionStorage.setItem('fixboard_admin_active', 'true');
  };

  const logoutAdmin = () => {
    setAdminLoggedIn(false);
    sessionStorage.removeItem('fixboard_admin_active');
  };

  const refreshUser = async () => {
    if (user?.id) {
      const updated = await getUserProfile(user.id);
      if (updated) {
        setUser(updated);
      }
    }
  };

  const isAdmin = adminLoggedIn || user?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        adminLoggedIn,
        isLoading,
        loginAsUser,
        logoutUser,
        loginAsAdmin,
        logoutAdmin,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
