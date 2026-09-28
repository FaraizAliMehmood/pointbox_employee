import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Gift, TrendingUp, Clock, Users, Package, Image as ImageIcon } from 'lucide-react';
import { employeeApiService } from '../services/apiService';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { RedeemTransaction } from '../types';

const Dashboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState<RedeemTransaction[]>([]);
  const [stats, setStats] = useState({
    totalRedeems: 0,
    todayRedeems: 0,
    totalCustomers: 0,
    totalProducts: 0,
    totalBanners: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user || !user.companyId) return;
    setLoading(true);
    setError('');

    try {
      // Call all APIs in parallel
      const [transactionsResponse, customersResponse, productsData, bannersData] = await Promise.all([
        employeeApiService.getRedeemHistory().catch(err => {
          console.error('Error loading transactions:', err);
          return { success: false, data: [], message: err.message };
        }),
        employeeApiService.getCustomers().catch(err => {
          console.error('Error loading customers:', err);
          console.error('Customer API error details:', err.message, err.status, err.data);
          return [];
        }),
        employeeApiService.getProducts({ companyId: user.companyId }).catch(err => {
          console.error('Error loading products:', err);
          return [];
        }),
        employeeApiService.getBanners({ companyId: user.companyId }).catch(err => {
          console.error('Error loading banners:', err);
          return [];
        }),
      ]);

      // Ensure customersData is an array
      const customersData = Array.isArray(customersResponse) ? customersResponse : [];

      // Process transactions
      if (transactionsResponse.success && transactionsResponse.data) {
        // Map API response to RedeemTransaction type
        const mappedTransactions: RedeemTransaction[] = transactionsResponse.data.map((tx: any) => ({
          id: tx._id || tx.id,
          invoiceNumber: tx.invoiceNumber || '',
          companyId: tx.company?._id || tx.company || '',
          accountId: tx.company?._id || tx.company || '',
          customerId: tx.customer?._id || tx.customer || '',
          customerName: tx.customerName || tx.customer?.username || '',
          customerPhone: tx.customerPhone || tx.customer?.phone || '',
          redeem_points: tx.redeem_points || tx.redeemPoints || 0,
          date: tx.date || new Date(tx.createdAt).toISOString().split('T')[0],
          time: tx.time || new Date(tx.createdAt).toTimeString().slice(0, 5),
          invoiceImage: tx.invoiceImage,
          employeeId: tx.employee?._id || tx.employee || '',
          employeeName: tx.employeeName || '',
          createdAt: tx.createdAt || new Date().toISOString(),
          type: tx.type, // Add type for reference
        }));

        setTransactions(mappedTransactions);

        // Calculate stats
        const today = new Date();
        const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Filter today's transactions by comparing date strings
        const todayTransactions = mappedTransactions.filter((t) => {
          // Use createdAt if available (most reliable - ISO date from API)
          if (t.createdAt) {
            const txDateString = new Date(t.createdAt).toISOString().split('T')[0];
            return txDateString === todayDateString;
          }
          // Fallback to date field (already in YYYY-MM-DD format from API)
          if (t.date) {
            // Ensure date is in YYYY-MM-DD format
            const txDateString = t.date.includes('T') 
              ? t.date.split('T')[0] 
              : t.date.split(' ')[0];
            return txDateString === todayDateString;
          }
          return false;
        });

        setStats({
          totalRedeems: mappedTransactions.length,
          todayRedeems: todayTransactions.length,
          totalCustomers: customersData.length,
          totalProducts: Array.isArray(productsData) ? productsData.length : 0,
          totalBanners: Array.isArray(bannersData) ? bannersData.length : 0,
        });
      } else {
        // Still set other stats even if transactions fail
        setStats(prev => ({
          ...prev,
          totalCustomers: customersData.length,
          totalProducts: Array.isArray(productsData) ? productsData.length : 0,
          totalBanners: Array.isArray(bannersData) ? bannersData.length : 0,
        }));
        setError(transactionsResponse.message || t('common.error') || 'Failed to load transactions');
      }
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || err.data?.message || t('common.error') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('dashboard.title')}</h1>
        {user?.permissions?.manageTransactions && (
          <Link
            to="/redeem-points"
            className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 text-center"
          >
            {t('sidebar.redeemPoints')}
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
        {/* Total Transactions */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">{t('dashboard.totalRedeems')}</p>
              <p className="text-3xl font-bold mt-2">{stats.totalRedeems}</p>
            </div>
            <Gift size={40} className="opacity-80" />
          </div>
        </div>

        {/* Today's Transactions */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm">{t('dashboard.todayRedeems')}</p>
              <p className="text-3xl font-bold mt-2">{stats.todayRedeems}</p>
            </div>
            <TrendingUp size={40} className="opacity-80" />
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">{t('dashboard.totalCustomers')}</p>
              <p className="text-3xl font-bold mt-2">{stats.totalCustomers}</p>
            </div>
            <Users size={40} className="opacity-80" />
          </div>
        </div>

        {/* Total Products */}
        <div className="bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-sm">{t('dashboard.totalProducts')}</p>
              <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
            </div>
            <Package size={40} className="opacity-80" />
          </div>
        </div>

        {/* Total Banners */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-700 to-red-800 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200 text-sm">{t('dashboard.totalBanners')}</p>
              <p className="text-3xl font-bold mt-2">{stats.totalBanners}</p>
            </div>
            <ImageIcon size={40} className="opacity-80" />
          </div>
        </div>
      </div>

      {/* Recent Redeems */}
      <div className="bg-white rounded-xl shadow-lg p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={20} className="text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">{t('dashboard.recentRedeems')}</h2>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-center py-8">{t('common.loading')}</p>
        ) : recentTransactions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{t('redeemHistory.noData')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('redeemHistory.invoiceNumber')}</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('redeemHistory.customerName')}</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('redeemPoints.redeemPoints') || 'Redeem Points'}</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('redeemHistory.transactionType')}</th>
                  <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">{t('redeemHistory.date')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-2 text-sm text-gray-700">{transaction.invoiceNumber}</td>
                    <td className="py-3 px-2 text-sm text-gray-700">{transaction.customerName}</td>
                    <td className="py-3 px-2 text-sm font-semibold text-purple-600">{transaction.redeem_points || 0}</td>
                    <td className="py-3 px-2">
                      {transaction.type && (
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            transaction.type === 'earn'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.type === 'earn' ? t('redeemHistory.earn') : t('redeemHistory.redeem')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-sm text-gray-600">
                      {format(new Date(transaction.date + ' ' + transaction.time), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

