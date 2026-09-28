import { useState, useEffect, useRef } from 'react';
import { Plus, Edit, X, Upload, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { Banner } from '../types';
import { employeeApiService } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
const Banners = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBannerId, setDeletingBannerId] = useState<string | null>(null);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [viewingBanner, setViewingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    badge: '',
    title: '',
    description: '',
    imageUrl: '',
    productUrl: '',
    points: '',
    startDate: '',
    endDate: '',
    isActive: true,
    type: 'regular' as 'regular' | 'special_event',
    language: 'en' as 'en' | 'ar',
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      loadBanners();
    }
  }, [user]);


  const loadBanners = async () => {
    try {

      if (!user) return;
      setLoading(true);
      const response = await employeeApiService.getBanners({companyId: user.companyId});
      if (response && Array.isArray(response)) {
        const mappedBanners: Banner[] = response
          .filter((b: any) => b && (b._id || b.id) && b.title !== undefined)
          .map((b: any) => ({
            id: b._id || b.id,
            badge: b.badge || '',
            title: b.title || 'Untitled',
            description: b.description || '',
            imageUrl: b.image || b.imageUrl || '',
            link: b.link || '',
            productUrl: b.productUrl || '',
            points: b.points || 0,
            isActive: b.isActive !== false,
            type: b.type || 'special_event',
            language: b.language || 'en',
            startDate: b.startDate || '',
            endDate: b.endDate || '',
            createdAt: b.createdAt || new Date().toISOString(),
          }));
          console.log(mappedBanners);
        setBanners(mappedBanners);
      } else {
        console.error('Invalid response structure:', response);
        setBanners([]);
      }
    } catch (error: any) {
      console.error('Error loading banners:', error);
      alert(error.message || 'Failed to load banners. Please try again.');
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, or GIF)');
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setUploadedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);
    
    try {
      if (editingBanner) {
        // Update banner - file is optional for updates
        if (!user || !user.companyId) {
          alert('User information is missing. Please log in again.');
          setSubmitting(false);
          return;
        }
        
        const formDataToSend = new FormData();
        
        // Always append all fields, even if empty, to ensure backend receives them
        formDataToSend.append('badge', formData.badge || '');
        formDataToSend.append('title', formData.title || '');
        formDataToSend.append('description', formData.description || '');
        formDataToSend.append('productUrl', formData.productUrl || '');
        formDataToSend.append('points', formData.points || '0');
        formDataToSend.append('type', formData.type || 'regular');
        formDataToSend.append('language', formData.language || 'en');
        formDataToSend.append('startDate', formData.startDate || '');
        formDataToSend.append('endDate', formData.endDate || '');
        formDataToSend.append('isActive', formData.isActive.toString());
        formDataToSend.append('createdBy', user.companyId);
        
        // Only append file if a new one was selected
        if (uploadedFile) {
          formDataToSend.append('image', uploadedFile);
        }

        // Log the FormData for debugging
        console.log('Updating banner with data:', {
          id: editingBanner.id,
          title: formData.title,
          points: formData.points,
          type: formData.type,
          isActive: formData.isActive,
          hasNewImage: !!uploadedFile
        });

        const response = await employeeApiService.updateBanner(editingBanner.id, formDataToSend);
        console.log('Update response:', response);
        await loadBanners();
        setShowModal(false);
        setEditingBanner(null);
        setFormData({ badge: '', title: '', description: '', imageUrl: '', productUrl: '', points: '', isActive: true, type: 'regular', language: 'en', startDate: '', endDate: '' });
        setImagePreview('');
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Create banner - requires file upload
        if (!uploadedFile) {
          alert('Please upload an image file');
          setSubmitting(false);
          return;
        }

        if (!user || !user.id) {
          alert('User information is missing. Please log in again.');
          setSubmitting(false);
          return;
        }
        
        // Debug logging
        console.log('User object:', user);
        console.log('User companyId:', user.companyId);
        console.log('User companyId type:', typeof user.companyId);
        
        if (!user.companyId) {
          alert('Company ID is missing. Please log in again.');
          setSubmitting(false);
          return;
        }
        
        const formDataToSend = new FormData();
        formDataToSend.append('image', uploadedFile);
        formDataToSend.append('badge', formData.badge);
        formDataToSend.append('title', formData.title);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('productUrl', formData.productUrl);
        formDataToSend.append('points', formData.points || '0');
        formDataToSend.append('type', formData.type);
        formDataToSend.append('language', formData.language);
        formDataToSend.append('startDate', formData.startDate);
        formDataToSend.append('endDate', formData.endDate);
        formDataToSend.append('isActive', formData.isActive.toString());
        formDataToSend.append('createdBy', user.companyId);
        
        // Debug: Log all FormData entries
        console.log('FormData entries:');
        for (const [key, value] of formDataToSend.entries()) {
          console.log(`${key}:`, value);
        }
        
        await employeeApiService.uploadBanner(formDataToSend);
        await loadBanners();
        setShowModal(false);
        setFormData({ badge: '', title: '', description: '', imageUrl: '', productUrl: '', points: '', isActive: true, type: 'regular', language: 'en', startDate: '', endDate: '' });
        setImagePreview('');
        setUploadedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      console.error('Error saving banner:', error);
      alert(error.message || 'Failed to save banner. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (banner: Banner) => {
    setViewingBanner(banner);
    setShowViewModal(true);
  };

  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      badge: banner.badge || '',
      title: banner.title,
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      productUrl: banner.productUrl || '',
      points: banner.points?.toString() || '',
      isActive: banner.isActive,
      type: banner.type || 'regular',
      language: banner.language || 'en',
      startDate: banner.startDate || '',
      endDate: banner.endDate || '',
    });
    setImagePreview(banner.imageUrl);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowModal(true);
  };


  const handleDeleteConfirm = async () => {
    if (!deletingBannerId) return;
    
    setDeleting(true);
    try {
      await employeeApiService.deleteBanner(deletingBannerId);
      await loadBanners();
      setShowDeleteModal(false);
      setDeletingBannerId(null);
    } catch (error) {
      console.error('Error deleting banner:', error);
      alert('Failed to delete banner. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeletingBannerId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">{t('banners.title')}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingBanner(null);
              setFormData({ badge: '', title: '', description: '', imageUrl: '', productUrl: '', points: '', isActive: true, type: 'regular', language: 'en', startDate: '', endDate: '' });
              setImagePreview('');
              setUploadedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg hover:shadow-lg transition-all"
          >
            <Plus size={20} />
            {t('banners.createBanner')}
          </button>
       
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Link</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                banners
                  .filter((banner) => banner && banner.id)
                  .map((banner) => (
                  <tr key={banner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="w-20 h-16 bg-gray-200 rounded-lg overflow-hidden">
                        {banner.imageUrl ? (
                          <img
                            src={banner.imageUrl}
                            alt={banner.title || 'Banner'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x64?text=Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            No Image
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {banner.title || 'Untitled'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          banner.type === 'special_event'
                            ? 'bg-pink-100 text-pink-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {banner.type === 'special_event' ? t('banners.specialEvent') : t('banners.regular')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {banner.points || 0}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {banner.productUrl ? (
                        <a
                          href={banner.productUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-xs block"
                        >
                          {banner.productUrl}
                        </a>
                      ) : (
                        <span className="text-gray-400">No link</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {banner.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(banner)}
                          className="text-green-600 hover:text-green-800"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        {/* <button
                          onClick={() => handleDeleteClick(banner.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {banners.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</div>
          ) : (
            banners
              .filter((banner) => banner && banner.id)
              .map((banner) => (
              <div key={banner.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4 mb-3">
                  <div className="w-24 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title || 'Banner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/96x80?text=Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 mb-1">{banner.title || 'Untitled'}</h3>
                    <span
                      className={`inline-block mb-2 px-2 py-1 rounded-full text-xs font-medium ${
                        banner.type === 'special_event'
                          ? 'bg-pink-100 text-pink-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {banner.type === 'special_event' ? t('banners.specialEvent') : t('banners.regular')}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">Points: {banner.points || 0}</p>
                    {banner.link ? (
                      <a
                        href={banner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline truncate block mt-1"
                      >
                        {banner.link}
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400 mt-1">No link</p>
                    )}
                    <span
                      className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${
                        banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {banner.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(banner)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  {/* <button
                    onClick={() => handleDeleteClick(banner.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button> */}
                </div>
              </div>
              ))
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingBanner 
                  ? t('banners.editBanner') 
                  : formData.type === 'special_event' 
                    ? t('banners.createSpecialEvent') 
                    : t('banners.createBanner')}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBanner(null);
                  setFormData({ badge: '', title: '', description: '', imageUrl: '', productUrl: '', points: '', isActive: true, type: 'regular', language: 'en', startDate: '', endDate: '' });
                  setImagePreview('');
                  setUploadedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                <input
                  type="text"
                  value={formData.badge}
                  onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Enter badge text (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.bannerTitle')}</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Enter description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.bannerType')}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'regular' | 'special_event' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="regular">{t('banners.regular')}</option>
                  <option value="special_event">{t('banners.specialEvent')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.language')}</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value as 'en' | 'ar' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="en">{t('banners.english')}</option>
                  <option value="ar">{t('banners.arabic')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Enter points (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.startDate')}</label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.endDate')}</label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product URL</label>
                <input
                  type="url"
                  value={formData.productUrl}
                  onChange={(e) => setFormData({ ...formData, productUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Enter product URL (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('banners.imageUrl')} {!editingBanner && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif"
                    onChange={handleFileChange}
                    className="hidden"
                    id="banner-image-upload"
                  />
                  <label
                    htmlFor="banner-image-upload"
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500 hover:bg-purple-50 transition-all"
                  >
                    <ImageIcon size={20} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {uploadedFile ? uploadedFile.name : editingBanner ? 'Click to change image (optional)' : 'Click to upload image'}
                    </span>
                  </label>
                  {uploadedFile && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        if (!editingBanner) {
                          setImagePreview('');
                        } else {
                          setImagePreview(formData.imageUrl);
                        }
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Supported formats: JPG, PNG, GIF (Max 5MB)</p>
              </div>
            
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('banners.isActive')}</span>
                </label>
              </div>
              {(imagePreview || (editingBanner && formData.imageUrl)) && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                  <img
                    src={imagePreview || formData.imageUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {editingBanner ? 'Updating...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      {t('banners.upload')}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBanner(null);
                    setFormData({ badge: '', title: '', description: '', imageUrl: '', productUrl: '', points: '', isActive: true, type: 'regular', language: 'en', startDate: '', endDate: '' });
                    setImagePreview('');
                    setUploadedFile(null);
                    setSubmitting(false);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showViewModal && viewingBanner && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Banner Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {viewingBanner.badge && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Badge</label>
                  <p className="text-gray-900">{viewingBanner.badge}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('banners.bannerTitle')}</label>
                <p className="text-gray-900">{viewingBanner.title || 'Untitled'}</p>
              </div>
              {viewingBanner.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <p className="text-gray-900 whitespace-pre-wrap">{viewingBanner.description}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                <p className="text-gray-900">{viewingBanner.points || 0}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                <div className="w-full max-w-md">
                  {viewingBanner.imageUrl ? (
                    <img
                      src={viewingBanner.imageUrl}
                      alt={viewingBanner.title || 'Banner'}
                      className="w-full h-auto rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x200?text=Banner+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
              </div>
           
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('banners.bannerType')}</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  viewingBanner.type === 'special_event'
                    ? 'bg-pink-100 text-pink-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {viewingBanner.type === 'special_event' ? t('banners.specialEvent') : t('banners.regular')}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('banners.language')}</label>
                <p className="text-gray-900">{viewingBanner.language === 'ar' ? t('banners.arabic') : t('banners.english')}</p>
              </div>
              {viewingBanner.startDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('banners.startDate')}</label>
                  <p className="text-gray-900">{new Date(viewingBanner.startDate).toLocaleString()}</p>
                </div>
              )}
              {viewingBanner.endDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('banners.endDate')}</label>
                  <p className="text-gray-900">{new Date(viewingBanner.endDate).toLocaleString()}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  viewingBanner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {viewingBanner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
                <p className="text-gray-900">{new Date(viewingBanner.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEdit(viewingBanner);
                  }}
                  className="flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  Edit Banner
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Delete Banner</h2>
              <button
                onClick={handleDeleteCancel}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete this banner? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Banners;

