import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Eye, X, Search, Filter, XCircle } from 'lucide-react';
import { employeeApiService } from '../services/apiService';
import { format } from 'date-fns';
import { usePermissions } from '../hooks/usePermissions';
import PermissionDenied from '../components/PermissionDenied';
import type { RedeemTransaction } from '../types';

const RedeemHistory = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasPermission } = usePermissions();

  // Check permission - require manageTransactions
  if (!hasPermission('manageTransactions')) {
    return <PermissionDenied />;
  }
  const [transactions, setTransactions] = useState<RedeemTransaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<RedeemTransaction | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Filter states
  const [filters, setFilters] = useState({
    invoiceNumber: '',
    customerName: '',
    customerEmail: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
  });
  const [filteredTransactions, setFilteredTransactions] = useState<RedeemTransaction[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (user) {
      loadTransactions();
    }
  }, [user]);

  useEffect(() => {
    // Apply filters whenever transactions or filters change
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, filters.invoiceNumber, filters.customerName, filters.customerEmail, filters.startDate, filters.endDate, filters.startTime, filters.endTime]);

  const loadTransactions = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await employeeApiService.getRedeemHistory();
      
      if (response.success && response.data) {
        // Map API response to RedeemTransaction type
        const mappedTransactions: RedeemTransaction[] = response.data.map((tx: any) => ({
          id: tx._id || tx.id,
          invoiceNumber: tx.invoiceNumber || '',
          companyId: tx.company?._id || tx.company || '',
          accountId: tx.company?._id || tx.company || '',
          customerId: tx.customer?._id || tx.customer || '',
          customerName: tx.customerName || tx.customer?.username || '',
          customerPhone: tx.customerPhone || tx.customer?.phone || '',
          redeem_points: tx.redeem_points || 0,
          date: tx.date || new Date(tx.createdAt).toISOString().split('T')[0],
          time: tx.time || new Date(tx.createdAt).toTimeString().slice(0, 5),
          invoiceImage: tx.invoiceImage,
          employeeId: tx.employee?._id || tx.employee || '',
          employeeName: tx.employeeName || '',
          createdAt: tx.createdAt || new Date().toISOString(),
          type: tx.type, // Add type for reference
          customerEmail: tx.customerEmail || tx.customer?.email || '', // Add customerEmail for filtering
        }));
        
        setTransactions(mappedTransactions);
        // Apply filters after loading
        setTimeout(() => applyFilters(), 0);
      } else {
        setError(response.message || t('common.error') || 'Failed to load transactions');
      }
    } catch (err: any) {
      console.error('Error loading transactions:', err);
      setError(err.message || err.data?.message || t('common.error') || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    
    // If no transactions loaded yet, don't filter
    if (filtered.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    // Filter by Invoice Number
    if (filters.invoiceNumber.trim()) {
      filtered = filtered.filter((t) =>
        (t.invoiceNumber || '').toLowerCase().includes(filters.invoiceNumber.toLowerCase().trim())
      );
    }

    // Filter by Customer Name
    if (filters.customerName.trim()) {
      filtered = filtered.filter((t) =>
        (t.customerName || '').toLowerCase().includes(filters.customerName.toLowerCase().trim())
      );
    }

    // Filter by Customer Email
    if (filters.customerEmail.trim()) {
      filtered = filtered.filter((t) =>
        (t.customerEmail || '').toLowerCase().includes(filters.customerEmail.toLowerCase().trim())
      );
    }

    // Filter by Date Range
    if (filters.startDate || filters.endDate) {
      filtered = filtered.filter((t) => {
        const transactionDate = new Date(t.createdAt);
        const startDateTime = filters.startDate
          ? new Date(
              `${filters.startDate}T${filters.startTime || '00:00'}:00`
            )
          : null;
        const endDateTime = filters.endDate
          ? new Date(
              `${filters.endDate}T${filters.endTime || '23:59'}:59`
            )
          : null;

        if (startDateTime && transactionDate < startDateTime) {
          return false;
        }
        if (endDateTime && transactionDate > endDateTime) {
          return false;
        }
        return true;
      });
    }

    setFilteredTransactions(filtered);
  };

  const clearFilters = () => {
    setFilters({
      invoiceNumber: '',
      customerName: '',
      customerEmail: '',
      startDate: '',
      endDate: '',
      startTime: '',
      endTime: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      filters.invoiceNumber.trim() ||
      filters.customerName.trim() ||
      filters.customerEmail.trim() ||
      filters.startDate ||
      filters.endDate
    );
  };

  const handleView = (transaction: RedeemTransaction) => {
    setSelectedTransaction(transaction);
    setIsViewModalOpen(true);
  };


  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('redeemHistory.title')}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500">{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="mb-6 space-y-4">
            {/* Filter Toggle Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                <Filter size={18} />
                {t('redeemHistory.filters') || 'Filters'}
                {hasActiveFilters() && (
                  <span className="bg-white text-purple-600 rounded-full px-2 py-0.5 text-xs font-semibold">
                    {[filters.invoiceNumber, filters.customerName, filters.customerEmail, filters.startDate, filters.endDate].filter(Boolean).length}
                  </span>
                )}
              </button>
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <XCircle size={18} />
                  {t('redeemHistory.clearFilters') || 'Clear Filters'}
                </button>
              )}
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {/* Invoice Number Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={filters.invoiceNumber}
                    onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
                    placeholder={t('redeemHistory.searchByInvoiceNumber') || 'Search by Invoice Number'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  />
                </div>

                {/* Customer Name Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={filters.customerName}
                    onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                    placeholder={t('redeemHistory.searchByCustomerName') || 'Search by Customer Name'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  />
                </div>

                {/* Customer Email Filter */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={filters.customerEmail}
                    onChange={(e) => setFilters({ ...filters, customerEmail: e.target.value })}
                    placeholder={t('redeemHistory.searchByEmail') || 'Search by Customer Email'}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  />
                </div>

                {/* Start Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('redeemHistory.startDate') || 'Start Date'}
                  </label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                  />
                </div>

                {/* Start Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('redeemHistory.startTime') || 'Start Time'}
                  </label>
                  <input
                    type="time"
                    value={filters.startTime}
                    onChange={(e) => setFilters({ ...filters, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    disabled={!filters.startDate}
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('redeemHistory.endDate') || 'End Date'}
                  </label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    min={filters.startDate}
                  />
                </div>

                {/* End Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('redeemHistory.endTime') || 'End Time'}
                  </label>
                  <input
                    type="time"
                    value={filters.endTime}
                    onChange={(e) => setFilters({ ...filters, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                    disabled={!filters.endDate}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.invoiceNumber')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.customerName')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.points')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.transactionType')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.date')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.time')}</th>
                  <th className="text-left py-4 px-6 font-semibold">{t('redeemHistory.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-gray-700">{transaction.invoiceNumber}</td>
                      <td className="py-4 px-6 text-gray-700">{transaction.customerName}</td>
                    
                      <td className="py-4 px-6 text-gray-700">{transaction.redeem_points}</td>
                      <td className="py-4 px-6">
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
                      <td className="py-4 px-6 text-gray-600">
                        {format(new Date(transaction.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="py-4 px-6 text-gray-600">{transaction.time}</td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(transaction)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('redeemHistory.view')}
                          >
                            <Eye size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredTransactions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</div>
            ) : (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-white rounded-lg shadow-md p-4 space-y-3"
                >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{transaction.customerName}</p>
                    <p className="text-sm text-gray-600">{transaction.invoiceNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">{transaction.redeem_points} {t('redeemHistory.points')}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div className="flex gap-2 items-center">
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
                  </div>
                  <div className="flex gap-2 text-gray-600">
                    <span>{format(new Date(transaction.date), 'MMM dd, yyyy')}</span>
                    <span>{transaction.time}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleView(transaction)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Eye size={16} />
                    {t('redeemHistory.view')}
                  </button>
                </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">{t('redeemHistory.viewDetails')}</h2>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">{t('redeemHistory.invoiceNumber')}</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('redeemHistory.customerName')}</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.customerName}</p>
                </div>
               
                <div>
                  <p className="text-sm text-gray-600">{t('redeemHistory.points')}</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.redeem_points}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('redeemHistory.date')}</p>
                  <p className="font-semibold text-gray-800">
                    {format(new Date(selectedTransaction.date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('redeemHistory.time')}</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Company ID</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.companyId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Customer Phone</p>
                  <p className="font-semibold text-gray-800">{selectedTransaction.customerPhone}</p>
                </div>
                {(selectedTransaction as any).type && (
                  <div>
                    <p className="text-sm text-gray-600">Transaction Type</p>
                    <p className="font-semibold text-gray-800 capitalize">{(selectedTransaction as any).type}</p>
                  </div>
                )}
              </div>
              {selectedTransaction.invoiceImage && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Invoice Image</p>
                  <img
                    src={selectedTransaction.invoiceImage}
                    alt="Invoice"
                    className="max-w-full h-auto rounded-lg border border-gray-300"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RedeemHistory;

