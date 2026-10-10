import { useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { employeeApiService, type InvoiceScanResult } from '../services/apiService';

type ScanStep = 'camera' | 'preview' | 'processing' | 'result' | 'error';

interface InvoiceScannerModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (result: InvoiceScanResult, imageFile: File) => void;
}

const InvoiceScannerModal = ({ open, onClose, onApply }: InvoiceScannerModalProps) => {
  const [step, setStep] = useState<ScanStep>('camera');
  const [cameraError, setCameraError] = useState('');
  const [apiError, setApiError] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [result, setResult] = useState<InvoiceScanResult | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. Please use a modern browser with HTTPS connection.');
      return;
    }

    const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!isSecureContext) {
      setCameraError('Camera access requires a secure connection (HTTPS). Please access this application over HTTPS or localhost.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
      } catch (err: any) {
        if (err.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw err;
        }
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      const errorName = err.name || '';
      if (errorName === 'NotAllowedError') {
        setCameraError('Camera permission was denied. Please allow camera access in your browser settings and try again.');
      } else if (errorName === 'NotFoundError') {
        setCameraError('No camera found. Please ensure your device has a camera and it is not being used by another application.');
      } else if (errorName === 'NotReadableError') {
        setCameraError('Camera is already in use or not accessible. Please close other applications using the camera and try again.');
      } else {
        setCameraError('Unable to start camera. Please check permissions and try again.');
      }
    }
  };

  useEffect(() => {
    if (open && step === 'camera' && !streamRef.current) {
      startCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setStep('camera');
      setCameraError('');
      setApiError('');
      setCapturedImage(null);
      setCapturedFile(null);
      setResult(null);
    }
  }, [open]);

  useEffect(() => {
    return () => stopStream();
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedFile(new File([blob], `invoice-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        }
      },
      'image/jpeg',
      0.92
    );

    setStep('preview');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setStep('camera');
  };

  const handleConfirm = async () => {
    if (!capturedFile) return;

    setStep('processing');
    setApiError('');

    try {
      const response = await employeeApiService.scanInvoice(capturedFile);
      if (response.success && response.data) {
        setResult(response.data);
        setStep('result');
      } else {
        setApiError(response.message || 'Failed to analyze invoice image');
        setStep('error');
      }
    } catch (err: any) {
      setApiError(err.message || 'Failed to analyze invoice image. Please try again.');
      setStep('error');
    }
  };

  const handleScanAnother = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setResult(null);
    setApiError('');
    setStep('camera');
  };

  const handleUseThisInvoice = () => {
    if (result && capturedFile) {
      onApply(result, capturedFile);
    }
  };

  const handleClose = () => {
    stopStream();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="px-6 py-4 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-purple-700">
            {step === 'camera' && 'Scan Invoice'}
            {step === 'preview' && 'Review Photo'}
            {step === 'processing' && 'Analyzing Invoice'}
            {step === 'result' && 'Scan Results'}
            {step === 'error' && 'Scan Failed'}
          </h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4">
          {step === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {cameraError}
                </div>
              ) : (
                <div className="relative w-full h-72 bg-black rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-4 border-2 border-dashed border-white/70 rounded-lg pointer-events-none" />
                </div>
              )}
              <p className="text-xs text-gray-500 text-center">Align the invoice inside the frame, then capture.</p>
            </div>
          )}

          {step === 'preview' && capturedImage && (
            <div className="space-y-3">
              <img src={capturedImage} alt="Captured invoice" className="w-full max-h-80 object-contain rounded-lg border border-gray-200" />
            </div>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <Loader2 className="animate-spin text-purple-600" size={36} />
              <p className="text-sm text-gray-600">Extracting invoice number, phone number(s) and amount...</p>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              {result.needsVerification && (
                <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <span>The amount could not be confidently determined. Please verify manually.</span>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Invoice Number</p>
                <p className="font-semibold text-gray-800">{result.invoiceNumber ?? 'Not detected'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Phone Number(s)</p>
                {result.phoneNumbers.length > 0 ? (
                  <ul className="font-semibold text-gray-800">
                    {result.phoneNumbers.map((phone, idx) => (
                      <li key={idx}>{phone}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="font-semibold text-gray-800">None detected</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600">
                  Amount {result.amountLabel ? `(${result.amountLabel})` : ''}
                </p>
                <p className="font-semibold text-gray-800">
                  {result.amount !== null
                    ? `${result.currency ?? ''} ${result.amount.toFixed(2)}`.trim()
                    : 'Not detected'}
                </p>
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 flex justify-end gap-3">
          {step === 'camera' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
                disabled={!!cameraError}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Camera size={16} />
                Capture
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={handleRetake}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Retake
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Check size={16} />
                Confirm &amp; Analyze
              </button>
            </>
          )}

          {step === 'result' && (
            <>
              <button
                onClick={handleScanAnother}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleUseThisInvoice}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Use This Invoice
              </button>
            </>
          )}

          {step === 'error' && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleScanAnother}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default InvoiceScannerModal;
