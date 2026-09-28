import React from 'react';

type DialogType = 'success' | 'error';

interface CustomDialogProps {
  open: boolean;
  type?: DialogType;
  title?: string;
  message?: string;
  onClose: () => void;
}

const CustomDialog: React.FC<CustomDialogProps> = ({
  open,
  type = 'success',
  title,
  message,
  onClose,
}) => {
  if (!open) return null;

  const isError = type === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden">
        <div
          className={`px-6 py-4 ${
            isError
              ? 'bg-red-50 border-b border-red-100'
              : 'bg-emerald-50 border-b border-emerald-100'
          }`}
        >
          <h2
            className={`text-lg font-semibold ${
              isError ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {title || (isError ? 'Something went wrong' : 'Success')}
          </h2>
        </div>

        <div className="px-6 py-4">
          {message && (
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {message}
            </p>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              isError
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomDialog;


