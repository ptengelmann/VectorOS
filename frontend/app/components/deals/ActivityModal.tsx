/**
 * Activity Modal Component
 * Modal for creating and editing activities (emails, calls, meetings, notes)
 */

'use client';

import { useState, useEffect } from 'react';
import { Activity, CreateActivityData } from '@/lib/api-client';

interface ActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (activity: CreateActivityData) => Promise<void>;
  activity?: Activity; // If provided, modal is in edit mode
  dealId: string;
}

export default function ActivityModal({
  isOpen,
  onClose,
  onSave,
  activity,
  dealId,
}: ActivityModalProps) {
  const [formData, setFormData] = useState<CreateActivityData>({
    type: 'note',
    subject: '',
    content: '',
    scheduledAt: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const isEditMode = !!activity;

  // Initialize form data when activity changes
  useEffect(() => {
    if (activity) {
      setFormData({
        type: activity.type,
        subject: activity.subject || '',
        content: activity.content || '',
        scheduledAt: activity.scheduledAt
          ? new Date(activity.scheduledAt).toISOString().slice(0, 16)
          : undefined,
      });
    } else {
      // Reset form for create mode
      setFormData({
        type: 'note',
        subject: '',
        content: '',
        scheduledAt: undefined,
      });
    }
    setErrors({});
  }, [activity, isOpen]);

  const activityTypes = [
    {
      value: 'email',
      label: 'Email',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      value: 'call',
      label: 'Call',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
        </svg>
      )
    },
    {
      value: 'meeting',
      label: 'Meeting',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      value: 'note',
      label: 'Note',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Activity type is required';
    }

    if (formData.type !== 'note' && !formData.subject) {
      newErrors.subject = 'Subject is required for this activity type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Convert scheduledAt to ISO string if it exists
      const activityData: CreateActivityData = {
        ...formData,
        scheduledAt: formData.scheduledAt
          ? new Date(formData.scheduledAt).toISOString()
          : undefined,
      };

      await onSave(activityData);
      onClose();
    } catch (error) {
      console.error('Error saving activity:', error);
      setErrors({ submit: 'Failed to save activity. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    field: keyof CreateActivityData,
    value: string | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-normal text-gray-900">
            {isEditMode ? 'Edit Activity' : 'New Activity'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-light text-gray-700 mb-2">
              Activity Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('type', type.value)}
                  className={`p-4 rounded-lg border transition-all flex flex-col items-center gap-2 ${
                    formData.type === type.value
                      ? 'border-peach-500 bg-peach-50 text-peach-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {type.icon}
                  <div className="text-xs font-light">
                    {type.label}
                  </div>
                </button>
              ))}
            </div>
            {errors.type && (
              <p className="mt-1 text-sm text-red-600">{errors.type}</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-light text-gray-700 mb-2"
            >
              Subject
              {formData.type !== 'note' && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            <input
              type="text"
              id="subject"
              value={formData.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              placeholder="Enter subject..."
              className={`w-full px-4 py-2.5 border rounded-lg font-light text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all ${
                errors.subject ? 'border-red-500' : 'border-gray-200'
              }`}
            />
            {errors.subject && (
              <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-light text-gray-700 mb-2"
            >
              Details
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Add notes, details, or outcomes..."
              rows={5}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-light text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Scheduled Date/Time */}
          <div>
            <label
              htmlFor="scheduledAt"
              className="block text-sm font-light text-gray-700 mb-2"
            >
              Schedule For
            </label>
            <input
              type="datetime-local"
              id="scheduledAt"
              value={
                formData.scheduledAt
                  ? typeof formData.scheduledAt === 'string'
                    ? formData.scheduledAt
                    : new Date(formData.scheduledAt).toISOString().slice(0, 16)
                  : ''
              }
              onChange={(e) =>
                handleChange('scheduledAt', e.target.value || undefined)
              }
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg font-light text-gray-900 focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all"
            />
            <p className="mt-1 text-xs font-light text-gray-500">
              Leave empty to log as completed now
            </p>
          </div>

          {/* Error message */}
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-light text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-light text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-peach-500 text-white rounded-lg text-sm font-light hover:bg-peach-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>{isEditMode ? 'Update Activity' : 'Create Activity'}</>
              )}
            </button>
          </div>
        </form>
        </div>
      </div>
    </>
  );
}
