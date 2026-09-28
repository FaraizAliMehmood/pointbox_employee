import { useNavigate } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PermissionDenied = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
          <Lock className="text-red-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-600 mb-6">
          {t('permissions.denied') || 'You do not have permission to access this page.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.backToDashboard') || 'Back to Dashboard'}
        </button>
      </div>
    </div>
  );
};

export default PermissionDenied;

