export interface Employee {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
  dutyAddress: string;
  companyId: string;
  username: string;
  password: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  address?: string;
  country?: string;
  points?: number;
  tierPoints?: number;
  companyId: string;
  createdAt: string;
}

export interface RedeemTransaction {
  id: string;
  invoiceNumber: string;
  companyId: string;
  accountId?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  redeem_points: number;
  date: string;
  time: string;
  invoiceImage?: string;
  employeeId: string;
  employeeName: string;
  createdAt: string;
  type?: 'earn' | 'redeem';
}

export interface EmployeePermissions {
  manageCompanies?: boolean;
  manageEmployees?: boolean;
  manageCustomers?: boolean;
  manageTransactions?: boolean;
  manageQueries?: boolean;
  manageBanners?: boolean;
  manageNotifications?: boolean;
  manageProducts?: boolean;
}

export interface User {
  id: string;
  email: string;
  username?: string;
  role: 'employee';
  companyId: string;
  employeeName?: string;
  isActive: boolean;
  createdAt: string;
  permissions?: EmployeePermissions;
  aiApiEnabled?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  redeemPoints?: number;
  couponCode: string;
  companyId: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  badge?: string;
  title: string;
  description?: string;
  imageUrl: string;
  link?: string;
  productUrl?: string;
  points?: number;
  isActive: boolean;
  type: 'regular' | 'special_event';
  language?: 'en' | 'ar';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  targetCustomerIds?: string[];
  companyId: string;
  createdAt: string;
}

export interface CustomerQuery {
  id: string;
  customerId: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  message: string;
  brandId: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  responses?: Array<{
    respondedBy: string;
    response: string;
    respondedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

