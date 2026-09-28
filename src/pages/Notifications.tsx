import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Bell, Send, Search } from 'lucide-react';
import type { Customer } from '../types';
import apiService from '../services/apiService';
const Notifications = () => {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [customerFilters, setCustomerFilters] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    country: '',
  });
  const [formData, setFormData] = useState({
    title: '',
    message: '',
  });

  useEffect(() => {
    loadCustomers();
    loadNotifications();
  }, []);

  const loadCustomers = async () => {
    try {
      const customersData = await apiService.getCustomers();
      console.log('Customers data: ',customersData);
      // Map the API response data to customer format
      const mappedCustomers = (Array.isArray(customersData) ? customersData : []).map((cust: any) => {
        return {
          id: cust._id || cust.id || cust.customerId || '',
          username: cust.username || cust.name || '',
          email: cust.email || '',
          phoneNumber: cust.phone || cust.phoneNumber || cust.mobile || '',
          address: cust.address || '',
          country: cust.country || '',
          googleSignUp: cust.isGoogleSignup || cust.googleSignUp || false,
          createdAt: cust.createdAt || cust.created_at || new Date().toISOString(),
          deviceToken: cust.deviceToken || null,
        };
      });
      
      setCustomers(mappedCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  // Load notifications from GET /employee/notifications (employeeRoutes.js: router.get('/notifications', getNotifications))
  const loadNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const response = await apiService.getNotifications();
      
      // Handle different response structures
      let notificationsData: any[] = [];
      
      if (response.success && response.data) {
        notificationsData = Array.isArray(response.data) ? response.data : [];
      } else if (Array.isArray(response)) {
        // If response is directly an array
        notificationsData = response;
      } else if (response.data && Array.isArray(response.data)) {
        notificationsData = response.data;
      }
      
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSendToAll(true);
    setSelectedCustomers([]);
    setFormData({
      title: '',
      message: '',
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setFormData({
      title: '',
      message: '',
    });
    setSendToAll(true);
    setSelectedCustomers([]);
    setCustomerFilters({
      name: '',
      email: '',
      phoneNumber: '',
      country: '',
    });
  };

  const handleToggleCustomer = (customer: Customer) => {
    const isSelected = selectedCustomers.some(c => c.id === customer.id);
    if (isSelected) {
      setSelectedCustomers(selectedCustomers.filter(c => c.id !== customer.id));
    } else {
      setSelectedCustomers([...selectedCustomers, customer]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure we have customers selected when not sending to all
    const targetCustomers = sendToAll ? customers : selectedCustomers;
    if (!sendToAll && targetCustomers.length === 0) {
      alert(t('notifications.selectAtLeastOneCustomer'));
      return;
    }

    // Collect all device tokens (web + mobile) from target customers
    const deviceTokens = targetCustomers.map((customer)=> customer.deviceToken);

    console.log('Target customers:', targetCustomers.length);
    console.log('Device tokens collected:', deviceTokens.length);
    console.log('Device tokens:', deviceTokens);

    if (deviceTokens.length === 0) {
      alert(t('notifications.noCustomersFound'));
      return;
    }

    setSendingNotification(true);

    const finalToken = deviceTokens.filter(token => token && token.trim().length > 0);
    console.log('Final tokens:', finalToken);

    // Payload expected by backend exports.notifications (FCM direct send)
    // POST /employee/notifications (employeeRoutes.js: router.post("/notifications", notifications))
    const notificationData = {
      titleText: formData.title,
      bodyText: formData.message,
      deviceTokens: deviceTokens.filter(token => token && token.trim().length > 0), // Remove empty tokens
    };
    try {
      const response = await apiService.createNotification(notificationData);
      console.log('Notification response:', response);
      
      // Backend exports.notifications returns { results: [...] } or { error: ... }
      if ((response as any)?.results) {
        const results = (response as any).results;
        const successCount = results.filter((r: any) => r.success).length;
        const failureCount = results.filter((r: any) => !r.success).length;
        
        if (successCount > 0) {
          alert(
            t('common.success') + 
            `: ${successCount} ${t('notifications.notificationsSentSuccessfully')}` + 
            (failureCount > 0 ? `, ${failureCount} ${t('notifications.failed')}` : '')
          );
          await loadNotifications();
          handleCloseModal();
        } else {
          alert(t('common.error') + ': ' + t('notifications.allNotificationsFailed'));
        }
      } else if ((response as any)?.error) {
        alert(t('common.error') + ': ' + ((response as any).error || t('notifications.failedToSendNotification')));
      } else {
        alert(t('common.error') + ': ' + ((response as any)?.message || t('notifications.unexpectedResponseFormat')));
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || t('notifications.failedToSendNotification');
      alert(t('common.error') + ': ' + errorMessage);
    } finally {
      setSendingNotification(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('notifications.title')}</h1>
        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Bell size={20} />
          {t('notifications.createNotification')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {notificationsLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">{t('notifications.loadingNotifications')}</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification._id || notification.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">
                      {notification.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{notification.message}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                      {notification.type && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {notification.type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Bell className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">{t('common.noData')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('notifications.sendNotificationsDescription')}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {t('notifications.createNotification')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notifications.titleField')}
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notifications.message')}
                </label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('notifications.targetCustomers')}
                </label>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={sendToAll}
                      onChange={() => {
                        setSendToAll(true);
                        setSelectedCustomers([]);
                      }}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span>{t('notifications.allCustomers')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!sendToAll}
                      onChange={() => {
                        setSendToAll(false);
                        loadNotifications();
                      }}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span>{t('notifications.selectCustomers')}</span>
                  </label>
                </div>
              </div>
              {!sendToAll && (
                <div>
                  <div className="mb-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('notifications.filterByName')}
                          value={customerFilters.name}
                          onChange={(e) => setCustomerFilters({ ...customerFilters, name: e.target.value })}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('notifications.filterByEmail')}
                          value={customerFilters.email}
                          onChange={(e) => setCustomerFilters({ ...customerFilters, email: e.target.value })}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('notifications.filterByPhone')}
                          value={customerFilters.phoneNumber}
                          onChange={(e) => setCustomerFilters({ ...customerFilters, phoneNumber: e.target.value })}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('notifications.filterByCountry')}
                          value={customerFilters.country}
                          onChange={(e) => setCustomerFilters({ ...customerFilters, country: e.target.value })}
                          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {(() => {
                      const filteredCustomers = customers.filter((customer) => {
                        const nameMatch = !customerFilters.name || 
                          (customer.username || customer.name || '').toLowerCase().includes(customerFilters.name.toLowerCase());
                        const emailMatch = !customerFilters.email || 
                          (customer.email || '').toLowerCase().includes(customerFilters.email.toLowerCase());
                        const phoneMatch = !customerFilters.phoneNumber || 
                          (customer.phoneNumber || customer.phone || '').toLowerCase().includes(customerFilters.phoneNumber.toLowerCase());
                        const countryMatch = !customerFilters.country || 
                          (customer.country || '').toLowerCase().includes(customerFilters.country.toLowerCase());
                        
                        return nameMatch && emailMatch && phoneMatch && countryMatch;
                      });
                      
                      const allFilteredSelected = filteredCustomers.length > 0 && 
                        filteredCustomers.every(customer => selectedCustomers.some(c => c.id === customer.id));
                      
                      const handleSelectAll = () => {
                        if (allFilteredSelected) {
                          // Deselect all filtered customers
                          const filteredIds = filteredCustomers.map(c => c.id);
                          setSelectedCustomers(selectedCustomers.filter(c => !filteredIds.includes(c.id)));
                        } else {
                          // Select all filtered customers (add only those not already selected)
                          const newSelections = filteredCustomers.filter(
                            customer => !selectedCustomers.some(c => c.id === customer.id)
                          );
                          setSelectedCustomers([...selectedCustomers, ...newSelections]);
                        }
                      };
                      
                      if (filteredCustomers.length > 0) {
                        return (
                          <>
                            <div className="mb-3 pb-3 border-b border-gray-200">
                              <label className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer font-medium">
                                <input
                                  type="checkbox"
                                  checked={allFilteredSelected}
                                  onChange={handleSelectAll}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                  {t('notifications.selectAllCustomers')}
                                </span>
                                <span className="text-xs text-gray-500 ml-auto">
                                  ({selectedCustomers.length} {t('notifications.selected')})
                                </span>
                              </label>
                            </div>
                            {filteredCustomers.map((customer) => (
                              <label
                                key={customer.id}
                                className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCustomers.some(c => c.id === customer.id)}
                                  onChange={() => {
                                    const webTokens = customer.deviceToken;
                                    console.log('Customer:', customer.username || customer.email);
                                    console.log('Web FCM Tokens:', webTokens);
                                    handleToggleCustomer(customer);
                                  }}
                                  className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                                />
                                <span className="text-sm text-gray-700">
                                  {customer.username || customer.name} ({customer.email})
                                </span>
                              </label>
                            ))}
                          </>
                        );
                      } else {
                        const hasFilters = Object.values(customerFilters).some(filter => filter.trim() !== '');
                        return (
                          <p className="text-gray-500 text-center py-4">
                            {hasFilters
                              ? t('notifications.noCustomersFoundMatchingFilters')
                              : t('common.noData')
                            }
                          </p>
                        );
                      }
                    })()}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={18} />
                  {sendingNotification ? t('common.sending') : t('notifications.send')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={sendingNotification}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;

