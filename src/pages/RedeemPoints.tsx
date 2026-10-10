import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, QrCode, CheckCircle2, XCircle, Upload, X, Camera } from 'lucide-react';
import { employeeApiService, type InvoiceScanResult } from '../services/apiService';
import CustomDialog from '../components/CustomDialog';
import InvoiceScannerModal from '../components/InvoiceScannerModal';
import { Html5Qrcode } from 'html5-qrcode';
import { usePermissions } from '../hooks/usePermissions';
import PermissionDenied from '../components/PermissionDenied';
import type { Customer, Product } from '../types';
import { useNavigate } from "react-router-dom";
import {  Html5QrcodeScannerState } from 'html5-qrcode';

// Helper function to get tier based on points
const getTier = (points: number): { name: string; color: string; bgColor: string } => {
  if (points >= 5000) {
    return { name: 'Platinum', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  } else if (points >= 1000) {
    return { name: 'Gold', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
  } else {
    return { name: 'Silver', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  }
};

// Helper function to play buzzer sound after QR scan
const playBuzzerSound = async () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resume AudioContext if it's suspended (required by browser autoplay policies)
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  } catch (err) {
    console.error('Buzzer error:', err);
  }
};

const RedeemPoints = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  // Check permission - require manageTransactions
  if (!hasPermission('manageTransactions')) {
    return <PermissionDenied />;
  }
  const [searchMethod, setSearchMethod] = useState<'phone' | 'qr'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [qrScanner, setQrScanner] = useState<Html5Qrcode | null>(null);
  const [verificationError, setVerificationError] = useState<string>('');
  const [cameraError, setCameraError] = useState<string>('');
  const [, setLinkedCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const qrLockRef = useRef(false);

  const [formData, setFormData] = useState({
    invoiceNumber: '',
    companyId: '',
    type: 'earn' as 'earn' | 'redeem',
    redeem_points: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    invoiceImage: null as File | null,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'success' | 'error'>('success');
  const [dialogTitle, setDialogTitle] = useState<string>('');
  const [dialogMessage, setDialogMessage] = useState<string>('');

  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false);
  const [cameraPermissionState, setCameraPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown');

  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [showInvoiceScanner, setShowInvoiceScanner] = useState(false);

  useEffect(() => {
    return () => {
      if (!qrScanner) return;
  
      try {
        const state = qrScanner.getState();
        if (state === Html5QrcodeScannerState.SCANNING) {
          qrScanner.stop().catch(() => {});
        }
      } catch {}
    };
  }, [qrScanner]);

  // Fetch products when customer is verified
  useEffect(() => {
    const fetchProducts = async () => {
      if (isVerified && user?.companyId) {
        setLoadingProducts(true);
        try {
          const productsData = await employeeApiService.getProducts({ companyId: user.companyId });
          // Map backend response to frontend Product type
          const mappedProducts: Product[] = productsData.map((product: any) => ({
            id: product._id || product.id,
            name: product.name || '',
            description: product.description || '',
            image: product.image || '',
            redeemPoints: product.redeem_points || product.redeemPoints || 0,
            couponCode: product.couponCode || '',
            companyId: user.companyId || '',
            createdAt: product.createdAt || new Date().toISOString(),
          }));
          setProducts(mappedProducts);
        } catch (error: any) {
          console.error('Error fetching products:', error);
        } finally {
          setLoadingProducts(false);
        }
      }
    };

    fetchProducts();
  }, [isVerified, user?.companyId]);

  const handlePhoneSearch = async () => {
    if (!user || !phoneNumber.trim()) return;
    
    setVerificationError('');
    setCustomer(null);
    setIsVerified(false);
    
    try {
      const response = await employeeApiService.verifyCustomer(phoneNumber.trim());
      
      if (response.success && response.customer && response.customer.isLinked) {
        // Map API response to Customer type
        const customerData: Customer = {
          id: response.customer.id,
          name: response.customer.username,
          email: response.customer.email,
          phoneNumber: response.customer.phone,
          // Use company-specific points when available, otherwise fall back to total points
          points: response.customer.companyPoints ?? response.customer.totalPoints,
          tierPoints: response.customer.tierPoints ?? 0,
          companyId: user.companyId,
          createdAt: new Date().toISOString(),
        };
        setCustomer(customerData);
        setIsVerified(true);
        
        // Set linked companies for dropdown
        if (response.customer.linkedCompanies && response.customer.linkedCompanies.length > 0) {
          setLinkedCompanies(response.customer.linkedCompanies);
          // Set default companyId to the first linked company or user's company
          const defaultCompanyId = response.customer.linkedCompanies[0]?.id || user.companyId;
          setFormData(prev => ({
            ...prev,
            companyId: defaultCompanyId,
          }));
        } else {
          setLinkedCompanies([]);
          setFormData(prev => ({
            ...prev,
            companyId: user.companyId,
          }));
        }
      } else if (response.customer && !response.customer.isLinked) {
        setVerificationError(t('redeemPoints.customerNotLinked') || 'Customer is not linked to your company');
        setCustomer(null);
        setIsVerified(false);
      } else {
        setVerificationError(response.message || t('redeemPoints.noCustomerFound') || 'Customer not found');
        setCustomer(null);
        setIsVerified(false);
      }
    } catch (error: any) {
      console.error('Error verifying customer:', error);
      const errorMessage = error.message || error.data?.message || t('common.error') || 'An error occurred';
      setVerificationError(errorMessage);
      setCustomer(null);
      setIsVerified(false);
    }
  };

  // Checks the browser's camera permission state using the Permissions API.
  // Not all browsers support querying the 'camera' permission (e.g. Safari/Firefox),
  // so we fall back to 'unknown' and let the native getUserMedia prompt handle it.
  const checkCameraPermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return result.state as 'granted' | 'denied' | 'prompt';
      }
    } catch {
      // Permissions API doesn't support 'camera' in this browser
    }
    return 'unknown';
  };

  const handleScanQRClick = async () => {
    setCameraError('');
    setVerificationError('');

    const state = await checkCameraPermission();
    setCameraPermissionState(state);

    if (state === 'granted') {
      startQRScan();
    } else {
      setShowCameraPermissionModal(true);
    }
  };

  const startQRScan = async () => {
    if (!user) return;

    setCameraError('');
    setVerificationError('');

    try {
      // Check if camera API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access is not supported in this browser. Please use a modern browser with HTTPS connection.');
        return;
      }

      // Check if we're on HTTPS or localhost (required for camera access)
      const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      if (!isSecureContext) {
        setCameraError('Camera access requires a secure connection (HTTPS). Please access this application over HTTPS or localhost.');
        return;
      }

      // Set scanning state first to render the qr-reader div
      setIsScanning(true);
      
      // Wait for React to render the div and then wait a bit more for DOM update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Check if the element exists (with retries)
      let element = document.getElementById('qr-reader');
      let retries = 0;
      while (!element && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        element = document.getElementById('qr-reader');
        retries++;
      }
      
      if (!element) {
        setIsScanning(false);
        setCameraError('QR scanner container not found. Please try again.');
        return;
      }
      
      const scanner = new Html5Qrcode('qr-reader');
      let scannerStarted = false;
      
      try {
        qrLockRef.current = false;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleQRResult(decodedText);
          },
          () => {}
        );
        scannerStarted = true;
        setQrScanner(scanner);
        setCameraError('');
      } catch (startError: any) {
        console.error('Error starting QR scanner:', startError);
        
        // Clean up scanner instance if start fails
        if (!scannerStarted) {
          try {
            await scanner.clear();
          } catch (clearError) {
            // Ignore clear errors
          }
        }
        
        // Provide specific error messages based on error type
        const errorMessage = startError.message || startError.toString() || '';
        const errorName = startError.name || '';
        
        if (errorMessage.includes('Permission denied') || errorMessage.includes('permission') || errorName === 'NotAllowedError') {
          setIsScanning(false);
          setCameraError('Camera permission was denied. Please allow camera access in your browser settings and try again.');
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('not found') || errorName === 'NotFoundError') {
          setIsScanning(false);
          setCameraError('No camera found. Please ensure your device has a camera and it is not being used by another application.');
        } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('not readable') || errorName === 'NotReadableError') {
          setIsScanning(false);
          setCameraError('Camera is already in use or not accessible. Please close other applications using the camera and try again.');
        } else if (errorMessage.includes('OverconstrainedError') || errorName === 'OverconstrainedError') {
          // Try with simpler constraints as fallback
          try {
            await scanner.start(
              { facingMode: { exact: 'environment' } },
              {
                fps: 5,
                qrbox: { width: 200, height: 200 },
              },
              (decodedText) => {
                handleQRResult(decodedText);
              },
              () => {}
            );
            scannerStarted = true;
            setQrScanner(scanner);
            setCameraError('');
          } catch (retryError: any) {
            // If facingMode fails, try without constraints
            try {
              await scanner.start(
                {},
                {
                  fps: 5,
                  qrbox: { width: 200, height: 200 },
                },
                (decodedText) => {
                  handleQRResult(decodedText);
                },
                () => {}
              );
              scannerStarted = true;
              setQrScanner(scanner);
              setCameraError('');
            } catch (fallbackError: any) {
              setIsScanning(false);
              setCameraError('Unable to start camera. Please check permissions and ensure no other application is using the camera.');
            }
          }
        } else {
          setIsScanning(false);
          setCameraError('Unable to start camera. Please check permissions and try again.');
        }
      }
    } catch (err: any) {
      console.error('Error starting QR scanner:', err);
      setCameraError('Unable to start camera. Please check permissions and try again.');
    }
  };

  // const stopQRScan = async () => {
  //   if (qrScanner) {
  //     try {
  //       await qrScanner.stop();
  //       qrScanner.clear();
  //     } catch (err) {
  //       console.error('Error stopping QR scanner:', err);
  //     }
  //     setQrScanner(null);
  //     setIsScanning(false);
  //     setCameraError('');
  //   }
  // };

  const stopQRScan = async () => {
    if (!qrScanner) return;
  
    try {
      const state = qrScanner.getState();
  
      if (state === Html5QrcodeScannerState.SCANNING) {
        await qrScanner.stop();
      }
    } catch {
      // swallow ALL stop-related errors
    }
  
    try {
      await qrScanner.clear();
    } catch {}
  
    setQrScanner(null);
    setIsScanning(false);
    setCameraError('');
  };
  

  const handleQRResult = async (qrData: string) => {
    if (!user) return;
    if (qrLockRef.current) return;
  
    qrLockRef.current = true;
    
    // Play buzzer sound after successful QR scan
    playBuzzerSound();
    
    setVerificationError('');
    setCustomer(null);
    setIsVerified(false);
    
    try {
      // Verify customer using QR data (could be phone or customer ID)
      const response = await employeeApiService.verifyCustomer(undefined, qrData);
      
      if (response.success && response.customer && response.customer.isLinked) {
        // Map API response to Customer type
        const customerData: Customer = {
          id: response.customer.id,
          name: response.customer.username,
          email: response.customer.email,
          phoneNumber: response.customer.phone,
          // Use company-specific points when available, otherwise fall back to total points
          points: response.customer.companyPoints ?? response.customer.totalPoints,
          tierPoints: response.customer.tierPoints ?? 0,
          companyId: user.companyId,
          createdAt: new Date().toISOString(),
        };
        setCustomer(customerData);
        setIsVerified(true);
        
        // Set linked companies for dropdown
        if (response.customer.linkedCompanies && response.customer.linkedCompanies.length > 0) {
          setLinkedCompanies(response.customer.linkedCompanies);
          // Set default companyId to the first linked company or user's company
          const defaultCompanyId = response.customer.linkedCompanies[0]?.id || user.companyId;
          setFormData(prev => ({
            ...prev,
            companyId: defaultCompanyId,
          }));
        } else {
          setLinkedCompanies([]);
          setFormData(prev => ({
            ...prev,
            companyId: user.companyId,
          }));
        }
        await stopQRScan();
      } else if (response.customer && !response.customer.isLinked) {
        setVerificationError(t('redeemPoints.customerNotLinked') || 'Customer is not linked to your company');
        setCustomer(null);
        setIsVerified(false);
        await stopQRScan();
        qrLockRef.current = false;
      } else {
        setVerificationError(response.message || t('redeemPoints.noCustomerFound') || 'Customer not found');
        setCustomer(null);
        setIsVerified(false);
        stopQRScan();
        qrLockRef.current = false;
      }
    } catch (error: any) {
      console.error('Error verifying customer:', error);
      const errorMessage = error.message || error.data?.message || t('common.error') || 'An error occurred';
      setVerificationError(errorMessage);
      setCustomer(null);
      setIsVerified(false);
     await  stopQRScan();
     qrLockRef.current = false;
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ ...prev, invoiceImage: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setInvoicePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyScannedInvoice = (result: InvoiceScanResult, imageFile: File) => {
    // A scanned amount is independent of any selected product, so clear the
    // product selection so the redeem_points field becomes editable again.
    if (result.amount !== null) {
      setSelectedProductId('');
    }
    setFormData(prev => ({
      ...prev,
      invoiceNumber: result.invoiceNumber || prev.invoiceNumber,
      redeem_points: result.amount !== null ? result.amount.toString() : prev.redeem_points,
      invoiceImage: imageFile,
    }));
    const reader = new FileReader();
    reader.onloadend = () => {
      setInvoicePreview(reader.result as string);
    };
    reader.readAsDataURL(imageFile);
    setShowInvoiceScanner(false);
  };

  const handleTypeChange = (type: 'earn' | 'redeem') => {
    setFormData(prev => ({
      ...prev,
      type,
      redeem_points: '',
    }));
    // Reset product selection when changing type
    setSelectedProductId('');
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const selectedProduct = products.find(p => p.id === productId);
    if (selectedProduct) {
      console.log('Selected product:', selectedProduct);
      const redeemPointsValue = (selectedProduct.redeemPoints || 0).toString();
      console.log('Setting redeem_points:', redeemPointsValue);
      setFormData(prev => ({
        ...prev,
        redeem_points: redeemPointsValue,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        redeem_points: '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !customer || !isVerified) return;

    setSubmitting(true);
    setSubmitError('');

    try {   
      const response = await employeeApiService.addPoints(
        customer.id,
        formData.invoiceNumber,
        formData.redeem_points,
        formData.date,
        formData.time,
        formData.type,
        formData.notes || undefined,
        formData.invoiceImage || undefined
      );

      if (response.success) {
        const successMessage =
          formData.type === 'earn'
            ? t('redeemPoints.earnSuccess') || 'Points earned successfully!'
            : t('redeemPoints.redeemSuccess') || 'Points redeemed successfully!';

        setDialogType('success');
        setDialogTitle(
          formData.type === 'earn'
            ? t('redeemPoints.earnTitle') || 'Earn Points'
            : t('redeemPoints.redeemTitle') || 'Redeem Points'
        );
        setDialogMessage(successMessage);
        setDialogOpen(true);
        navigate('/redeem-history');
        // Reset form
        setFormData({
          invoiceNumber: '',
          companyId: formData.companyId, // Keep companyId for next transaction
          type: 'earn',
          redeem_points: '',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toTimeString().slice(0, 5),
          invoiceImage: null,
          notes: '',
        });
        setCustomer(null);
        setIsVerified(false);
        setPhoneNumber('');
        setInvoicePreview(null);
        setLinkedCompanies([]);
        setSelectedProductId('');
      } else {
        const errorMessage = response.message || t('common.error') || 'Failed to process transaction';
        setSubmitError(errorMessage);
        setDialogType('error');
        setDialogTitle(t('common.errorTitle') || 'Error');
        setDialogMessage(errorMessage);
        setDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Error submitting transaction:', error);
      const errorMessage = error.message || error.data?.message || t('common.error') || 'An error occurred';
      setSubmitError(errorMessage);
      setDialogType('error');
      setDialogTitle(t('common.errorTitle') || 'Error');
      setDialogMessage(errorMessage);
      setDialogOpen(true);
    } finally {
      setSubmitting(false);
     
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('redeemPoints.title')}</h1>
        <button
          onClick={() => setShowInvoiceScanner(true)}
          className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-4 py-2.5 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Camera size={18} />
          Scan Invoice
        </button>
      </div>

      {/* Search Method Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={async () => {
            if (isScanning) {
              await stopQRScan();
            }
            setSearchMethod('phone');
            setVerificationError('');
            setCameraError('');
            setCustomer(null);
            setIsVerified(false);
            setLinkedCompanies([]);
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            searchMethod === 'phone'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {t('redeemPoints.byPhone')}
        </button>
        <button
          onClick={() => {
            setSearchMethod('qr');
            setVerificationError('');
            setCameraError('');
            setCustomer(null);
            setIsVerified(false);
            setLinkedCompanies([]);
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            searchMethod === 'qr'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          {t('redeemPoints.byQR')}
        </button>
      </div>

      {/* Phone Search */}
      {searchMethod === 'phone' && (
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder={t('redeemPoints.phonePlaceholder')}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            />
            <button
              onClick={handlePhoneSearch}
              className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Search size={20} />
              {t('redeemPoints.search')}
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {searchMethod === 'qr' && (
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex flex-col items-center gap-4">
            {!isScanning ? (
              <>
                <button
                  onClick={handleScanQRClick}
                  className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <QrCode size={20} />
                  {t('redeemPoints.scanQR')}
                </button>
                {cameraError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md w-full">
                    {cameraError}
                  </div>
                )}
              </>
            ) : (
              <>
                <div id="qr-reader" className="w-full max-w-md"></div>
                {cameraError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm max-w-md w-full">
                    {cameraError}
                  </div>
                )}
                <button
                  onClick={stopQRScan}
                  className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <X size={20} />
                  {t('common.close')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Customer Info */}
      {customer && (
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">{t('redeemPoints.customerInfo')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('redeemPoints.customerName')}</p>
              <p className="font-semibold text-gray-800">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('redeemPoints.customerPhone')}</p>
              <p className="font-semibold text-gray-800">{customer.phoneNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('redeemPoints.customerEmail')}</p>
              <p className="font-semibold text-gray-800">{customer.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('redeemPoints.customerPoints')}</p>
              <p className="font-semibold text-purple-600">{customer.points || 0}</p>
            </div>
           
            <div>
              <p className="text-sm text-gray-600">Tier</p>
              {(() => {
                const tier = getTier(customer.tierPoints || 0);
                return (
                  <span className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${tier.bgColor} ${tier.color}`}>
                    {tier.name}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            {isVerified ? (
              <>
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-green-600 font-semibold">{t('redeemPoints.customerVerified')}</span>
              </>
            ) : (
              <>
                <XCircle className="text-red-500" size={20} />
                <span className="text-red-600 font-semibold">{t('redeemPoints.customerNotLinked')}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Redeem Form */}
      {customer && isVerified && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 lg:p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-800">{t('redeemPoints.title')}</h2>

          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {submitError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.transactionType') || 'Transaction Type'} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value as 'earn' | 'redeem')}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white"
              >
                <option value="earn">{t('redeemPoints.earn') || 'Earn Points'}</option>
                <option value="redeem">{t('redeemPoints.redeem') || 'Redeem Points'}</option>
              </select>
            </div>

            {formData.type === 'redeem' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('redeemPoints.product') || 'Product'} {t('common.optional') || '(Optional)'}
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  disabled={loadingProducts}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingProducts
                      ? (t('common.loading') || 'Loading...')
                      : (t('redeemPoints.selectProduct') || 'Select a product')}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {product.redeemPoints} {t('redeemPoints.redeemPoints')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.invoiceNumber')} *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.customerId') || 'Customer ID'}
              </label>
              <input
                type="text"
                value={customer?.id || ''}
                readOnly
                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed outline-none"
              />
            </div>


            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.redeemPoints') || 'Redeem Points'} *
              </label>
              <input
                type="text"
                value={formData.redeem_points}
                onChange={(e) => setFormData(prev => ({ ...prev, redeem_points: e.target.value }))}
                readOnly={!!selectedProductId}
                required
                className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none ${
                  selectedProductId ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.date')} *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('redeemPoints.time')} *
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('redeemPoints.notes') || 'Notes (Optional)'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
              placeholder={t('redeemPoints.notesPlaceholder') || 'Add any additional notes...'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('redeemPoints.uploadInvoice')}
            </label>
            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
                <Upload size={20} className="text-gray-500" />
                <span className="text-gray-600">{t('redeemPoints.uploadInvoice')}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              {invoicePreview && (
                <div className="relative">
                  <img src={invoicePreview} alt="Invoice preview" className="max-w-full h-[100px] rounded-lg border border-gray-300" />
                  <button
                    type="button"
                    onClick={() => {
                      setInvoicePreview(null);
                      setFormData(prev => ({ ...prev, invoiceImage: null }));
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (t('common.loading') || 'Processing...') : (t('redeemPoints.submit') || 'Submit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomer(null);
                setIsVerified(false);
                setFormData({
                  invoiceNumber: '',
                  companyId: formData.companyId,
                  type: 'earn',
                  redeem_points: '',
                  date: new Date().toISOString().split('T')[0],
                  time: new Date().toTimeString().slice(0, 5),
                  invoiceImage: null,
                  notes: '',
                });
                setInvoicePreview(null);
                setLinkedCompanies([]);
                setSelectedProductId('');
                setSubmitError('');
              }}
              className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              {t('redeemPoints.cancel')}
            </button>
          </div>
        </form>
      )}

      {verificationError && (
        <div className={`px-4 py-3 rounded-lg ${
          verificationError.includes('not linked') || verificationError.includes('not found')
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {verificationError}
        </div>
      )}

      {showCameraPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 bg-purple-50 border-b border-purple-100">
              <h2 className="text-lg font-semibold text-purple-700">
                {t('redeemPoints.cameraPermissionTitle') || 'Camera Permission Needed'}
              </h2>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-700">
                {cameraPermissionState === 'denied'
                  ? t('redeemPoints.cameraPermissionDenied') ||
                    'Camera access has been blocked for this site. Please enable camera permission from your browser settings, then try again.'
                  : t('redeemPoints.cameraPermissionRequest') ||
                    'PointBox needs access to your camera to scan QR codes. Please allow camera access when prompted by your browser.'}
              </p>
            </div>

            <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCameraPermissionModal(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              {cameraPermissionState === 'denied' ? (
                <button
                  onClick={async () => {
                    const state = await checkCameraPermission();
                    setCameraPermissionState(state);
                    if (state === 'granted') {
                      setShowCameraPermissionModal(false);
                      startQRScan();
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  {t('common.tryAgain') || 'Try Again'}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowCameraPermissionModal(false);
                    startQRScan();
                  }}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  {t('common.allow') || 'Allow Camera'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <InvoiceScannerModal
        open={showInvoiceScanner}
        onClose={() => setShowInvoiceScanner(false)}
        onApply={handleApplyScannedInvoice}
      />

      <CustomDialog
        open={dialogOpen}
        type={dialogType}
        title={dialogTitle}
        message={dialogMessage}
        onClose={() => {
          setDialogOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
};

export default RedeemPoints;
