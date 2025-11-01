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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 bg-peach-500 rounded-xl" />
          <span className="text-2xl font-light tracking-tight text-gray-900">VectorOS</span>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-light text-gray-600">Step {step} of 2</span>
            <span className="text-sm font-light text-gray-600">{step === 1 ? 'Account Info' : 'Workspace Setup'}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-peach-500 transition-all duration-300"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          <div className="mb-8">
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Welcome to VectorOS
            </h1>
            <p className="text-sm font-light text-gray-600">
              {step === 1
                ? "Let's start by setting up your account"
                : "Now create your first workspace"}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-light">{error}</p>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={formData.userName}
                  onChange={(e) => handleInputChange('userName', e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.userEmail}
                  onChange={(e) => handleInputChange('userEmail', e.target.value)}
                  placeholder="john@company.com"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all"
                  required
                />
                <p className="mt-2 text-xs font-light text-gray-500">
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
                className="w-full py-3 bg-peach-500 hover:bg-peach-600 text-white font-light rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-light text-gray-700 mb-2">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={formData.workspaceName}
                  onChange={(e) => handleInputChange('workspaceName', e.target.value)}
                  placeholder="My Company"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all"
                  required
                />
                <p className="mt-2 text-xs font-light text-gray-500">
                  A workspace is where your team collaborates on deals
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-light rounded-lg transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={loading}
                  className="flex-1 py-3 bg-peach-500 hover:bg-peach-600 text-white font-light rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </div>
          )}

          {/* Features Preview */}
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-sm font-light text-gray-600 mb-4">What you'll get:</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-peach-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-normal text-gray-900">AI-Powered Insights</p>
                  <p className="text-xs font-light text-gray-500">Claude Sonnet 4.5 analysis</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-peach-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-normal text-gray-900">Proactive Automation</p>
                  <p className="text-xs font-light text-gray-500">Smart workflow management</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-peach-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-normal text-gray-900">Real-time Tracking</p>
                  <p className="text-xs font-light text-gray-500">Live pipeline updates</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-peach-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-normal text-gray-900">Intelligent Scoring</p>
                  <p className="text-xs font-light text-gray-500">Automated deal prioritization</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm font-light text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
