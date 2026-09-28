import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Settings = () => {
  const { user } = useAuth();
  const { t } = useLanguage();


  return (
    <div className="space-y-6">
      <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('sidebar.settings')}</h1>
      
      {/* Employee Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Employee Information</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-semibold text-gray-800">{user?.employeeName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-semibold text-gray-800">{user?.email || 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Employee ID</p>
            <p className="font-semibold text-gray-800">{user?.id || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Password Update Form */}
    
    </div>
  );
};

export default Settings;

