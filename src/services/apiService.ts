/**
 * Employee API Service
 * Centralized service class for all employee API calls
 */

import { API_BASE_URL, API_ENDPOINTS } from '../utils/apiConfig';
import type { Banner, Product, CustomerQuery } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
  user?: any;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    company: any;
    permissions?: {
      manageCompanies?: boolean;
      manageEmployees?: boolean;
      manageCustomers?: boolean;
      manageTransactions?: boolean;
      manageQueries?: boolean;
      manageBanners?: boolean;
      manageNotifications?: boolean;
    };
  };
}

export interface InvoiceScanResult {
  invoiceNumber: string | null;
  phoneNumbers: string[];
  customerPhoneNumber: string | null;
  amount: number | null;
  currency: string | null;
  amountLabel: string | null;
  needsVerification: boolean;
}

interface VerifyCustomerResponse {
  success: boolean;
  customer?: {
    id: string;
    username: string;
    email: string;
    phone: string;
    totalPoints: number;
    companyPoints?: number;
    tierPoints?: number;
    isLinked: boolean;
    linkedCompanies?: Array<{
      id: string;
      name: string;
    }>;
  };
  message?: string;
}

class EmployeeApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Load token from localStorage if available
    const storedToken = localStorage.getItem('employee_token');
    if (storedToken) {
      this.token = storedToken;
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('employee_token', token);
    } else {
      localStorage.removeItem('employee_token');
    }
  }

  /**
   * Get authentication token
   */
  getToken(): string | null {
    return this.token || localStorage.getItem('employee_token');
  }

  /**
   * Clear authentication token
   */
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('employee_token');
  }

  /**
   * Make API request with file upload
   */
  private async requestWithFile<T>(
    endpoint: string,
    formData: FormData,
    method: string = 'POST'
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers: HeadersInit = {};

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text || `HTTP error! status: ${response.status}`);
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        // Log the full error response for debugging
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          url: url
        });
        
        if (data && typeof data === 'object') {
          // Safely extract error message from various possible structures
          const errorData = data as any;
          if (errorData.message) {
            errorMessage = typeof errorData.message === 'string' ? errorData.message : errorMessage;
          } else if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error;
            } else if (errorData.error && typeof errorData.error === 'object' && errorData.error.message) {
              errorMessage = errorData.error.message;
            } else if (errorData.error && typeof errorData.error === 'object') {
              // Try to stringify the error object if it's complex
              errorMessage = JSON.stringify(errorData.error);
            }
          } else if (errorData.msg) {
            errorMessage = errorData.msg;
          } else {
            // If we can't find a message, stringify the whole response
            errorMessage = JSON.stringify(data);
          }
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // Normalize response to ApiResponse format
      // If response already has success/data structure, return as is
      if (data && typeof data === 'object' && ('success' in data || 'data' in data)) {
        return data as ApiResponse<T>;
      }
      
      // If response is the data directly, wrap it in ApiResponse format
      return {
        success: true,
        data: data as T,
      } as ApiResponse<T>;
    } catch (error: any) {
      console.error('API Request Error:', error);
      // Re-throw with a more user-friendly message if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      throw error;
    }
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (!this.baseURL) {
      throw new Error('API base URL is not configured');
    }
    if (!endpoint) {
      throw new Error('API endpoint is required');
    }
    
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    // Initialize headers first
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Ensure body is properly formatted FIRST
    // If body is already a string (from JSON.stringify), use it as is
    // If body is an object, stringify it
    // If body is FormData, use it as is
    let finalBody: string | FormData | null = null;
    
    if (options.body) {
      if (typeof options.body === 'string') {
        // Already stringified, use as is
        finalBody = options.body;
      } else if (options.body instanceof FormData) {
        // FormData, use as is (and don't set Content-Type header)
        finalBody = options.body;
        // Remove Content-Type for FormData (browser will set it with boundary)
        delete headers['Content-Type'];
      } else if (typeof options.body === 'object') {
        // Object needs to be stringified
        try {
          finalBody = JSON.stringify(options.body);
        } catch (stringifyError) {
          console.error('Error stringifying request body:', stringifyError);
          throw new Error('Invalid request body: unable to stringify');
        }
      } else {
        // Other types (number, boolean, etc.) - convert to string
        finalBody = String(options.body);
      }
    }

    // For POST/PUT/PATCH requests, ensure body exists or throw error
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!finalBody && !options.body) {
        throw new Error(`Request body is required for ${method} request to ${endpoint}`);
      }
      // If we have options.body but finalBody is null, use options.body
      if (!finalBody && options.body) {
        finalBody = options.body as string | FormData;
      }
    }

    // Set Content-Type based on final body type
    // Only if Content-Type wasn't explicitly set in options.headers
    if (!headers['Content-Type'] && !headers['content-type']) {
      if (finalBody instanceof FormData) {
        // Don't set Content-Type for FormData - browser will set it with boundary
      } else if (finalBody && typeof finalBody === 'string') {
        // Assume it's JSON if it's a string (from JSON.stringify)
        try {
          JSON.parse(finalBody);
          headers['Content-Type'] = 'application/json';
        } catch {
          // Not JSON, but still set it as text
          headers['Content-Type'] = 'text/plain';
        }
      } else if (['POST', 'PUT', 'PATCH'].includes(method)) {
        // For POST/PUT/PATCH without body or with object body, default to JSON
        headers['Content-Type'] = 'application/json';
      }
    }

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Log headers for debugging (but not sensitive data)
    console.log('Request headers:', {
      'Content-Type': headers['Content-Type'] || headers['content-type'] || 'not set',
      'Authorization': headers['Authorization'] ? 'Bearer ***' : 'none',
      'Method': method,
      'URL': url,
    });

    const config: RequestInit = {
      method: options.method,
      ...options,
      headers,
      body: finalBody || undefined, // Use undefined instead of null (some browsers don't like null)
    };

    // Log request details for debugging (but not the actual password)
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!config.body) {
        console.error('ERROR: Request body is missing for', options.method, 'request to', endpoint);
      } else if (typeof config.body === 'string') {
        try {
          const bodyObj = JSON.parse(config.body);
          const sanitized = { ...bodyObj };
          if (sanitized.password) sanitized.password = '***';
          console.log('Request body:', sanitized, 'Endpoint:', endpoint);
        } catch {
          // Not JSON, that's ok
          console.log('Request body (non-JSON):', config.body, 'Endpoint:', endpoint);
        }
      } else if (config.body instanceof FormData) {
        console.log('Request body (FormData) sent to:', endpoint);
      }
    }

    try {
      const response = await fetch(url, config);
      
      let data: any;
      
      try {
        const responseText = await response.text();
        // Try to parse as JSON
        if (responseText) {
          try {
            data = JSON.parse(responseText);
          } catch (parseError) {
            // If not valid JSON, use the text as the message
            if (!response.ok) {
              throw new Error(responseText || `HTTP error! status: ${response.status}`);
            }
            data = { message: responseText };
          }
        } else {
          // Empty response
          data = null;
        }
      } catch (jsonError: any) {
        // If we can't read the response at all
        console.error('Error reading response:', jsonError);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        data = null;
      }

      // Ensure data is not null before processing
      if (data === null || data === undefined) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status} - No response data`);
        }
        data = {};
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        // Log full error response for debugging
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          data: data,
        });
        
        // Safely extract error message
        if (data) {
          if (typeof data === 'object' && data !== null) {
            if (data.message && typeof data.message === 'string') {
              errorMessage = data.message;
            } else if (data.error && typeof data.error === 'string') {
              errorMessage = data.error;
            } else if (data.error && typeof data.error === 'object' && data.error.message) {
              errorMessage = data.error.message;
            } else if (data.stack) {
              // Server error with stack trace
              errorMessage = data.message || errorMessage;
              console.error('Server error stack:', data.stack);
            } else {
              // Try to stringify the whole error object for more details
              errorMessage = JSON.stringify(data);
            }
          } else if (typeof data === 'string') {
            errorMessage = data;
          }
        }

        const error: any = new Error(errorMessage);
        error.status = response.status;
        error.data = data || null;
        throw error;
      }

      // Ensure we return a valid ApiResponse format
      if (data === null || data === undefined) {
        return {
          success: false,
          message: 'No response data received',
        } as ApiResponse<T>;
      }

      return data as ApiResponse<T>;
    } catch (error: any) {
      // Re-throw if it's already our formatted error
      if (error.status) {
        throw error;
      }
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to the server');
      }
      
      // Log the error for debugging
      console.error('API Request Error:', error);
      
      throw error;
    }
  }

  /**
   * Login employee
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    // Validate inputs
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    // Ensure email and password are strings and not null/undefined
    const emailStr = String(email || '').trim();
    const passwordStr = String(password || '').trim();

    if (!emailStr || !passwordStr) {
      throw new Error('Email and password cannot be empty');
    }

    // Create request body
    const requestBody = {
      email: emailStr,
      password: passwordStr,
    };

    console.log('Login request body:', { email: emailStr, password: '***' }); // Don't log actual password

    const response = await this.request<LoginResponse>(API_ENDPOINTS.EMPLOYEE.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    if (response.success && response.token) {
      this.setToken(response.token);
    }

    const loginUser = response.user || { id: '', name: '', email: '', company: null, permissions: {} };
    return {
      success: response.success || false,
      token: response.token || '',
      user: {
        id: loginUser.id || '',
        name: loginUser.name || '',
        email: loginUser.email || '',
        company: loginUser.company || null,
        permissions: loginUser.permissions || {},
      },
    };
  }

  /**
   * Logout employee
   */
  logout(): void {
    this.clearToken();
  }

  /**
   * Add points (earn or redeem)
   */
  async addPoints(
    customerId: string,
    invoiceNumber: string,
    redeem_points: string,
    date: string,
    time: string,
    type: 'earn' | 'redeem' = 'earn',
    notes?: string,
    invoiceImage?: File
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    const formData = new FormData();
    formData.append('customerId', customerId);
    formData.append('invoiceNumber', invoiceNumber);
    // Backend currently expects both `redeem_points` and sometimes `points`/`amount`
    // Send redeem_points and points with the same value to support all cases
    formData.append('redeem_points', redeem_points.toString());
    formData.append('date', date);
    formData.append('time', time);
    formData.append('type', type);
    if (notes) {
      formData.append('notes', notes);
    }
    if (invoiceImage) {
      formData.append('invoice', invoiceImage);
    }

    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const url = `${this.baseURL}${API_ENDPOINTS.EMPLOYEE.POINTS.ADD}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: data.success || false,
        data: data.data,
        message: data.message,
      };
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw new Error(error.message || 'Failed to add points');
    }
  }

  /**
   * Scan a captured invoice photo and extract invoice number, phone number(s) and amount via Gemini
   */
  async scanInvoice(imageFile: File | Blob): Promise<{ success: boolean; data?: InvoiceScanResult; message?: string }> {
    const formData = new FormData();
    formData.append('invoice', imageFile, 'invoice.jpg');

    const token = this.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const url = `${this.baseURL}${API_ENDPOINTS.EMPLOYEE.INVOICE.SCAN}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: data.success || false,
        data: data.data,
        message: data.message,
      };
    } catch (error: any) {
      if (error.status) {
        throw error;
      }
      throw new Error(error.message || 'Failed to scan invoice');
    }
  }

  /**
   * Update employee password
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const response = await this.request<any>(
      API_ENDPOINTS.EMPLOYEE.PROFILE.UPDATE_PASSWORD,
      {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );

    return {
      success: response.success || false,
      message: response.message,
    };
  }

  /**
   * Send OTP for password change
   */
  async sendOTPForPasswordChange(email: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.EMPLOYEE.AUTH.CHECK_EMAIL, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  /**
   * Verify OTP for password change
   */
  async verifyOTPForPasswordChange(email: string, otp: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.EMPLOYEE.AUTH.VERIFY_OTP, {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }


  /**
   * Get all notifications
   */
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return await this.request<any[]>(
      API_ENDPOINTS.EMPLOYEE.NOTIFICATIONS.BASE,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Create a notification (supports both FCM format and standard format)
   */
  async createNotification(data: {
    titleText?: string;
    bodyText?: string;
    deviceTokens?: string[];
    title?: string;
    message?: string;
    type?: string;
    targetIds?: string[];
    imageUrl?: string;
    clickAction?: string;
  }): Promise<any> {
    const response = await this.request<any>(
      API_ENDPOINTS.EMPLOYEE.NOTIFICATIONS.BASE,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    // Return the response directly (could be FCM results or standard notification)
    return response.data || response;
  }

  /**
   * Change password with OTP
   */
  async changePasswordWithOTP(email: string, newPassword: string): Promise<ApiResponse<any>> {
    return this.request(API_ENDPOINTS.EMPLOYEE.AUTH.CHANGE_PASSWORD_WITH_OTP, {
      method: 'POST',
      body: JSON.stringify({ email, newPassword }),
    });
  }

  /**
   * Get redeem history
   */
  async getRedeemHistory(): Promise<{ success: boolean; data?: any[]; message?: string }> {
    const response = await this.request<any[]>(
      API_ENDPOINTS.EMPLOYEE.POINTS.HISTORY,
      {
        method: 'GET',
      }
    );

    return {
      success: response.success || false,
      data: response.data || [],
      message: response.message,
    };
  }

  /**
   * Verify customer by phone or QR data
   */
  async verifyCustomer(phone?: string, qrData?: string): Promise<VerifyCustomerResponse> {
    const body: { phone?: string; qrData?: string } = {};
    
    if (phone) {
      body.phone = phone;
    } else if (qrData) {
      body.qrData = qrData;
    } else {
      throw new Error('Either phone or qrData must be provided');
    }

    try {
      const response = await this.request<VerifyCustomerResponse>(
        API_ENDPOINTS.EMPLOYEE.CUSTOMER.VERIFY,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      // The API returns { success, customer, message } directly
      return {
        success: response.success || false,
        customer: (response as any).customer,
        message: response.message,
      };
    } catch (error: any) {
      // Handle error responses (like 403 for not linked, 404 for not found)
      if (error.data) {
        return {
          success: false,
          customer: error.data.customer,
          message: error.data.message || error.message,
        };
      }
      throw error;
    }
  }

  /**
   * Get all customers
   */
  async getCustomers(params?: { email?: string; phone?: string }): Promise<any[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.email) queryParams.append('email', params.email);
      if (params?.phone) queryParams.append('phone', params.phone);

      const queryString = queryParams.toString();
      const endpoint = `${API_ENDPOINTS.EMPLOYEE.CUSTOMER.BASE}${queryString ? `?${queryString}` : ''}`;

      const response = await this.request<any[]>(endpoint, {
        method: 'GET',
      });

      // Handle response structure: { success: true, data: [...] }
      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }
      
      // Fallback: if response.data is not an array, try to return response directly if it's an array
      if (Array.isArray(response)) {
        return response;
      }
      
      // If response.data exists but is not an array, wrap it
      if (response && response.data) {
        return Array.isArray(response.data) ? response.data : [response.data];
      }

      return [];
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string): Promise<void> {
    const response = await this.request<void>(API_ENDPOINTS.EMPLOYEE.CUSTOMER.BY_ID(id), {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete customer');
    }
  }

  // ==================== BANNERS PANEL ====================

  /**
   * Get all banners
   */
  async getBanners(data:{
    companyId: string;
  }): Promise<Banner[]> {
    const endpoint = `${API_ENDPOINTS.EMPLOYEE.BANNERS.BASE}/${data.companyId}`;
    const response = await this.request<Banner[]>(endpoint, {
      method: 'GET',
    });

    return response.data || [];
  }

 

  /**
   * Upload a new banner (with image upload)
   */
  async uploadBanner(formData: FormData): Promise<Banner> {
    const response = await this.requestWithFile<Banner>(
      API_ENDPOINTS.EMPLOYEE.BANNERS.BASE,
      formData,
      'POST'
    );

    if (!response.data) {
      throw new Error(response.message || 'Failed to upload banner');
    }

    return response.data;
  }

  /**
   * Update a banner (optionally with new image)
   */
  async updateBanner(id: string, formData: FormData): Promise<Banner> {
    const response = await this.requestWithFile<Banner>(
      API_ENDPOINTS.EMPLOYEE.BANNERS.BY_ID(id),
      formData,
      'PUT'
    );

    if (!response.data) {
      throw new Error(response.message || 'Failed to update banner');
    }

    return response.data;
  }

  /**
   * Delete a banner
   */
  async deleteBanner(id: string): Promise<void> {
    const response = await this.request<void>(API_ENDPOINTS.EMPLOYEE.BANNERS.BY_ID(id), {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete banner');
    }
  }

  // ==================== PRODUCTS PANEL ====================

  /**
   * Get all products
   */
  async getProducts(data:{
    companyId: string;
  }): Promise<Product[]> {
    const endpoint = `${API_ENDPOINTS.EMPLOYEE.PRODUCTS.BASE}/${data.companyId}`;
    const response = await this.request<Product[]>(endpoint, {
      method: 'GET',
    });

    return response.data || [];
  }

  /**
   * Create a new product (with image upload)
   */
  async createProduct(
    data: {
      name: string;
      description: string;
      redeemPoints?: number;
      couponCode: string;
      companyId: string;
    },
    imageFile: File
  ): Promise<Product> {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('description', data.description);
    if (data.redeemPoints !== undefined) {
      formData.append('redeem', data.redeemPoints.toString());
    }
    formData.append('couponCode', data.couponCode);
    formData.append('image', imageFile);
    formData.append('companyId', data.companyId);

    const response = await this.requestWithFile<Product>(
      API_ENDPOINTS.EMPLOYEE.PRODUCTS.BASE,
      formData,
      'POST'
    );

    if (!response.data) {
      throw new Error(response.message || 'Failed to create product');
    }

    return response.data;
  }

  /**
   * Update a product (optionally with new image)
   */
  async updateProduct(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      redeemPoints: number;
      couponCode: string;
    }>,
    imageFile?: File
  ): Promise<Product> {
    const formData = new FormData();
    
    // Always append all fields, even if they might be empty
    if (data.name !== undefined) formData.append('name', data.name);
    if (data.description !== undefined) formData.append('description', data.description);
    if (data.redeemPoints !== undefined) formData.append('redeem', data.redeemPoints.toString());
    if (data.couponCode !== undefined) formData.append('couponCode', data.couponCode);
    if (imageFile) formData.append('image', imageFile);

    // Log what we're sending for debugging
    console.log('Updating product with:', {
      id,
      name: data.name,
      description: data.description,
      couponCode: data.couponCode,
      hasImage: !!imageFile
    });

    try {
      const response = await this.requestWithFile<Product>(
        API_ENDPOINTS.EMPLOYEE.PRODUCTS.BY_ID(id),
        formData,
        'PUT'
      );

      if (!response || !response.data) {
        const errorMessage = response?.message || 'Failed to update product';
        throw new Error(errorMessage);
      }

      return response.data;
    } catch (error: any) {
      // Log the error details for debugging
      console.error('Update product error:', error);
      if (error.data) {
        console.error('Error response data:', JSON.stringify(error.data, null, 2));
      }
      if (error.message) {
        console.error('Error message:', error.message);
      }
      throw error;
    }
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: string): Promise<void> {
    const response = await this.request<void>(API_ENDPOINTS.EMPLOYEE.PRODUCTS.BY_ID(id), {
      method: 'DELETE',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to delete product');
    }
  }

  // ==================== QUERIES PANEL ====================

  /**
   * Get all customer queries for the company
   */
  async getQueries(): Promise<CustomerQuery[]> {
    const response = await this.request<CustomerQuery[]>(
      API_ENDPOINTS.EMPLOYEE.QUERIES.BASE,
      {
        method: 'GET',
      }
    );

    return response.data || [];
  }

  /**
   * Respond to a customer query
   */
  async respondToQuery(queryId: string, response: string): Promise<CustomerQuery> {
    const apiResponse = await this.request<CustomerQuery>(
      API_ENDPOINTS.EMPLOYEE.QUERIES.RESPOND(queryId),
      {
        method: 'POST',
        body: JSON.stringify({ response }),
      }
    );

    if (!apiResponse.data) {
      throw new Error(apiResponse.message || 'Failed to respond to query');
    }

    return apiResponse.data;
  }
}

export const employeeApiService = new EmployeeApiService();
export default employeeApiService;

