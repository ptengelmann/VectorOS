/**
 * VectorOS Deals Management
 * Enterprise-ready deal pipeline with table/grid views and advanced filters
 */

'use client';

import { useEffect, useState, Fragment } from 'react';
import { apiClient, type Deal, type DealScore, type DealAnalysis, type Activity, type CreateActivityData } from '@/lib/api-client';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import HealthScoreBadge, { HealthScoreIndicator } from '../components/deals/HealthScoreBadge';
import DealEditModal from '../components/deals/DealEditModal';
import DealAnalysisModal from '../components/deals/DealAnalysisModal';
import ActivityTimeline from '../components/deals/ActivityTimeline';
import ActivityModal from '../components/deals/ActivityModal';

type ViewMode = 'table' | 'grid';
type FilterStage = 'all' | 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendHealth, setBackendHealth] = useState(false);
  const [aiHealth, setAIHealth] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filterStage, setFilterStage] = useState<FilterStage>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeal, setSelectedDeal] = useState<string | null>(null);
  const [dealScores, setDealScores] = useState<Record<string, DealScore>>({});
  const [scoringLoading, setScoringLoading] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [analyzingDeal, setAnalyzingDeal] = useState<Deal | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dealActivities, setDealActivities] = useState<Record<string, Activity[]>>({});
  const [loadingActivities, setLoadingActivities] = useState<Record<string, boolean>>({});
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityModalDealId, setActivityModalDealId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    console.log('[Deals] Checking workspace ID from localStorage:', storedWorkspaceId);

    // If no workspace, redirect to onboarding
    if (!storedWorkspaceId) {
      console.log('[Deals] No workspace found, redirecting to onboarding');
      window.location.href = '/onboarding';
      return;
    }

    console.log('[Deals] Setting workspace ID:', storedWorkspaceId);
    setWorkspaceId(storedWorkspaceId);
    checkSystemHealth();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    loadDeals();
  }, [workspaceId]);

  useEffect(() => {
    if (deals.length > 0 && aiHealth) {
      loadDealScores();
    }
  }, [deals, aiHealth]);

  const checkSystemHealth = async () => {
    const [backend, ai] = await Promise.all([
      apiClient.healthCheck(),
      apiClient.aiHealthCheck(),
    ]);
    setBackendHealth(backend);
    setAIHealth(ai);
  };

  const loadDeals = async () => {
    if (!workspaceId) {
      console.log('[Deals] No workspace ID, skipping load');
      return;
    }

    console.log('[Deals] Loading deals for workspace:', workspaceId);
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getDeals(workspaceId, 1, 100);
      console.log('[Deals] API response:', response);

      if (response.success && response.data) {
        // Handle nested data structure from API wrapper
        const items = response.data.data?.items || response.data.items || [];
        console.log('[Deals] Setting deals:', items.length, 'items');
        setDeals(items);
      } else {
        console.error('[Deals] API error:', response.error);
        setError(response.error?.message || 'Failed to load deals');
      }
    } catch (error) {
      console.error('[Deals] Exception:', error);
      setError('Failed to load deals');
    } finally {
      setLoading(false);
      console.log('[Deals] Loading complete');
    }
  };

  const loadDealScores = async () => {
    if (deals.length === 0) return;

    console.log('[DealScores] Starting to load scores for', deals.length, 'deals');
    setScoringLoading(true);

    try {
      console.log('[DealScores] Calling scoreWorkspaceDeals API...');
      const response = await apiClient.scoreWorkspaceDeals(deals);
      console.log('[DealScores] API response:', response);

      if (response.success && response.data) {
        // Convert array of scored deals into a map by deal_id
        const scoresMap: Record<string, DealScore> = {};
        response.data.scored_deals.forEach((scoredDeal) => {
          scoresMap[scoredDeal.deal_id] = {
            health_score: scoredDeal.health_score,
            health_status: scoredDeal.health_status as DealScore['health_status'],
            components: scoredDeal.components,
            insights: scoredDeal.insights,
          };
        });
        console.log('[DealScores] Scores loaded successfully:', Object.keys(scoresMap).length, 'deals scored');
        setDealScores(scoresMap);
      } else {
        console.error('[DealScores] API returned unsuccessful response:', response);
      }
    } catch (error) {
      console.error('[DealScores] Failed to load deal scores:', error);
      // Don't show error to user - scores are optional enhancement
    } finally {
      setScoringLoading(false);
    }
  };

  const handleEditDeal = (deal: Deal) => {
    setEditingDeal(deal);
    setIsEditModalOpen(true);
  };

  const handleSaveDeal = async (dealId: string, updates: Partial<Deal>) => {
    const response = await apiClient.updateDeal(dealId, updates);

    if (response.success && response.data) {
      // Update local state with the updated deal
      setDeals(prevDeals =>
        prevDeals.map(d => d.id === dealId ? { ...d, ...response.data } : d)
      );
    }
  };

  const handleCreateDeal = async (dealId: string, dealData: Partial<Deal>) => {
    if (!workspaceId) {
      console.error('[CreateDeal] No workspace ID available');
      alert('No workspace selected. Please refresh the page and try again.');
      return;
    }

    console.log('[CreateDeal] Creating deal with workspace:', workspaceId);
    const response = await apiClient.createDeal(workspaceId, dealData);

    if (response.success && response.data) {
      // Add new deal to the list
      setDeals(prevDeals => [response.data!, ...prevDeals]);
      setIsCreateModalOpen(false);
    } else {
      console.error('[CreateDeal] Failed:', response.error);
      alert(`Failed to create deal: ${response.error?.message || 'Unknown error'}`);
    }
  };

  const handleAnalyzeDeal = (deal: Deal) => {
    setAnalyzingDeal(deal);
    setIsAnalysisModalOpen(true);
  };

  const handleRunAnalysis = async (deal: Deal): Promise<DealAnalysis | null> => {
    try {
      const response = await apiClient.analyzeDealWithAI(deal, deals);

      if (response.success && response.data) {
        return response.data;
      } else {
        console.error('Analysis failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  };

  const loadActivities = async (dealId: string) => {
    if (dealActivities[dealId]) return; // Already loaded

    setLoadingActivities((prev) => ({ ...prev, [dealId]: true }));

    try {
      const response = await apiClient.getActivities(dealId);

      if (response.success && response.data) {
        const activities = response.data.items || [];
        setDealActivities((prev) => ({ ...prev, [dealId]: activities }));
      } else {
        console.error('Failed to load activities:', response.error);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoadingActivities((prev) => ({ ...prev, [dealId]: false }));
    }
  };

  const handleExpandDeal = (dealId: string) => {
    const isCurrentlySelected = selectedDeal === dealId;
    setSelectedDeal(isCurrentlySelected ? null : dealId);

    // Load activities when expanding a deal
    if (!isCurrentlySelected && !dealActivities[dealId]) {
      loadActivities(dealId);
    }
  };

  const handleAddActivity = (dealId: string) => {
    setActivityModalDealId(dealId);
    setEditingActivity(null);
    setIsActivityModalOpen(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setActivityModalDealId(activity.dealId);
    setEditingActivity(activity);
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (activityData: CreateActivityData) => {
    if (!activityModalDealId) return;

    try {
      if (editingActivity) {
        // Update existing activity
        const response = await apiClient.updateActivity(editingActivity.id, activityData);

        if (response.success && response.data) {
          // Update local state
          setDealActivities((prev) => ({
            ...prev,
            [activityModalDealId]: prev[activityModalDealId].map((a) =>
              a.id === editingActivity.id ? response.data! : a
            ),
          }));
        }
      } else {
        // Create new activity
        const response = await apiClient.createActivity(activityModalDealId, activityData);

        if (response.success && response.data) {
          // Add to local state
          setDealActivities((prev) => ({
            ...prev,
            [activityModalDealId]: [response.data!, ...(prev[activityModalDealId] || [])],
          }));
        }
      }
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('Are you sure you want to delete this activity?')) return;

    try {
      const response = await apiClient.deleteActivity(activityId);

      if (response.success) {
        // Remove from local state
        setDealActivities((prev) => {
          const newActivities = { ...prev };
          Object.keys(newActivities).forEach((dealId) => {
            newActivities[dealId] = newActivities[dealId].filter((a) => a.id !== activityId);
          });
          return newActivities;
        });
      }
    } catch (error) {
      console.error('Error deleting activity:', error);
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      const response = await apiClient.markActivityCompleted(activityId);

      if (response.success && response.data) {
        // Update local state
        setDealActivities((prev) => {
          const newActivities = { ...prev };
          Object.keys(newActivities).forEach((dealId) => {
            newActivities[dealId] = newActivities[dealId].map((a) =>
              a.id === activityId ? response.data! : a
            );
          });
          return newActivities;
        });
      }
    } catch (error) {
      console.error('Error completing activity:', error);
    }
  };

  const getFilteredDeals = () => {
    return deals
      .filter(d => filterStage === 'all' || d.stage === filterStage)
      .filter(d => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          d.title.toLowerCase().includes(query) ||
          d.company?.toLowerCase().includes(query) ||
          d.contactName?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      lead: 'bg-gray-100 text-gray-700',
      qualified: 'bg-blue-100 text-blue-700',
      proposal: 'bg-yellow-100 text-yellow-700',
      negotiation: 'bg-orange-100 text-orange-700',
      closed_won: 'bg-green-100 text-green-700',
      closed_lost: 'bg-red-100 text-red-700',
    };
    return colors[stage] || 'bg-gray-100 text-gray-700';
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      lead: 'Lead',
      qualified: 'Qualified',
      proposal: 'Proposal',
      negotiation: 'Negotiation',
      closed_won: 'Closed Won',
      closed_lost: 'Closed Lost',
    };
    return labels[stage] || stage;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader backendHealth={backendHealth} aiHealth={aiHealth} activePage="deals" />

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-light text-gray-900 mb-2">Deals</h1>
              <p className="text-sm font-light text-gray-600">
                Manage your sales pipeline and close more deals
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadDeals}
                disabled={loading}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-200 text-sm font-light rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                New Deal
              </button>
            </div>
          </div>

          {/* Filters & View Controls */}
          {deals.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                {/* Search */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search deals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm font-light focus:outline-none focus:ring-2 focus:ring-peach-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 text-xs font-light rounded transition-colors ${
                      viewMode === 'table'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1.5 text-xs font-light rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-light text-gray-500 uppercase tracking-wide">Stage:</span>
                <div className="flex items-center gap-1">
                  {(['all', 'lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'] as FilterStage[]).map((stage) => (
                    <button
                      key={stage}
                      onClick={() => setFilterStage(stage)}
                      className={`px-3 py-1 text-xs font-light rounded-full capitalize transition-colors ${
                        filterStage === stage
                          ? 'bg-peach-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {stage === 'all' ? 'All' : getStageLabel(stage)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Results Count */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm font-light text-gray-600">
                  Showing {getFilteredDeals().length} of {deals.length} deals
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 mb-6">
            <h3 className="text-lg font-normal text-red-900 mb-2">Error</h3>
            <p className="text-sm font-light text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && deals.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-peach-500 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-sm font-light text-gray-600">Loading deals...</p>
            </div>
          </div>
        ) : deals.length === 0 ? (
          // Empty State
          <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
            <div className="w-16 h-16 bg-peach-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-peach-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-light text-gray-900 mb-2">No deals yet</h3>
            <p className="text-sm font-light text-gray-600 mb-6">
              Create your first deal to start managing your pipeline
            </p>
            <button className="px-6 py-3 bg-peach-500 text-white text-sm font-light rounded-lg hover:bg-peach-600 transition-colors">
              Create Deal
            </button>
          </div>
        ) : viewMode === 'table' ? (
          // Table View
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[25%]">
                      Deal
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[12%]">
                      Value
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[13%]">
                      Stage
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[10%]">
                      Probability
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[10%]">
                      Health
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[13%]">
                      Close Date
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-light uppercase tracking-wide text-gray-500 w-[17%]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredDeals().map((deal) => {
                    const isSelected = selectedDeal === deal.id;

                    return (
                      <Fragment key={deal.id}>
                        <tr
                          onClick={() => handleExpandDeal(deal.id)}
                          className={`border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-gray-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <h3 className="text-sm font-normal text-gray-900 mb-1">{deal.title}</h3>
                              {deal.company && (
                                <p className="text-xs font-light text-gray-500">{deal.company}</p>
                              )}
                              {deal.contactName && (
                                <p className="text-xs font-light text-gray-500">{deal.contactName}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-normal text-gray-900">
                              {formatCurrency(deal.value)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-light ${
                              getStageColor(deal.stage)
                            }`}>
                              {getStageLabel(deal.stage)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-light text-gray-700">
                              {deal.probability ? `${Math.round(deal.probability)}%` : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {dealScores[deal.id] ? (
                              <HealthScoreIndicator
                                score={dealScores[deal.id].health_score}
                                status={dealScores[deal.id].health_status}
                              />
                            ) : scoringLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-300 rounded-full animate-pulse" />
                                <span className="text-xs font-light text-gray-400">Loading...</span>
                              </div>
                            ) : (
                              <span className="text-xs font-light text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-light text-gray-500">
                              {deal.closeDate
                                ? new Date(deal.closeDate).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditDeal(deal);
                                }}
                                className="px-3 py-1.5 text-gray-600 border border-gray-200 text-xs font-light rounded hover:bg-gray-50 transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAnalyzeDeal(deal);
                                }}
                                className="px-3 py-1.5 bg-peach-500 text-white text-xs font-light rounded hover:bg-peach-600 transition-colors"
                              >
                                Analyze
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isSelected && (
                          <tr key={`${deal.id}-expanded`} className="border-t border-gray-100">
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-gray-50 px-8 py-6">
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                  <div>
                                    <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-2">
                                      Contact Information
                                    </h4>
                                    <p className="text-sm font-light text-gray-700">
                                      {deal.contactEmail || 'No email'}
                                    </p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-light uppercase tracking-wide text-gray-500 mb-2">
                                      Created
                                    </h4>
                                    <p className="text-sm font-light text-gray-700">
                                      {new Date(deal.createdAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>

                                {/* Activities Section */}
                                <div className="border-t border-gray-200 pt-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-normal text-gray-900">Activities</h4>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddActivity(deal.id);
                                      }}
                                      className="px-3 py-1.5 bg-peach-500 text-white text-xs font-light rounded-lg hover:bg-peach-600 transition-colors flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      Add Activity
                                    </button>
                                  </div>

                                  <ActivityTimeline
                                    activities={dealActivities[deal.id] || []}
                                    loading={loadingActivities[deal.id]}
                                    onEdit={handleEditActivity}
                                    onDelete={handleDeleteActivity}
                                    onComplete={handleCompleteActivity}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          // Grid View
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getFilteredDeals().map((deal) => (
              <div
                key={deal.id}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-peach-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedDeal(selectedDeal === deal.id ? null : deal.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-normal text-gray-900 mb-1 truncate">{deal.title}</h3>
                    {deal.company && (
                      <p className="text-sm font-light text-gray-500">{deal.company}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-light flex-shrink-0 ml-2 ${
                    getStageColor(deal.stage)
                  }`}>
                    {getStageLabel(deal.stage)}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-light text-gray-500">Value</span>
                    <span className="text-sm font-normal text-gray-900">{formatCurrency(deal.value)}</span>
                  </div>
                  {deal.probability && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light text-gray-500">Probability</span>
                      <span className="text-sm font-light text-gray-700">{Math.round(deal.probability)}%</span>
                    </div>
                  )}
                  {dealScores[deal.id] && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light text-gray-500">Health Score</span>
                      <HealthScoreBadge
                        score={dealScores[deal.id].health_score}
                        status={dealScores[deal.id].health_status}
                        size="sm"
                      />
                    </div>
                  )}
                  {deal.closeDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-light text-gray-500">Close Date</span>
                      <span className="text-sm font-light text-gray-700">
                        {new Date(deal.closeDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditDeal(deal);
                    }}
                    className="flex-1 px-3 py-2 text-gray-600 border border-gray-200 text-xs font-light rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnalyzeDeal(deal);
                    }}
                    className="flex-1 px-3 py-2 bg-peach-500 text-white text-xs font-light rounded-lg hover:bg-peach-600 transition-colors"
                  >
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Deal Edit Modal */}
      <DealEditModal
        deal={editingDeal}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveDeal}
      />

      {/* Create New Deal Modal */}
      <DealEditModal
        deal={null}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateDeal}
      />

      {/* AI Analysis Modal */}
      <DealAnalysisModal
        deal={analyzingDeal}
        isOpen={isAnalysisModalOpen}
        onClose={() => setIsAnalysisModalOpen(false)}
        onAnalyze={handleRunAnalysis}
      />

      {/* Activity Modal */}
      <ActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => {
          setIsActivityModalOpen(false);
          setEditingActivity(null);
          setActivityModalDealId(null);
        }}
        onSave={handleSaveActivity}
        activity={editingActivity || undefined}
        dealId={activityModalDealId || ''}
      />
    </div>
  );
}
