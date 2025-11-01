/**
 * Deal Edit Modal
 * Slide-out panel for editing deal details with form validation
 */

'use client';

import { useState, useEffect } from 'react';
import { Deal } from '@/lib/api-client';

interface DealEditModalProps {
  deal: Deal | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dealId: string, updates: Partial<Deal>) => Promise<void>;
}

const STAGES = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

export default function DealEditModal({ deal, isOpen, onClose, onSave }: DealEditModalProps) {
  const [formData, setFormData] = useState<Partial<Deal>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Reset form when deal changes
  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        probability: deal.probability || 50,
        contactName: deal.contactName || '',
        contactEmail: deal.contactEmail || '',
        company: deal.company || '',
        closeDate: deal.closeDate ? new Date(deal.closeDate).toISOString().split('T')[0] : '',
      });
      setErrors({});
    }
  }, [deal]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.value === undefined || formData.value === null || formData.value < 0) {
      newErrors.value = 'Value must be a positive number';
    }

    if (formData.probability !== undefined && (formData.probability < 0 || formData.probability > 100)) {
      newErrors.probability = 'Probability must be between 0 and 100';
    }

    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deal || !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      // Convert closeDate string back to Date if present
      const updates = { ...formData };
      if (updates.closeDate) {
        updates.closeDate = new Date(updates.closeDate).toISOString();
      }

      await onSave(deal.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to save deal:', error);
      setErrors({ submit: 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof Deal, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen || !deal) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-50 overflow-y-auto">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header */}
          <div className="px-8 py-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-normal text-gray-900">Edit Deal</h2>
                <p className="mt-1 text-sm font-light text-gray-500">
                  Update deal information and track progress
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 px-8 py-6 space-y-6 overflow-y-auto">
            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-light text-red-700">{errors.submit}</p>
              </div>
            )}

            {/* Deal Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-normal text-gray-900 mb-2">
                Deal Title *
              </label>
              <input
                id="title"
                type="text"
                value={formData.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className={`w-full px-4 py-2.5 border rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                  errors.title
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-200 focus:ring-peach-200 focus:border-peach-500'
                }`}
                placeholder="Enterprise SaaS Deal - Acme Corp"
              />
              {errors.title && (
                <p className="mt-1 text-xs font-light text-red-600">{errors.title}</p>
              )}
            </div>

            {/* Value & Probability */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="value" className="block text-sm font-normal text-gray-900 mb-2">
                  Deal Value ($) *
                </label>
                <input
                  id="value"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.value || ''}
                  onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                  className={`w-full px-4 py-2.5 border rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.value
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-peach-200 focus:border-peach-500'
                  }`}
                  placeholder="150000"
                />
                {errors.value && (
                  <p className="mt-1 text-xs font-light text-red-600">{errors.value}</p>
                )}
              </div>

              <div>
                <label htmlFor="probability" className="block text-sm font-normal text-gray-900 mb-2">
                  Probability (%)
                </label>
                <input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability || ''}
                  onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
                  className={`w-full px-4 py-2.5 border rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.probability
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-peach-200 focus:border-peach-500'
                  }`}
                  placeholder="65"
                />
                {errors.probability && (
                  <p className="mt-1 text-xs font-light text-red-600">{errors.probability}</p>
                )}
              </div>
            </div>

            {/* Stage & Close Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="stage" className="block text-sm font-normal text-gray-900 mb-2">
                  Stage
                </label>
                <select
                  id="stage"
                  value={formData.stage || ''}
                  onChange={(e) => handleChange('stage', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-light text-gray-900 focus:outline-none focus:ring-2 focus:ring-peach-200 focus:border-peach-500 transition-all"
                >
                  {STAGES.map((stage) => (
                    <option key={stage.value} value={stage.value}>
                      {stage.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="closeDate" className="block text-sm font-normal text-gray-900 mb-2">
                  Expected Close Date
                </label>
                <input
                  id="closeDate"
                  type="date"
                  value={formData.closeDate || ''}
                  onChange={(e) => handleChange('closeDate', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-light text-gray-900 focus:outline-none focus:ring-2 focus:ring-peach-200 focus:border-peach-500 transition-all"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-lg font-normal text-gray-900 mb-4">Contact Information</h3>
            </div>

            {/* Company */}
            <div>
              <label htmlFor="company" className="block text-sm font-normal text-gray-900 mb-2">
                Company
              </label>
              <input
                id="company"
                type="text"
                value={formData.company || ''}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-peach-200 focus:border-peach-500 transition-all"
                placeholder="Acme Corporation"
              />
            </div>

            {/* Contact Name & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="contactName" className="block text-sm font-normal text-gray-900 mb-2">
                  Contact Name
                </label>
                <input
                  id="contactName"
                  type="text"
                  value={formData.contactName || ''}
                  onChange={(e) => handleChange('contactName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-peach-200 focus:border-peach-500 transition-all"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label htmlFor="contactEmail" className="block text-sm font-normal text-gray-900 mb-2">
                  Contact Email
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail || ''}
                  onChange={(e) => handleChange('contactEmail', e.target.value)}
                  className={`w-full px-4 py-2.5 border rounded-xl font-light text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.contactEmail
                      ? 'border-red-300 focus:ring-red-200'
                      : 'border-gray-200 focus:ring-peach-200 focus:border-peach-500'
                  }`}
                  placeholder="john@acme.com"
                />
                {errors.contactEmail && (
                  <p className="mt-1 text-xs font-light text-red-600">{errors.contactEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2.5 text-sm font-light text-gray-700 hover:text-gray-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-peach-500 text-white text-sm font-light rounded-xl hover:bg-peach-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
