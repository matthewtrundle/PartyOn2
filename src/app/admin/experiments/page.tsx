'use client';

/**
 * Experiments Management Page
 * Full CRUD interface for A/B testing experiments
 */

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';

interface Variant {
  id: string;
  name: string;
  description?: string;
  isControl: boolean;
  weight: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  clickRate?: number;
  conversionRate?: number;
}

interface Experiment {
  id: string;
  name: string;
  description?: string;
  page: string;
  elementId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  startDate: string | null;
  endDate: string | null;
  goalMetric: string;
  goalValue?: string;
  winningVariant: string | null;
  confidence: number | null;
  variants: Variant[];
  totalImpressions?: number;
  uplift?: number;
  daysRunning?: number;
}

interface ExperimentsResponse {
  experiments: Experiment[];
  summary: {
    active: number;
    paused: number;
    completed: number;
    draft: number;
  };
}

const KEY_PAGES = [
  { value: '/', label: 'Homepage' },
  { value: '/weddings', label: 'Weddings' },
  { value: '/boat-parties', label: 'Boat Parties' },
  { value: '/bach-parties', label: 'Bach Parties' },
  { value: '/order', label: 'Order Page' },
  { value: '/products', label: 'Products' },
];

const GOAL_METRICS = [
  { value: 'cta_click', label: 'CTA Click Rate' },
  { value: 'scroll_depth', label: 'Scroll Depth' },
  { value: 'conversion', label: 'Conversion Rate' },
  { value: 'revenue', label: 'Revenue' },
];

function StatusBadge({ status }: { status: string }): ReactElement {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    DRAFT: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  );
}

function CreateExperimentModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}): ReactElement | null {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    page: '/',
    elementId: 'hero',
    goalMetric: 'cta_click',
    goalValue: '',
  });
  const [variants, setVariants] = useState([
    { name: 'Control', description: '', isControl: true, weight: 50 },
    { name: 'Variant A', description: '', isControl: false, weight: 50 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variants,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create experiment');
      }

      onCreated();
      onClose();
      setFormData({
        name: '',
        description: '',
        page: '/',
        elementId: 'hero',
        goalMetric: 'cta_click',
        goalValue: '',
      });
      setVariants([
        { name: 'Control', description: '', isControl: true, weight: 50 },
        { name: 'Variant A', description: '', isControl: false, weight: 50 },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVariant = () => {
    const newWeight = Math.floor(100 / (variants.length + 1));
    const updatedVariants = variants.map((v) => ({ ...v, weight: newWeight }));
    updatedVariants.push({
      name: `Variant ${String.fromCharCode(65 + variants.length - 1)}`,
      description: '',
      isControl: false,
      weight: newWeight,
    });
    setVariants(updatedVariants);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 2) return;
    const newVariants = variants.filter((_, i) => i !== index);
    const newWeight = Math.floor(100 / newVariants.length);
    setVariants(newVariants.map((v) => ({ ...v, weight: newWeight })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Create Experiment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Experiment Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              placeholder="e.g., Hero CTA Test"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              rows={2}
              placeholder="What are you testing?"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Page</label>
              <select
                value={formData.page}
                onChange={(e) => setFormData({ ...formData, page: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {KEY_PAGES.map((page) => (
                  <option key={page.value} value={page.value}>
                    {page.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Element ID</label>
              <input
                type="text"
                required
                value={formData.elementId}
                onChange={(e) => setFormData({ ...formData, elementId: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="e.g., hero, cta-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Metric</label>
              <select
                value={formData.goalMetric}
                onChange={(e) => setFormData({ ...formData, goalMetric: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {GOAL_METRICS.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Goal Value (Optional)</label>
              <input
                type="text"
                value={formData.goalValue}
                onChange={(e) => setFormData({ ...formData, goalValue: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                placeholder="e.g., ORDER NOW"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Variants</label>
              <button
                type="button"
                onClick={addVariant}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                + Add Variant
              </button>
            </div>
            <div className="space-y-2">
              {variants.map((variant, index) => (
                <div key={index} className="flex items-center gap-2 rounded-lg border p-2">
                  <input
                    type="text"
                    required
                    value={variant.name}
                    onChange={(e) => {
                      const updated = [...variants];
                      updated[index].name = e.target.value;
                      setVariants(updated);
                    }}
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                    placeholder="Variant name"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={variant.weight}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[index].weight = parseInt(e.target.value) || 0;
                        setVariants(updated);
                      }}
                      className="w-16 rounded border border-gray-300 px-2 py-1 text-sm"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                  {variant.isControl ? (
                    <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">Control</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      className="text-gray-400 hover:text-red-500"
                      disabled={variants.length <= 2}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Total weight: {variants.reduce((sum, v) => sum + v.weight, 0)}% (must equal 100%)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Experiment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExperimentCard({
  experiment,
  onStatusChange,
  onDelete,
}: {
  experiment: Experiment;
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}): ReactElement {
  const controlVariant = experiment.variants.find((v) => v.isControl);
  const testVariants = experiment.variants.filter((v) => !v.isControl);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{experiment.name}</h3>
            <StatusBadge status={experiment.status} />
          </div>
          {experiment.description && (
            <p className="mt-1 text-sm text-gray-500">{experiment.description}</p>
          )}
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
            <span>Page: {experiment.page}</span>
            <span>Element: {experiment.elementId}</span>
            <span>Goal: {experiment.goalMetric}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {experiment.status === 'DRAFT' && (
            <button
              onClick={() => onStatusChange(experiment.id, 'ACTIVE')}
              className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
            >
              Start
            </button>
          )}
          {experiment.status === 'ACTIVE' && (
            <button
              onClick={() => onStatusChange(experiment.id, 'PAUSED')}
              className="rounded-lg bg-yellow-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600"
            >
              Pause
            </button>
          )}
          {experiment.status === 'PAUSED' && (
            <>
              <button
                onClick={() => onStatusChange(experiment.id, 'ACTIVE')}
                className="rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600"
              >
                Resume
              </button>
              <button
                onClick={() => onStatusChange(experiment.id, 'COMPLETED')}
                className="rounded-lg bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600"
              >
                Complete
              </button>
            </>
          )}
          {(experiment.status === 'DRAFT' || experiment.status === 'COMPLETED') && (
            <button
              onClick={() => onDelete(experiment.id)}
              className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {experiment.status !== 'DRAFT' && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs font-medium uppercase text-gray-500">Impressions</div>
              <div className="text-xl font-bold text-gray-900">
                {experiment.totalImpressions?.toLocaleString() || 0}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs font-medium uppercase text-gray-500">Days Running</div>
              <div className="text-xl font-bold text-gray-900">{experiment.daysRunning || 0}</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs font-medium uppercase text-gray-500">Uplift</div>
              <div
                className={`text-xl font-bold ${
                  (experiment.uplift || 0) > 0 ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {(experiment.uplift || 0) > 0 ? '+' : ''}
                {experiment.uplift || 0}%
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-xs font-medium uppercase text-gray-500">Confidence</div>
              <div className="text-xl font-bold text-gray-900">{experiment.confidence || 0}%</div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="mb-2 text-sm font-medium text-gray-700">Variants Performance</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium uppercase text-gray-500">
                    <th className="pb-2">Variant</th>
                    <th className="pb-2 text-right">Impressions</th>
                    <th className="pb-2 text-right">Clicks</th>
                    <th className="pb-2 text-right">Click Rate</th>
                    <th className="pb-2 text-right">Conversions</th>
                    <th className="pb-2 text-right">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {controlVariant && (
                    <tr className="border-b bg-gray-50">
                      <td className="py-2 font-medium">
                        {controlVariant.name}
                        <span className="ml-1 rounded bg-gray-200 px-1 text-xs">Control</span>
                      </td>
                      <td className="py-2 text-right">{controlVariant.impressions.toLocaleString()}</td>
                      <td className="py-2 text-right">{controlVariant.clicks.toLocaleString()}</td>
                      <td className="py-2 text-right">{(controlVariant.clickRate || 0).toFixed(2)}%</td>
                      <td className="py-2 text-right">{controlVariant.conversions.toLocaleString()}</td>
                      <td className="py-2 text-right">{(controlVariant.conversionRate || 0).toFixed(2)}%</td>
                    </tr>
                  )}
                  {testVariants.map((variant) => (
                    <tr key={variant.id} className="border-b">
                      <td className="py-2 font-medium">
                        {variant.name}
                        {experiment.winningVariant === variant.id && (
                          <span className="ml-1 text-amber-500">⭐</span>
                        )}
                      </td>
                      <td className="py-2 text-right">{variant.impressions.toLocaleString()}</td>
                      <td className="py-2 text-right">{variant.clicks.toLocaleString()}</td>
                      <td className="py-2 text-right">{(variant.clickRate || 0).toFixed(2)}%</td>
                      <td className="py-2 text-right">{variant.conversions.toLocaleString()}</td>
                      <td className="py-2 text-right">{(variant.conversionRate || 0).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {experiment.status === 'DRAFT' && (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center">
          <p className="text-gray-500">
            This experiment is a draft. Click &quot;Start&quot; to begin collecting data.
          </p>
        </div>
      )}
    </div>
  );
}

export default function ExperimentsPage(): ReactElement {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [summary, setSummary] = useState({ active: 0, paused: 0, completed: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchExperiments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/experiments');
      const data: ExperimentsResponse = await response.json();

      if (!response.ok) {
        throw new Error('Failed to fetch experiments');
      }

      setExperiments(data.experiments);
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/experiments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update experiment');
      }

      fetchExperiments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this experiment?')) return;

    try {
      const response = await fetch(`/api/admin/experiments/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete experiment');
      }

      fetchExperiments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredExperiments = experiments.filter((exp) => {
    if (filter === 'all') return true;
    return exp.status.toLowerCase() === filter;
  });

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-100">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">A/B Experiments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your website experiments and track performance
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Experiment
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setFilter('active')}
            className={`rounded-lg border p-4 text-left transition-colors ${
              filter === 'active' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-green-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-500">Active</div>
            <div className="text-2xl font-bold text-green-600">{summary.active}</div>
          </button>
          <button
            onClick={() => setFilter('paused')}
            className={`rounded-lg border p-4 text-left transition-colors ${
              filter === 'paused' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 bg-white hover:border-yellow-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-500">Paused</div>
            <div className="text-2xl font-bold text-yellow-600">{summary.paused}</div>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`rounded-lg border p-4 text-left transition-colors ${
              filter === 'completed' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <div className="text-sm font-medium text-gray-500">Completed</div>
            <div className="text-2xl font-bold text-blue-600">{summary.completed}</div>
          </button>
          <button
            onClick={() => setFilter('draft')}
            className={`rounded-lg border p-4 text-left transition-colors ${
              filter === 'draft' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 bg-white hover:border-gray-400'
            }`}
          >
            <div className="text-sm font-medium text-gray-500">Drafts</div>
            <div className="text-2xl font-bold text-gray-600">{summary.draft}</div>
          </button>
        </div>

        {/* Filter indicator */}
        {filter !== 'all' && (
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Showing {filter} experiments
            </span>
            <button
              onClick={() => setFilter('all')}
              className="text-sm text-amber-600 hover:text-amber-700"
            >
              Show all
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={fetchExperiments}
              className="mt-2 text-sm font-medium text-red-800 underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
            ))}
          </div>
        )}

        {/* Experiments List */}
        {!loading && filteredExperiments.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gray-100 p-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {filter === 'all' ? 'No experiments yet' : `No ${filter} experiments`}
            </h3>
            <p className="mb-4 text-gray-500">
              {filter === 'all'
                ? 'Create your first A/B test to start optimizing your website.'
                : `You don't have any experiments in the "${filter}" state.`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
              >
                Create First Experiment
              </button>
            )}
          </div>
        )}

        {!loading && filteredExperiments.length > 0 && (
          <div className="space-y-4">
            {filteredExperiments.map((experiment) => (
              <ExperimentCard
                key={experiment.id}
                experiment={experiment}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Back to Dashboard Link */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <CreateExperimentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={fetchExperiments}
      />
    </div>
  );
}
