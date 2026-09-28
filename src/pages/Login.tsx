import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { LogIn, Eye, EyeOff, Mail, Lock, KeyRound, CheckCircle } from 'lucide-react';
import employeeApiService from '../services/apiService';

type Mode = 'login' | 'checkEmail' | 'verifyOTP' | 'changePassword';

const Login = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Change password flow states
  const [changePasswordEmail, setChangePasswordEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use username field value as email (backend expects email)
      const success = await login(username, password);
      if (success) {
        navigate('/dashboard');
      } else {
        setError(t('auth.invalidCredentials'));
      }
    } catch (err) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await employeeApiService.sendOTPForPasswordChange(changePasswordEmail);
      if (response.success) {
        setMode('verifyOTP');
      } else {
        setError(response.message || 'Failed to send OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await employeeApiService.verifyOTPForPasswordChange(changePasswordEmail, otp);
      if (response.success) {
        setMode('changePassword');
      } else {
        setError(response.message || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError(t('changePassword.passwordMinLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('changePassword.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await employeeApiService.changePasswordWithOTP(changePasswordEmail, newPassword);
      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          setMode('login');
          setSuccess(false);
          setChangePasswordEmail('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
        }, 3000);
      } else {
        setError(response.message || t('changePassword.passwordUpdateError'));
      }
    } catch (err: any) {
      setError(err.message || t('changePassword.passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="text-green-600" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">{t('changePassword.passwordUpdated')}</h1>
            <p className="text-gray-600 mb-6">
              {t('changePassword.passwordUpdatedMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8">
          {/* Login Form */}
          {mode === 'login' && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-full mb-4">
                  <LogIn className="text-white" size={32} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('auth.loginTitle')}</h1>
                <p className="text-gray-600 mt-2 text-sm lg:text-base">Sign in to your employee account</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.username')} / {t('auth.email')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    placeholder="Username or email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.loading') : t('auth.login')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('checkEmail');
                    setError('');
                    setChangePasswordEmail('');
                  }}
                  className="w-full text-purple-600 font-semibold hover:text-purple-700 transition-colors text-sm"
                >
                  {t('auth.forgotPassword')}
                </button>
              </form>
            </>
          )}

          {/* Step 1: Check Email */}
          {mode === 'checkEmail' && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-full mb-4">
                  <Mail className="text-white" size={32} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('changePassword.checkEmail')}</h1>
                <p className="text-gray-600 mt-2 text-sm lg:text-base">{t('changePassword.checkEmailDescription')}</p>
              </div>

              <form onSubmit={handleSendOTP} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.email')}
                  </label>
                  <input
                    type="email"
                    value={changePasswordEmail}
                    onChange={(e) => setChangePasswordEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    placeholder="employee@example.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.loading') : t('changePassword.sendOTP')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setChangePasswordEmail('');
                    setError('');
                  }}
                  className="w-full text-purple-600 font-semibold hover:text-purple-700 transition-colors text-sm"
                >
                  {t('auth.login')}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Verify OTP */}
          {mode === 'verifyOTP' && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-full mb-4">
                  <KeyRound className="text-white" size={32} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('changePassword.verifyOTP')}</h1>
                <p className="text-gray-600 mt-2 text-sm lg:text-base">{t('changePassword.verifyOTPDescription')}</p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('changePassword.otpCode')}
                  </label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    maxLength={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest"
                    placeholder="0000"
                  />
                  <p className="text-sm text-gray-500 mt-2">{t('changePassword.otpSentTo')} {changePasswordEmail}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 4}
                  className="w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.loading') : t('changePassword.verify')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('checkEmail');
                    setOtp('');
                    setError('');
                  }}
                  className="w-full text-purple-600 font-semibold hover:text-purple-700 transition-colors text-sm"
                >
                  {t('changePassword.backToEmail')}
                </button>
              </form>
            </>
          )}

          {/* Step 3: Change Password */}
          {mode === 'changePassword' && (
            <>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 rounded-full mb-4">
                  <Lock className="text-white" size={32} />
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">{t('changePassword.changePassword')}</h1>
                <p className="text-gray-600 mt-2 text-sm lg:text-base">{t('changePassword.changePasswordDescription')}</p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('changePassword.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      placeholder={t('changePassword.enterNewPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('changePassword.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                      placeholder={t('changePassword.confirmNewPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.loading') : t('changePassword.updatePassword')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('verifyOTP');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="w-full text-purple-600 font-semibold hover:text-purple-700 transition-colors text-sm"
                >
                  {t('changePassword.backToOTP')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

