import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Gift, 
  History,
  Settings, 
  LogOut,
  Menu,
  X,
  Users,
  Image,
  Package,
  Mail,
  Bell,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { hasPermission } from '../utils/permissions';
import type { EmployeePermissions } from '../types';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const allMenuItems = [
    { 
      path: '/dashboard', 
      icon: LayoutDashboard, 
      label: t('sidebar.dashboard'),
      permission: null, // Always visible
    },
    { 
      path: '/customers', 
      icon: Users, 
      label: t('sidebar.customers'),
      permission: 'manageCustomers'
    },
    { 
      path: '/queries', 
      icon: Mail, 
      label: t('sidebar.queries'),
      permission: 'manageQueries'
    },
    { 
      path: '/banners', 
      icon: Image, 
      label: t('sidebar.banners'),
      permission: 'manageBanners'
    },
    { 
      path: '/products', 
      icon: Package, 
      label: t('sidebar.products'),
      permission: 'manageProducts'
    },
    { 
      path: '/notifications', 
      icon: Bell, 
      label: t('sidebar.notifications'),
      permission: 'manageNotifications'
    },
    { 
      path: '/redeem-points', 
      icon: Gift, 
      label: t('sidebar.redeemPoints'),
      permission: 'manageTransactions'
    },
    { 
      path: '/redeem-history', 
      icon: History, 
      label: t('sidebar.redeemHistory'),
      permission: 'manageTransactions',
    },
    { 
      path: '/settings', 
      icon: Settings, 
      label: t('sidebar.settings'),
      permission: null, // Always visible
    },
    { 
      path: '/change-password', 
      icon: KeyRound, 
      label: t('sidebar.changePassword') || 'Change Password',
      permission: null, // Always visible
    },
  ];

  // Filter menu items based on permissions - only show menus where permission is true
  const menuItems = allMenuItems.filter((item) => {
    // If no permission required, always show
    if (!item.permission) return true;
    
    // Only show menu if user has the required permission set to true
    if (!user?.permissions) return false;
    
    return hasPermission(user.permissions, item.permission as keyof EmployeePermissions);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="h-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white flex flex-col">
      <div className="p-6 border-b border-purple-500/30">
        <h1 className="text-2xl font-bold">PointBox</h1>
        <p className="text-purple-200 text-sm mt-1">Employee Portal</p>
        {user && (
          <p className="text-purple-200 text-xs mt-2">{user.employeeName}</p>
        )}
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-purple-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-purple-500/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-purple-100 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="font-medium">{t('sidebar.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg shadow-lg"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 transform ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out`}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

export default Sidebar;

