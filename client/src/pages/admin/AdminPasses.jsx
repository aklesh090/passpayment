/**
 * AdminPasses.jsx
 *
 * Pass Management admin page.
 *
 * Fixes:
 *  1. Uses GET /api/admin/passes (returns active + inactive)
 *  2. Inactive passes remain visible — admin can re-enable them
 *  3. Create Pass — real modal form (replaces alert() stub)
 *  4. Edit Pass — inline modal
 *  5. Toggle active/inactive — atomic via PATCH /toggle
 *  6. Change price — inside edit modal (no more prompt())
 *  7. All writes go through /api/admin/* endpoints (server enforces admin role)
 *
 * Authorization: server-side (requireAdmin middleware on all admin routes).
 * This UI hides buttons as UX convenience only — backend is the authority.
 */

import { useState, useEffect, useCallback } from 'react';
import { passService } from '../../services/pass.service';
import {
  Plus, X, Edit2, ToggleLeft, ToggleRight, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: 'daily',
  applicableDays: [],
  price: '',
  totalQuantity: '',
  perks: '',
  isActive: true,
};

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification (lightweight, no dep)
// ─────────────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-green-900/90 border-green-500/50 text-green-200',
    error:   'bg-red-900/90 border-red-500/50 text-red-200',
    info:    'bg-zinc-800 border-zinc-600 text-zinc-200',
  };
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl ${colors[type] || colors.info} max-w-sm`}>
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Day Picker
// ─────────────────────────────────────────────────────────────────────────────

function DayPicker({ value, onChange, disabled }) {
  const toggle = (d) => {
    if (disabled) return;
    const next = value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort((a, b) => a - b);
    onChange(next);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {ALL_DAYS.map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled}
          onClick={() => toggle(d)}
          className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
            value.includes(d)
              ? 'bg-red-600 border-red-500 text-white'
              : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
          } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass Modal (Create + Edit shared)
// ─────────────────────────────────────────────────────────────────────────────

function PassModal({ mode, initialData, onClose, onSave }) {
  const [form, setForm] = useState(() =>
    mode === 'edit'
      ? {
          name:          initialData.name || '',
          slug:          initialData.slug || '',
          category:      initialData.category || 'daily',
          applicableDays: initialData.applicableDays || [],
          price:         String(initialData.price ?? ''),
          totalQuantity: String(initialData.totalQuantity ?? ''),
          perks:         (initialData.perks || []).join(', '),
          isActive:      initialData.isActive !== undefined ? initialData.isActive : true,
        }
      : { ...EMPTY_FORM }
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Auto-derive slug from name in create mode
  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      ...(mode === 'create' ? { slug: name.toLowerCase().trim().replace(/\s+/g, '-') } : {}),
    }));
  };

  // Category change resets applicableDays
  const handleCategoryChange = (cat) => {
    setForm((f) => ({
      ...f,
      category: cat,
      applicableDays: cat === 'season' ? [1,2,3,4,5,6,7,8,9] : [],
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Pass name is required';
    if (!form.slug.trim()) return 'Slug is required';
    if (!form.category) return 'Category is required';
    if (form.applicableDays.length === 0) return 'Select at least one applicable day';
    if (form.applicableDays.some((d) => d < 1 || d > 9)) return 'Days must be between 1 and 9';
    if (form.category === 'daily' && form.applicableDays.length !== 1) return 'A daily pass must have exactly one applicable day';

    const price = Number(form.price);
    if (!form.price || isNaN(price) || price < 0) return 'Enter a valid price (≥ 0)';

    const qty = Number(form.totalQuantity);
    if (!form.totalQuantity || isNaN(qty) || qty < 1) return 'Total quantity must be at least 1';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErr = validate();
    if (validationErr) { setError(validationErr); return; }

    setError('');
    setSaving(true);

    const payload = {
      name:          form.name.trim(),
      slug:          form.slug.toLowerCase().trim().replace(/\s+/g, '-'),
      category:      form.category,
      applicableDays: form.applicableDays,
      price:         Number(form.price),
      totalQuantity: Number(form.totalQuantity),
      perks:         form.perks.split(',').map((s) => s.trim()).filter(Boolean),
      isActive:      form.isActive,
    };

    try {
      let saved;
      if (mode === 'create') {
        const res = await passService.adminCreate(payload);
        saved = res.pass;
      } else {
        const res = await passService.adminUpdate(initialData._id, payload);
        saved = res.pass;
      }
      onSave(saved, mode === 'create' ? 'created' : 'updated');
    } catch (err) {
      const msg = err?.message || err?.data?.message || 'Failed to save pass';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-8 overflow-y-auto">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-bold">
            {mode === 'create' ? '+ Create Pass' : `Edit: ${initialData.name}`}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Name */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Pass Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleNameChange}
              placeholder="e.g. VIP Season Pass"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-red-500 text-sm"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Slug * <span className="text-zinc-600 text-xs">(URL-safe identifier, auto-generated)</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
              placeholder="vip-season-pass"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Category *</label>
            <div className="flex gap-3">
              {['season', 'daily'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                    form.category === cat
                      ? 'bg-red-600 border-red-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Applicable Days */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Applicable Days *{' '}
              {form.category === 'daily' && <span className="text-zinc-600 text-xs">(select exactly 1 day for daily pass)</span>}
              {form.category === 'season' && <span className="text-zinc-600 text-xs">(all 9 selected for season pass)</span>}
            </label>
            <DayPicker
              value={form.applicableDays}
              onChange={(days) => setForm((f) => ({ ...f, applicableDays: days }))}
              disabled={form.category === 'season'}
            />
          </div>

          {/* Price + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Price (₹) *</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                min="0"
                step="1"
                placeholder="750"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Total Quantity *</label>
              <input
                type="number"
                value={form.totalQuantity}
                onChange={(e) => setForm((f) => ({ ...f, totalQuantity: e.target.value }))}
                min="1"
                step="1"
                placeholder="500"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          {/* Perks */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Perks <span className="text-zinc-600 text-xs">(comma-separated, optional)</span>
            </label>
            <input
              type="text"
              value={form.perks}
              onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
              placeholder="Priority Entry, Exclusive Lounge, Free Snacks"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`transition-colors ${form.isActive ? 'text-green-400' : 'text-zinc-500'}`}
            >
              {form.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
            <span className="text-sm text-zinc-300">
              {form.isActive ? 'Active (purchasable)' : 'Inactive (hidden from public)'}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/30 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Historical note on price change */}
          {mode === 'edit' && (
            <p className="text-xs text-zinc-600">
              ⚠ Price changes apply to new purchases only. Existing orders retain the original price.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : mode === 'create' ? 'Create Pass' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main AdminPasses Component
// ─────────────────────────────────────────────────────────────────────────────

const AdminPasses = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', pass }
  const [toast, setToast] = useState(null); // null | { message, type }
  const [togglingId, setTogglingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'active' | 'inactive'

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Fetch all passes (admin endpoint returns active + inactive) ──
  const fetchPasses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await passService.adminGetAll();
      setPasses(res.passes || []);
    } catch (err) {
      showToast(err?.message || 'Failed to load passes', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPasses();
  }, [fetchPasses]);

  // ── Toggle active/inactive ──
  const handleToggle = async (pass) => {
    setTogglingId(pass._id);
    try {
      const res = await passService.adminToggle(pass._id);
      setPasses((prev) => prev.map((p) => (p._id === pass._id ? res.pass : p)));
      showToast(res.message || `Pass ${res.pass.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to toggle pass status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Modal save handler ──
  const handleModalSave = (savedPass, action) => {
    if (action === 'created') {
      setPasses((prev) => [savedPass, ...prev]);
      showToast(`"${savedPass.name}" created successfully`, 'success');
    } else {
      setPasses((prev) => prev.map((p) => (p._id === savedPass._id ? savedPass : p)));
      showToast(`"${savedPass.name}" updated successfully`, 'success');
    }
    setModal(null);
  };

  // ── Filtered passes ──
  const filteredPasses = passes.filter((p) => {
    if (filterStatus === 'active') return p.isActive;
    if (filterStatus === 'inactive') return !p.isActive;
    return true;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Pass Management</h1>
          <p className="text-zinc-500 text-sm mt-1">Rangilo Raas 2026 — {passes.length} passes total</p>
        </div>
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Pass
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { key: 'all',      label: `All (${passes.length})` },
          { key: 'active',   label: `Active (${passes.filter((p) => p.isActive).length})` },
          { key: 'inactive', label: `Inactive (${passes.filter((p) => !p.isActive).length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filterStatus === key
                ? 'bg-zinc-700 text-white'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        {loading ? (
          <div className="py-16 text-center text-zinc-500">
            <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
            Loading passes...
          </div>
        ) : filteredPasses.length === 0 ? (
          <div className="py-16 text-center text-zinc-500">
            No {filterStatus !== 'all' ? filterStatus : ''} passes found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 rounded-tl-xl">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">Sold / Capacity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredPasses.map((pass) => (
                  <tr
                    key={pass._id}
                    className={`hover:bg-zinc-800/30 transition-colors ${!pass.isActive ? 'opacity-60' : ''}`}
                  >
                    {/* Name */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white">{pass.name}</span>
                      {pass.perks?.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-0.5">{pass.perks.slice(0, 2).join(' · ')}</p>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pass.category === 'season' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {pass.category}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 font-mono font-bold text-green-400">₹{pass.price}</td>

                    {/* Days */}
                    <td className="px-4 py-3 text-zinc-300">
                      {pass.applicableDays?.length === 9
                        ? 'All 9 Days'
                        : `Day ${pass.applicableDays?.join(', ')}`}
                    </td>

                    {/* Sold / Capacity */}
                    <td className="px-4 py-3 text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span>{pass.soldQuantity} / {pass.totalQuantity}</span>
                        <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${Math.min((pass.soldQuantity / pass.totalQuantity) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        pass.isActive
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-red-500/15 text-red-400 border border-red-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${pass.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                        {pass.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Edit */}
                        <button
                          onClick={() => setModal({ mode: 'edit', pass })}
                          title="Edit pass"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle active */}
                        <button
                          onClick={() => handleToggle(pass)}
                          disabled={togglingId === pass._id}
                          title={pass.isActive ? 'Deactivate pass' : 'Activate pass'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            pass.isActive
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                        >
                          {togglingId === pass._id ? (
                            <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : pass.isActive ? (
                            <ToggleRight className="w-3.5 h-3.5" />
                          ) : (
                            <ToggleLeft className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Deactivation info */}
      <p className="text-xs text-zinc-600 mt-4">
        Deactivating a pass hides it from the public purchase page immediately. Existing paid tickets remain valid.
      </p>

      {/* Modals */}
      {modal?.mode === 'create' && (
        <PassModal
          mode="create"
          initialData={EMPTY_FORM}
          onClose={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}
      {modal?.mode === 'edit' && (
        <PassModal
          mode="edit"
          initialData={modal.pass}
          onClose={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default AdminPasses;
