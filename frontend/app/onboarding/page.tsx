'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { apiClient } from '@/lib/api-client';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  // Redirect if user is not authenticated or already has a workspace
  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/sign-in');
      return;
    }

    // Check if user already has a workspace set up
    if (isLoaded && user) {
      const workspaceId = localStorage.getItem('currentWorkspaceId');
      if (workspaceId) {
        console.log('[Onboarding] User already has workspace, redirecting to dashboard');
        router.push('/dashboard');
      }
    }
  }, [isLoaded, user, router]);

  const handleCreateWorkspace = async () => {
    if (!user) {
      setError('You must be signed in to create a workspace');
      return;
    }

    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userId = user.id; // Use Clerk user ID
      const userName = user.fullName || user.firstName || 'User';
      const userEmail = user.primaryEmailAddress?.emailAddress || '';

      console.log('[Onboarding] Creating workspace with:', { userId, userName, userEmail, workspaceName });

      const result = await apiClient.createWorkspace(
        userId,
        { name: workspaceName },
        userName,
        userEmail
      );

      console.log('[Onboarding] Workspace creation result:', result);

      if (result.success && result.data) {
        const workspaceId = result.data.id;

        console.log('[Onboarding] Workspace created:', result.data);
        console.log('[Onboarding] Storing workspace ID:', workspaceId);

        if (!workspaceId) {
          console.error('[Onboarding] No workspace ID in response!', result);
          setError('Failed to create workspace: No ID returned');
          return;
        }

        // Store workspace ID and user info in localStorage
        localStorage.setItem('currentWorkspaceId', workspaceId);
        localStorage.setItem('currentUserId', userId);
        localStorage.setItem('currentUserEmail', userEmail);
        localStorage.setItem('currentUserName', userName);

        console.log('[Onboarding] localStorage set, redirecting to dashboard');

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        console.error('[Onboarding] Workspace creation failed:', result);
        setError(result.error?.message || 'Failed to create workspace');
      }
    } catch (err) {
      console.error('[Onboarding] Workspace creation error:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while Clerk loads
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-peach-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, useEffect will redirect to sign-in
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 bg-peach-500 rounded-xl" />
          <span className="text-2xl font-light tracking-tight text-gray-900">VectorOS</span>
        </div>

        {/* Onboarding Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          {/* User Info Display */}
          <div className="mb-8 pb-6 border-b border-gray-100">
            <h1 className="text-3xl font-light text-gray-900 mb-2">
              Welcome, {user.firstName || 'there'}!
            </h1>
            <p className="text-sm font-light text-gray-600 mb-4">
              Let's create your first workspace to get started
            </p>
            <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg">
              <div className="w-10 h-10 bg-peach-500 rounded-full flex items-center justify-center text-white font-medium">
                {(user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0] || 'U').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {user.fullName || user.firstName || 'User'}
                </p>
                <p className="text-xs font-light text-gray-600">
                  {user.primaryEmailAddress?.emailAddress || 'No email'}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-light">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-light text-gray-700 mb-2">
                Workspace Name *
              </label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                  setError('');
                }}
                placeholder="My Company"
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent transition-all"
                required
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !loading) {
                    handleCreateWorkspace();
                  }
                }}
              />
              <p className="mt-2 text-xs font-light text-gray-500">
                A workspace is where your team collaborates on deals
              </p>
            </div>

            <button
              onClick={handleCreateWorkspace}
              disabled={loading}
              className="w-full py-3 bg-peach-500 hover:bg-peach-600 text-white font-light rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating workspace...' : 'Create Workspace'}
            </button>
          </div>

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
                  <p className="text-xs font-light text-gray-500">VectorOS Intelligence</p>
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
