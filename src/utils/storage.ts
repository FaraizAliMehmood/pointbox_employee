import type { RedeemTransaction, Customer, Notification } from '../types';

export const getRedeemTransactions = (employeeId: string): RedeemTransaction[] => {
  const stored = localStorage.getItem('redeem_transactions');
  if (!stored) return [];
  const all = JSON.parse(stored);
  return all.filter((t: RedeemTransaction) => t.employeeId === employeeId);
};

export const saveRedeemTransaction = (transaction: RedeemTransaction): void => {
  const stored = localStorage.getItem('redeem_transactions');
  const all = stored ? JSON.parse(stored) : [];
  all.push(transaction);
  localStorage.setItem('redeem_transactions', JSON.stringify(all));
};

export const updateRedeemTransaction = (id: string, updates: Partial<RedeemTransaction>): void => {
  const stored = localStorage.getItem('redeem_transactions');
  if (!stored) return;
  const all = JSON.parse(stored);
  const updated = all.map((t: RedeemTransaction) =>
    t.id === id ? { ...t, ...updates } : t
  );
  localStorage.setItem('redeem_transactions', JSON.stringify(updated));
};

export const deleteRedeemTransaction = (id: string): void => {
  const stored = localStorage.getItem('redeem_transactions');
  if (!stored) return;
  const all = JSON.parse(stored);
  const filtered = all.filter((t: RedeemTransaction) => t.id !== id);
  localStorage.setItem('redeem_transactions', JSON.stringify(filtered));
};

export const getCustomerByPhone = (phone: string, companyId: string): Customer | null => {
  const stored = localStorage.getItem('customers');
  if (!stored) return null;
  const customers = JSON.parse(stored);
  const customer = customers.find(
    (c: Customer) => c.phoneNumber === phone && c.companyId === companyId
  );
  return customer || null;
};

export const getCustomerById = (id: string): Customer | null => {
  const stored = localStorage.getItem('customers');
  if (!stored) return null;
  const customers = JSON.parse(stored);
  return customers.find((c: Customer) => c.id === id) || null;
};

export const updateCustomerPoints = (customerId: string, points: number): void => {
  const stored = localStorage.getItem('customers');
  if (!stored) return;
  const customers = JSON.parse(stored);
  const updated = customers.map((c: Customer) =>
    c.id === customerId ? { ...c, points: (c.points || 0) + points } : c
  );
  localStorage.setItem('customers', JSON.stringify(updated));
};

export const getCustomers = (companyId: string): Customer[] => {
  const stored = localStorage.getItem('customers');
  if (!stored) return [];
  const customers = JSON.parse(stored);
  return customers.filter((c: Customer) => c.companyId === companyId);
};

export const saveNotification = (notification: Notification): void => {
  const stored = localStorage.getItem('notifications');
  const all = stored ? JSON.parse(stored) : [];
  all.push(notification);
  localStorage.setItem('notifications', JSON.stringify(all));
};

