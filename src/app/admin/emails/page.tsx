'use client';

import { useState, useEffect, useRef, useCallback, ReactElement } from 'react';
import EmailHubBand from '@/components/admin/emails/EmailHubBand';

type EmailType = 'order-confirmation' | 'delivery-en-route' | 'delivery-completed' | 'payment-failed' | 'refund-processed' | 'order-cancelled' | 'invoice' | 'affiliate-welcome' | 'affiliate-prospect' | 'dashboard-link';

interface InvoiceTextOverrides {
  greeting?: string;
  bodyText?: string;
  buttonText?: string;
  linkText?: string;
  footerText?: string;
  copyrightText?: string;
}

type OverrideKey = keyof InvoiceTextOverrides;

const FIELD_LABELS: Record<OverrideKey, { label: string; multiline: boolean }> = {
  greeting: { label: 'Greeting', multiline: false },
  bodyText: { label: 'Body Text', multiline: true },
  buttonText: { label: 'Button Text', multiline: false },
  linkText: { label: 'Link Text', multiline: false },
  footerText: { label: 'Footer Text', multiline: false },
  copyrightText: { label: 'Copyright Text', multiline: false },
};

const SAMPLE_DATA = {
  orderNumber: 1234,
  customerName: 'John Smith',
  customerEmail: 'john@example.com',
  items: [
    { title: 'Tito\'s Vodka 750ml', variantTitle: null, quantity: 2, price: 24.99, totalPrice: 49.98 },
    { title: 'Corona Extra', variantTitle: '12 Pack', quantity: 1, price: 18.99, totalPrice: 18.99 },
    { title: 'Lime Wedges', variantTitle: null, quantity: 1, price: 4.99, totalPrice: 4.99 },
  ],
  subtotal: 73.96,
  deliveryFee: 15.00,
  taxAmount: 6.10,
  total: 95.06,
  deliveryDate: new Date('2026-02-10'),
  deliveryTime: '2-4 PM',
  deliveryAddress: {
    address1: '123 Lake Austin Blvd',
    address2: 'Apt 4B',
    city: 'Austin',
    province: 'TX',
    zip: '78703',
  },
  deliveryInstructions: 'Gate code is #1234. Leave at front door.',
  driverName: 'Mike',
  estimatedArrival: '15 minutes',
};

export default function EmailPreviewPage(): ReactElement {
  const [selectedEmail, setSelectedEmail] = useState<EmailType>('order-confirmation');
  const [html, setHtml] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Invoice editor state
  const [editMode, setEditMode] = useState(false);
  const [defaults, setDefaults] = useState<Required<InvoiceTextOverrides> | null>(null);
  const [editFields, setEditFields] = useState<Required<InvoiceTextOverrides>>({
    greeting: '', bodyText: '', buttonText: '', linkText: '', footerText: '', copyrightText: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Prospect form state
  const [prospectName, setProspectName] = useState('');
  const [prospectBusiness, setProspectBusiness] = useState('');
  const [prospectIntro, setProspectIntro] = useState('');

  const isInvoice = selectedEmail === 'invoice';
  const isProspect = selectedEmail === 'affiliate-prospect';

  // Load invoice template content (defaults + overrides) when entering edit mode
  const loadTemplateContent = useCallback(async () => {
    try {
      const res = await fetch('/api/ops/email-template-content?type=invoice');
      const data = await res.json();
      if (data.defaults) {
        setDefaults(data.defaults);
        // Merge defaults with overrides for edit fields
        setEditFields({ ...data.defaults, ...data.overrides });
      }
    } catch {
      // silently fail - will use hardcoded defaults
    }
  }, []);

  // Live preview: POST current field values to get updated HTML
  const updateLivePreview = useCallback(async (fields: InvoiceTextOverrides) => {
    try {
      const res = await fetch('/api/ops/email-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', textOverrides: fields }),
      });
      const data = await res.json();
      if (data.html) setHtml(data.html);
    } catch {
      // silently fail
    }
  }, []);

  const loadPreview = async (type: EmailType) => {
    setSelectedEmail(type);
    setLoading(true);
    setSendResult(null);
    setSaveResult(null);
    setEditMode(false);
    try {
      const res = await fetch(`/api/ops/email-preview?type=${type}`);
      const data = await res.json();
      setHtml(data.html || '<p>Error loading preview</p>');
    } catch {
      setHtml('<p>Failed to load preview</p>');
    } finally {
      setLoading(false);
    }
  };

  // Live preview for prospect email with debounce
  const updateProspectPreview = useCallback(async (name: string, business: string, intro: string) => {
    try {
      const res = await fetch('/api/ops/email-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'affiliate-prospect',
          contactName: name || undefined,
          businessName: business || undefined,
          introText: intro || undefined,
        }),
      });
      const data = await res.json();
      if (data.html) setHtml(data.html);
    } catch {
      // silently fail
    }
  }, []);

  const handleProspectFieldChange = (setter: (v: string) => void, value: string, name: string, business: string, intro: string) => {
    setter(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateProspectPreview(
        name,
        business,
        intro,
      );
    }, 500);
  };

  const sendTestEmail = async (live = false) => {
    if (!testEmail.trim() || !html) return;
    setSending(true);
    setSendResult(null);
    try {
      const payload: Record<string, string | boolean> = { type: selectedEmail, to: testEmail.trim() };
      if (selectedEmail === 'affiliate-prospect') {
        if (prospectName) payload.contactName = prospectName;
        if (prospectBusiness) payload.businessName = prospectBusiness;
        if (prospectIntro) payload.introText = prospectIntro;
        if (live) payload.live = true;
      }
      const res = await fetch('/api/ops/email-preview/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSendResult({ success: true, message: `Email sent to ${testEmail}` });
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send email' });
      }
    } catch {
      setSendResult({ success: false, message: 'Network error' });
    } finally {
      setSending(false);
    }
  };

  // Handle entering edit mode
  const enterEditMode = async () => {
    setEditMode(true);
    await loadTemplateContent();
  };

  // Handle field change with debounced live preview
  const handleFieldChange = (key: OverrideKey, value: string) => {
    const updated = { ...editFields, [key]: value };
    setEditFields(updated);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateLivePreview(updated);
    }, 500);
  };

  // Reset single field to default
  const resetField = (key: OverrideKey) => {
    if (!defaults) return;
    const updated = { ...editFields, [key]: defaults[key] };
    setEditFields(updated);
    updateLivePreview(updated);
  };

  // Reset all fields to defaults
  const resetAllFields = () => {
    if (!defaults) return;
    setEditFields({ ...defaults });
    updateLivePreview({ ...defaults });
  };

  // Save overrides
  const saveOverrides = async () => {
    if (!defaults) return;
    setSaving(true);
    setSaveResult(null);

    // Only save fields that differ from defaults
    const changedOverrides: InvoiceTextOverrides = {};
    for (const key of Object.keys(defaults) as OverrideKey[]) {
      if (editFields[key] !== defaults[key]) {
        changedOverrides[key] = editFields[key];
      }
    }

    try {
      const res = await fetch('/api/ops/email-template-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'invoice', content: changedOverrides }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveResult({ success: true, message: 'Saved successfully' });
      } else {
        setSaveResult({ success: false, message: data.error || 'Failed to save' });
      }
    } catch {
      setSaveResult({ success: false, message: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen">
      <EmailHubBand active="templates" />
      <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Preview</h1>
            <p className="text-gray-500 mt-0.5">Preview email templates as recipients see them</p>
          </div>
        </div>
      </div>

      {/* Email Type Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: 'order-confirmation', label: 'Order Confirmation' },
            { id: 'delivery-en-route', label: 'Delivery En Route' },
            { id: 'delivery-completed', label: 'Delivery Completed' },
            { id: 'payment-failed', label: 'Payment Failed' },
            { id: 'refund-processed', label: 'Refund Processed' },
            { id: 'order-cancelled', label: 'Order Cancelled' },
            { id: 'invoice', label: 'Invoice' },
            { id: 'affiliate-welcome', label: 'Affiliate Welcome' },
            { id: 'affiliate-prospect', label: 'Partner Prospect' },
            { id: 'dashboard-link', label: 'Dashboard Link' },
          ].map((email) => (
            <button
              key={email.id}
              onClick={() => loadPreview(email.id as EmailType)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                selectedEmail === email.id
                  ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {email.label}
            </button>
          ))}
        </div>

        {/* Send Test Email + Invoice Edit Toggle */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter email address..."
            className="flex-1 max-w-xs px-4 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
          />
          <button
            onClick={() => sendTestEmail(false)}
            disabled={sending || !testEmail.trim() || !html}
            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-green-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {sending ? 'Sending...' : 'Send Test Email'}
          </button>
          {isProspect && (
            <button
              onClick={() => sendTestEmail(true)}
              disabled={sending || !testEmail.trim() || !html}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-amber-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {sending ? 'Sending...' : 'Send to Prospect'}
            </button>
          )}
          {isInvoice && html && (
            <button
              onClick={() => editMode ? setEditMode(false) : enterEditMode()}
              className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
                editMode
                  ? 'bg-gray-800 text-white hover:bg-gray-900'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {editMode ? 'Close Editor' : 'Edit Copy'}
            </button>
          )}
          {sendResult && (
            <span className={`text-sm font-medium ${sendResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {sendResult.message}
            </span>
          )}
        </div>
      </div>

      {/* Prospect Form Fields */}
      {isProspect && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Prospect Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contact Name</label>
              <input
                type="text"
                value={prospectName}
                onChange={(e) => handleProspectFieldChange(setProspectName, e.target.value, e.target.value, prospectBusiness, prospectIntro)}
                placeholder="Jane Doe"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Business Name</label>
              <input
                type="text"
                value={prospectBusiness}
                onChange={(e) => handleProspectFieldChange(setProspectBusiness, e.target.value, prospectName, e.target.value, prospectIntro)}
                placeholder="Sunset Bar & Grill"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Intro Text</label>
            <textarea
              value={prospectIntro}
              onChange={(e) => handleProspectFieldChange(setProspectIntro, e.target.value, prospectName, prospectBusiness, e.target.value)}
              placeholder="Great talking with you about partnering with Party On Delivery! Here's a quick overview of how our partner program works and what your business can expect."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-vertical"
            />
          </div>
          <p className="text-xs text-gray-400">Fill in the fields above to customize the preview. Leave Intro Text blank to use the default. Enter the recipient email in the bar above to send.</p>
        </div>
      )}

      {/* Invoice Editor + Preview split layout */}
      {isInvoice && editMode && defaults ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Invoice Copy</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetAllFields}
                  className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset All
                </button>
                <button
                  onClick={saveOverrides}
                  disabled={saving}
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-lg font-medium hover:from-pink-700 hover:to-pink-800 disabled:opacity-50 transition-all shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {saveResult && (
              <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-medium ${
                saveResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {saveResult.message}
              </div>
            )}

            <p className="text-xs text-gray-400 mb-4">
              Use <code className="bg-gray-100 px-1 rounded">{'{customerName}'}</code> in Greeting and <code className="bg-gray-100 px-1 rounded">{'{year}'}</code> in Copyright for dynamic values.
            </p>

            <div className="space-y-4">
              {(Object.keys(FIELD_LABELS) as OverrideKey[]).map((key) => {
                const { label, multiline } = FIELD_LABELS[key];
                const isModified = defaults[key] !== editFields[key];
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">
                        {label}
                        {isModified && (
                          <span className="ml-2 text-xs text-amber-600 font-normal">Modified</span>
                        )}
                      </label>
                      {isModified && (
                        <button
                          onClick={() => resetField(key)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    {multiline ? (
                      <textarea
                        value={editFields[key]}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 resize-vertical"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editFields[key]}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-sm text-gray-500 ml-2">Live Preview - Invoice</span>
            </div>
            <iframe
              srcDoc={html}
              className="w-full h-[700px] border-0"
              title="Invoice Email Preview"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Preview Frame */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="text-sm text-gray-500 ml-2">Email Preview - {selectedEmail}</span>
            </div>

            {loading ? (
              <div className="p-16 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full mx-auto" />
                <p className="mt-4 text-gray-500">Loading preview...</p>
              </div>
            ) : html ? (
              <iframe
                srcDoc={html}
                className="w-full h-[800px] border-0"
                title="Email Preview"
              />
            ) : (
              <div className="p-16 text-center">
                <p className="text-gray-500">Click an email type above to preview</p>
              </div>
            )}
          </div>

          {/* Sample Data Reference */}
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Data Used</h3>
            <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-64 text-gray-700">
              {JSON.stringify(SAMPLE_DATA, null, 2)}
            </pre>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
