import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Banners from './pages/Banners';
import Products from './pages/Products';
import CustomerQueries from './pages/CustomerQueries';
import Notifications from './pages/Notifications';
import RedeemPoints from './pages/RedeemPoints';
import RedeemHistory from './pages/RedeemHistory';
import Settings from './pages/Settings';
import ChangePassword from './pages/ChangePassword';
import './i18n';

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute requiredPermission="manageCustomers">
                  <Layout>
                    <Customers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/queries"
              element={
                <ProtectedRoute requiredPermission="manageQueries">
                  <Layout>
                    <CustomerQueries />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/banners"
              element={
                <ProtectedRoute requiredPermission="manageBanners">
                  <Layout>
                    <Banners />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute requiredPermission="manageProducts">
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute requiredPermission="manageNotifications">
                  <Layout>
                    <Notifications />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/redeem-points"
              element={
                <ProtectedRoute requiredPermission="manageTransactions">
                  <Layout>
                    <RedeemPoints />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/redeem-history"
              element={
                <ProtectedRoute requiredPermission="manageTransactions">
                  <Layout>
                    <RedeemHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/change-password"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ChangePassword />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
