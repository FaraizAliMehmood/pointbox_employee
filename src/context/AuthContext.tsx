import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { employeeApiService } from '../services/apiService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('employee_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Validate inputs
      if (!username || !password) {
        console.error('Login error: Username and password are required');
        return false;
      }

      // Backend expects email, so we use the username field value as email
      const response = await employeeApiService.login(username, password);
      
      if (response && response.success && response.user) {
        // Handle company ID - it can be a string or an object
        let companyId = '';
        if (typeof response.user.company === 'string') {
          companyId = response.user.company;
        } else if (response.user.company?._id) {
          companyId = response.user.company._id;
        } else if (response.user.company?.id) {
          companyId = response.user.company.id;
        }

        const userData: User = {
          id: response.user.id || '',
          email: response.user.email || username,
          username: response.user.name || username,
          role: 'employee',
          companyId: companyId,
          employeeName: response.user.name || username,
          isActive: true,
          createdAt: new Date().toISOString(),
          permissions: response.user.permissions || {},
          aiApiEnabled: response.user.aiApiEnabled || false,
        };
        
        setUser(userData);
        localStorage.setItem('employee_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      // Log more details if available
      if (error.message) {
        console.error('Error message:', error.message);
      }
      if (error.data) {
        console.error('Error data:', error.data);
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('employee_user');
    employeeApiService.logout();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

