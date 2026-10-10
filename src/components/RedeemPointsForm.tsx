import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { Upload, X } from 'lucide-react';
import type { Customer, Product } from '../types';

export type RedeemFormData = {
  invoiceNumber: string;
  companyId: string;
  type: 'earn' | 'redeem';
  redeem_points: string;
  date: string;
  time: string;
  invoiceImage: File | null;
  notes: string;
};

interface RedeemPointsFormProps {
  title: string;
  customer: Customer;
  formData: RedeemFormData;
  setFormData: Dispatch<SetStateAction<RedeemFormData>>;
  submitError: string;
  submitting: boolean;
  selectedProductId: string;
  products: Product[];
  loadingProducts: boolean;
  handleTypeChange: (type: 'earn' | 'redeem') => void;
  handleProductChange: (productId: string) => void;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  invoicePreview: string | null;
  setInvoicePreview: Dispatch<SetStateAction<string | null>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  t: (key: string) => string;
  headerAction?: ReactNode;
  infoBanner?: ReactNode;
  children?: ReactNode;
}

const RedeemPointsForm = ({
  title,
  customer,
  formData,
  setFormData,
  submitError,
  submitting,
  selectedProductId,
  products,
  loadingProducts,
  handleTypeChange,
  handleProductChange,
  handleImageUpload,
  invoicePreview,
  setInvoicePreview,
  onSubmit,
  onCancel,
  t,
  headerAction,
  infoBanner,
  children,
}: RedeemPointsFormProps) => {
  return (
    <form onSubmit={onSubmit} className="relative bg-white rounded-lg shadow-md p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        {headerAction}
      </div>

      {infoBanner}

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
          onClick={onCancel}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all"
        >
          {t('redeemPoints.cancel')}
        </button>
      </div>

      {children}
    </form>
  );
};

export default RedeemPointsForm;
