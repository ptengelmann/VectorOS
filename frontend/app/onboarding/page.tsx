'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    workspaceName: '',
    userName: '',
    userEmail: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleCreateWorkspace = async () => {
    if (!formData.workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    if (!formData.userEmail.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For demo, use email as userId (in production, use proper auth)
      const userId = formData.userEmail;

      const result = await apiClient.createWorkspace(
        userId,
        { name: formData.workspaceName },
        formData.userName
      );

      if (result.success && result.data) {
        // Store workspace ID and user email in localStorage for demo
        localStorage.setItem('currentWorkspaceId', result.data.id);
        localStorage.setItem('currentUserId', userId);
        localStorage.setItem('currentUserEmail', formData.userEmail);
        localStorage.setItem('currentUserName', formData.userName || 'User');

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(result.error?.message || 'Failed to create workspace');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Workspace creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Step {step} of 2</span>
            <span className="text-sm text-gray-400">{step === 1 ? 'Account Info' : 'Workspace Setup'}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome to VectorOS
            </h1>
            <p className="text-gray-400">
              {step === 1
                ? "Let's start by setting up your account"
                : "Now create your first workspace"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => handleInputChange('userName', e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => handleInputChange('userEmail', e.target.value)}
                  placeholder="john@company.com"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  We'll use this to identify your account
                </p>
              </div>

              <button
                onClick={() => {
                  if (!formData.userEmail.trim()) {
                    setError('Email is required');
                    return;
                  }
                  setStep(2);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={formData.workspaceName}
                  onChange={(e) => handleInputChange('workspaceName', e.target.value)}
                  placeholder="My Company"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  A workspace is where your team collaborates on deals
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>
          )}

          {/* Features Preview */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <p className="text-sm text-gray-500 mb-4">What you'll get:</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">AI-Powered Insights</p>
                  <p className="text-xs text-gray-500">Claude 3.5 Sonnet analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-300">Real-time Tracking</p>
                  <p className="text-xs text-gray-500">Live pipeline updates</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
