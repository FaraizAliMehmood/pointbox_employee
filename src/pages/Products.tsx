import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Edit, Upload, Eye, AlertTriangle, X, Trash2 } from 'lucide-react';
import type { Product } from '../types';
import { employeeApiService } from '../services/apiService';

const Products = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    redeemPoints: 0,
    couponCode: '',
  });

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError('');
    try {
      console.log(user.companyId);
      const data = await employeeApiService.getProducts({companyId: user.companyId});
      console.log(data);
      // Map backend response to frontend Product type
      const mappedProducts: Product[] = data.map((product: any) => ({
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
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description,
        image: product.image,
        redeemPoints: product.redeemPoints || 0,
        couponCode: product.couponCode,
      });
      setImagePreview(product.image);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        image: '',
        redeemPoints: 0,
        couponCode: '',
      });
      setImagePreview('');
      setImageFile(null);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      image: '',
      redeemPoints: 0,
      couponCode: '',
    });
    setImagePreview('');
    setImageFile(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate that image is provided for new products
    if (!editingProduct && !imageFile) {
      setError('Please upload a product image');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingProduct) {
        // Update existing product
        if (imageFile) {
          // Update with new image
          await employeeApiService.updateProduct(editingProduct.id, {
            name: formData.name,
            description: formData.description,
            redeemPoints: formData.redeemPoints,
            couponCode: formData.couponCode,
          }, imageFile);
        } else {
          // Update without changing image
          await employeeApiService.updateProduct(editingProduct.id, {
            name: formData.name,
            description: formData.description,
            redeemPoints: formData.redeemPoints,
            couponCode: formData.couponCode,
          });
        }
      } else {
        // Create new product
        if (!imageFile) {
          setError('Please upload a product image');
          setLoading(false);
          return;
        }
        await employeeApiService.createProduct({
          name: formData.name,
          description: formData.description,
          redeemPoints: formData.redeemPoints,
          couponCode: formData.couponCode,
          companyId: user.companyId
        }, imageFile);
      }

      await loadProducts();
      handleCloseModal();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (product: Product) => {
    setViewingProduct(product);
    setIsViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingProduct(null);
  };


  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setProductToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    setLoading(true);
    setError('');
    try {
      await employeeApiService.deleteProduct(productToDelete.id);
      await loadProducts();
      setIsDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      setError(err.message || 'Failed to delete product');
      setLoading(false);
    }
  };


  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">{t('products.title')}</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white rounded-lg hover:shadow-lg transition-all"
        >
          <Plus size={20} />
          {t('products.createProduct')}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('products.productImage')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('products.productName')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('products.productDescription')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  {t('products.redeemPoints') || 'Redeem Points'}
                </th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('products.couponCode')}</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">{t('customers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {t('common.loading')}
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-semibold">{product.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-700 max-w-xs">
                      <p className="truncate" title={product.description}>{product.description}</p>
                    </td>
                    
                    <td className="py-3 px-4 text-sm text-gray-700">
                      <span className="text-indigo-600 font-bold">
                        {product.redeemPoints !== undefined ? product.redeemPoints : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-700 font-mono">{product.couponCode}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(product)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              {t('common.loading')}
            </div>
          ) : products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex gap-4 mb-3">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                      No Image
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-3">
                 
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {t('products.redeemPoints') || 'Redeem Points'}:
                    </span>
                    <span className="text-indigo-600 font-bold">
                      {product.redeemPoints !== undefined ? product.redeemPoints : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('products.couponCode')}:</span>
                    <span className="text-gray-800 font-mono">{product.couponCode}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleView(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Eye size={16} />
                    View
                  </button>
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit size={16} />
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDeleteClick(product)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={16} />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t('common.noData')}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {editingProduct ? t('products.editProduct') : t('products.createProduct')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productDescription')}
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productImage')}
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                    <Upload size={18} />
                    {t('products.uploadImage')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-lg" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.redeemPoints') || 'Redeem Points'}
                </label>
                <input
                  type="text"
                  value={formData.redeemPoints}
                  onChange={(e) => {
                    const value = e.target.value;
                    const numValue = value === '' ? 0 : Number(value);
                    if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
                      setFormData({ ...formData, redeemPoints: numValue || 0 });
                    }
                  }}
                  min="0"
                  step="1"
                  placeholder="Enter redeem points"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.couponCode')}
                </label>
                <input
                  type="text"
                  value={formData.couponCode}
                  onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? t('common.loading') : t('common.save')}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && viewingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 my-8">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-800">{viewingProduct.name}</h2>
              <button
                onClick={handleCloseViewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productImage')}
                </label>
                {viewingProduct.image ? (
                  <img src={viewingProduct.image} alt={viewingProduct.name} className="w-full h-64 object-cover rounded-lg border border-gray-200" />
                ) : (
                  <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                    No Image Available
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.productDescription')}
                </label>
                <p className="text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {viewingProduct.description}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.redeemPoints') || 'Redeem Points'}
                </label>
                <p className="text-indigo-600 font-bold text-lg bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {viewingProduct.redeemPoints !== undefined ? viewingProduct.redeemPoints : '-'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('products.couponCode')}
                </label>
                <p className="text-gray-800 font-mono bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {viewingProduct.couponCode}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleCloseViewModal();
                    handleOpenModal(viewingProduct);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
                >
                  <Edit size={18} />
                  {t('common.edit')}
                </button>
                <button
                  onClick={handleCloseViewModal}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && productToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  {t('common.confirmDelete')}
                </h3>
                <p className="text-gray-600">
                  Are you sure you want to delete <span className="font-semibold text-gray-800">"{productToDelete.name}"</span>? This action cannot be undone.
                </p>
              </div>
              <button
                onClick={handleDeleteCancel}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleDeleteCancel}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.loading') : t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;

