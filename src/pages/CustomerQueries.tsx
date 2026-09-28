import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Send, X, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { employeeApiService } from '../services/apiService';
import type { CustomerQuery } from '../types';
import { format } from 'date-fns';

const CustomerQueries = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [queries, setQueries] = useState<CustomerQuery[]>([]);
  const [filteredQueries, setFilteredQueries] = useState<CustomerQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedQuery, setSelectedQuery] = useState<CustomerQuery | null>(null);
  const [response, setResponse] = useState('');
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'resolved'>('all');

  useEffect(() => {
    if (user) {
      loadQueries();
    }
  }, [user]);

  useEffect(() => {
    filterQueries();
  }, [queries, statusFilter]);

  const loadQueries = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await employeeApiService.getQueries();
      // Map backend response to frontend CustomerQuery type
      const mappedQueries: CustomerQuery[] = data.map((query: any) => ({
        id: query._id || query.id,
        customerId: query.customer && query.customer !== null && typeof query.customer === 'object' 
          ? (query.customer._id || query.customer.id || '')
          : (query.customer || ''),
        customerEmail: query.customerEmail || (query.customer && query.customer !== null && query.customer.email) || '',
        customerName: query.customerName || (query.customer && query.customer !== null && query.customer.username) || '',
        subject: query.subject || '',
        message: query.message || '',
        brandId: query.brandId && query.brandId !== null && typeof query.brandId === 'object'
          ? (query.brandId._id || query.brandId.id || '')
          : (query.brandId || ''),
        status: query.status || 'pending',
        responses: query.responses || [],
        createdAt: query.createdAt || new Date().toISOString(),
        updatedAt: query.updatedAt || query.createdAt || new Date().toISOString(),
      }));
      
      // Sort by creation date (newest first)
      const sortedQueries = mappedQueries.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setQueries(sortedQueries);
    } catch (err: any) {
      console.error('Error loading queries:', err);
      setError(err.message || t('queries.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const filterQueries = () => {
    let filtered = [...queries];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((q) => q.status === statusFilter);
    }

    setFilteredQueries(filtered);
  };

  const handleRespond = async () => {
    if (!selectedQuery || !response.trim()) return;

    setSending(true);
    try {
      await employeeApiService.respondToQuery(selectedQuery.id, response);
     handleMailClick(response, selectedQuery.customerEmail);
      await loadQueries();
      setSelectedQuery(null);
      setResponse('');
    } catch (err: any) {
      console.error('Error responding to query:', err);
      alert(err.message || t('queries.failedToSend'));
    } finally {
      setSending(false);
    }
  };

  const handleMailClick = (response: string, customerEmail: string) => {
    if (!customerEmail || !customerEmail.trim()) {
      alert(t('queries.noEmailError') || 'Customer email is not available');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = customerEmail.trim();
    if (!emailRegex.test(trimmedEmail)) {
      alert(t('queries.invalidEmailError') || 'Invalid email address');
      return;
    }

    const subject = "Pointbox response";

    // Use mailto: protocol to open the user's default email client application
    // This will open Outlook, Gmail app, Apple Mail, or any other default email client
    const mailtoUrl = `mailto:${encodeURIComponent(trimmedEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(response)}`;

    // Try to open the default email application directly
    // Method 1: Use window.location.href first (more direct, forces OS handling)
    try {
      window.location.href = mailtoUrl;
    } catch (error) {
      console.error('Error opening mailto link with window.location:', error);
      // Method 2: Fallback to creating an anchor element
      try {
        const link = document.createElement('a');
        link.href = mailtoUrl;
        // Remove target to ensure OS handles it, not browser
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        // Clean up after a short delay
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
      } catch (fallbackError) {
        console.error('Error opening mailto link:', fallbackError);
        alert(t('queries.mailtoError') || 'Unable to open email client. Please check your email settings or set a default email application in your system preferences.');
      }
    }
  };


  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; icon: any; label: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: t('queries.pending') },
      in_progress: { color: 'bg-blue-100 text-blue-700', icon: AlertCircle, label: t('queries.inProgress') },
      resolved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: t('queries.resolved') },
      closed: { color: 'bg-gray-100 text-gray-700', icon: CheckCircle, label: t('queries.closed') },
    };

    const statusInfo = statusMap[status] || statusMap.pending;
    const Icon = statusInfo.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
        <Icon size={14} />
        {statusInfo.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{t('queries.title')}</h1>
          <p className="text-gray-600 mt-1">{t('queries.subtitle')}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('queries.filterByStatus')}
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'resolved')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="all">{t('queries.allStatus')}</option>
              <option value="pending">{t('queries.pending')}</option>
              <option value="resolved">{t('queries.resolved')}</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">
            {t('queries.loadingQueries')}
          </div>
        ) : filteredQueries.length > 0 ? (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('queries.customer')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('queries.subject')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('queries.status')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('queries.date')}</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('queries.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQueries.map((query) => (
                    <tr key={query.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{query.customerName}</p>
                          <p className="text-xs text-gray-500">{query.customerEmail}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">{query.subject}</td>
                      <td className="py-3 px-4">{getStatusBadge(query.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {format(new Date(query.createdAt), 'MMM dd, yyyy HH:mm')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedQuery(query);
                              setResponse('');
                            }}
                            className="px-3 py-1 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-1"
                          >
                            <Send size={14} />
                            {t('queries.respond')}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedQuery(query);
                              setResponse('');
                            }}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                          >
                            {t('queries.view')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {filteredQueries.map((query) => (
                <div key={query.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{query.customerName}</h3>
                      <p className="text-xs text-gray-500">{query.customerEmail}</p>
                    </div>
                    {getStatusBadge(query.status)}
                  </div>
                  <div className="space-y-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-600 font-medium">{t('queries.subject')}:</span>
                      <p className="text-gray-800">{query.subject}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 font-medium">{t('queries.date')}:</span>
                      <p className="text-gray-800">{format(new Date(query.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedQuery(query);
                        setResponse('');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      <Send size={16} />
                      {t('queries.respond')}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedQuery(query);
                        setResponse('');
                      }}
                      className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      {t('queries.view')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {t('queries.noQueriesFound')}
          </div>
        )}
      </div>

      {/* Response Modal */}
      {selectedQuery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{t('queries.respondToQuery')}</h2>
              <button
                onClick={() => {
                  setSelectedQuery(null);
                  setResponse('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('queries.from')}</label>
                  <p className="text-gray-900">{selectedQuery.customerName} ({selectedQuery.customerEmail})</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('queries.subject')}</label>
                  <p className="text-gray-900">{selectedQuery.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('queries.message')}</label>
                  <div className="p-3 bg-white rounded-lg text-gray-700 border border-gray-200 whitespace-pre-wrap">
                    {selectedQuery.message}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('queries.date')}</label>
                  <p className="text-gray-600 text-sm">{format(new Date(selectedQuery.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                </div>
              </div>

              {selectedQuery.responses && selectedQuery.responses.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-800">{t('queries.previousResponses')}</h3>
                  {selectedQuery.responses.map((resp, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-gray-700 whitespace-pre-wrap">{resp.response}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('queries.respondedOn')}: {format(new Date(resp.respondedAt), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedQuery.responses && selectedQuery.responses.length > 0 
                    ? t('queries.updateResponse')
                    : t('queries.response')}
                </label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={t('queries.responsePlaceholder')}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleRespond}
                  disabled={!response.trim() || sending}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  {sending ? t('common.sending') : t('queries.sendResponse')}
                </button>
                <button
                  onClick={() => {
                    setSelectedQuery(null);
                    setResponse('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerQueries;
