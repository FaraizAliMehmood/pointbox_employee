import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Search } from 'lucide-react';
import type { Customer } from '../types';
import { employeeApiService } from '../services/apiService';

const Customers = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadCustomers();
    }
  }, [user]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchEmail, searchPhone]);

  const loadCustomers = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    try {
      const data = await employeeApiService.getCustomers();
      // Map backend response to frontend Customer type
      const mappedCustomers: Customer[] = data.map((customer: any) => ({
        id: (customer as any)._id || customer.id,
        name: (customer as any).username || customer.name || '',
        email: customer.email || '',
        phoneNumber: (customer as any).phone || customer.phoneNumber || '',
        address: customer.address || '',
        country: customer.country || '',
        points: customer.points || 0,
        companyId: user.companyId || '',
        createdAt: customer.createdAt || new Date().toISOString(),
      }));
      setCustomers(mappedCustomers);
    } catch (err: any) {
      console.error('Error loading customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchEmail) {
      filtered = filtered.filter((c) =>
        c.email.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (searchPhone) {
      filtered = filtered.filter((c) =>
        c.phoneNumber.includes(searchPhone)
      );
    }

    setFilteredCustomers(filtered);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('customers.filterByEmail')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder={t('customers.filterByEmail')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('customers.filterByPhone')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder={t('customers.filterByPhone')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
         
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.name')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.email')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.phoneNumber')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.address')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.country')}</th>
                {/* <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.actions')}</th> */}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-700">{customer.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{customer.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{customer.phoneNumber}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{customer.address || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{customer.country || '-'}</td>
                    <td className="py-3 px-4">
                      {/* <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div> */}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {t('common.loading')}
            </div>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                  </div>
                  {/* <div className="flex items-center gap-2">
                    <button
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div> */}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('customers.phoneNumber')}:</span>
                    <span className="text-gray-800 font-medium">{customer.phoneNumber}</span>
                  </div>
                  {customer.address && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('customers.address')}:</span>
                      <span className="text-gray-800 font-medium">{customer.address}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('customers.country')}:</span>
                    <span className="text-gray-800 font-medium">{customer.country || '-'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('common.noData')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Customers;

