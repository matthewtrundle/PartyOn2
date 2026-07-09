'use client';

import { useState, useEffect, useCallback, ReactElement } from 'react';
import Link from 'next/link';
import SectionSubNav from '@/components/backend/SectionSubNav';
import { CATALOG_SUBNAV } from '@/components/backend/subnav-items';

interface Collection {
  id: string;
  handle: string;
  title: string;
  imageUrl: string | null;
  parentId: string | null;
  position: number;
  productCount: number;
}

export default function CollectionsPage(): ReactElement {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newHandle, setNewHandle] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newParentId, setNewParentId] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 100;

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/collections?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`);
      const json = await res.json();
      if (json.collections) {
        setCollections(json.collections);
      }
      if (json.total !== undefined) {
        setTotal(json.total);
      }
    } catch {
      console.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const handleCreate = async () => {
    if (!newHandle.trim() || !newTitle.trim()) {
      setError('Handle and title are required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/v1/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: newHandle.trim(),
          title: newTitle.trim(),
          description: newDescription.trim() || undefined,
          parentId: newParentId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to create collection');
        return;
      }
      setNewHandle('');
      setNewTitle('');
      setNewDescription('');
      setNewParentId('');
      setShowCreate(false);
      fetchCollections();
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  };

  // Group into top-level and children
  const topLevel = collections.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) => collections.filter((c) => c.parentId === parentId);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-4">
        <SectionSubNav items={CATALOG_SUBNAV} />
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
            <p className="text-gray-500 mt-0.5">Manage product collections for group orders</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="group px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-md shadow-purple-200 hover:shadow-lg hover:shadow-purple-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Collection
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Collection</h2>
          {error && (
            <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Handle (slug)</label>
              <input
                type="text"
                value={newHandle}
                onChange={(e) => setNewHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder="e.g. boat-liquor"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Boat Liquor"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Collection description"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Collection (optional)</label>
              <select
                value={newParentId}
                onChange={(e) => setNewParentId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              >
                <option value="">None (top-level)</option>
                {topLevel.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 transition-all duration-200 shadow-md shadow-purple-200"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setError(''); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Collections List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                <div className="w-12 h-12 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-700 text-xl font-semibold">No collections yet</p>
            <p className="text-gray-500 mt-2">Create your first collection to organize products for group orders.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Collection</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Handle</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Products</th>
                <th className="text-center px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Children</th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {topLevel.map((col) => {
                const children = childrenOf(col.id);
                return (
                  <CollectionRow key={col.id} collection={col} childCollections={children} onRefresh={fetchCollections} />
                );
              })}
              {/* Orphaned children (parent not in top-level — shouldn't happen but safe) */}
              {collections
                .filter((c) => c.parentId && !topLevel.some((t) => t.id === c.parentId))
                .map((col) => (
                  <CollectionRow key={col.id} collection={col} childCollections={[]} onRefresh={fetchCollections} />
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-gray-600">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} collections
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className="px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CollectionRow({
  collection,
  childCollections,
  indent = false,
  onRefresh,
}: {
  collection: Collection;
  childCollections: Collection[];
  indent?: boolean;
  onRefresh: () => void;
}): ReactElement {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete collection "${collection.title}"? Products will be unassigned.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/admin/collections/${collection.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error || 'Failed to delete');
      }
      onRefresh();
    } catch {
      alert('Network error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-purple-50/50 transition-colors group">
        <td className="px-6 py-4">
          <div className={`flex items-center gap-3 ${indent ? 'pl-8' : ''}`}>
            {indent && (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <span className="font-medium text-gray-900 group-hover:text-purple-600 transition-colors">
              {collection.title}
            </span>
          </div>
        </td>
        <td className="px-6 py-4 text-center">
          <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{collection.handle}</code>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-lg font-bold text-gray-900">{collection.productCount}</span>
        </td>
        <td className="px-6 py-4 text-center">
          <span className="text-gray-600">{childCollections.length}</span>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/ops/collections/${collection.id}`}
              className="px-3 py-1.5 text-sm font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Manage
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting || childCollections.length > 0}
              className="px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={childCollections.length > 0 ? 'Remove child collections first' : 'Delete collection'}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          </div>
        </td>
      </tr>
      {childCollections.map((child) => (
        <CollectionRow key={child.id} collection={child} childCollections={[]} indent onRefresh={onRefresh} />
      ))}
    </>
  );
}
