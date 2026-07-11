'use client';

import { useState, useEffect, ReactElement, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import DetailHeader from '@/components/ops/orders/detail/DetailHeader';
import StatusStepperCard from '@/components/ops/orders/detail/StatusStepperCard';
import DeliveryCard from '@/components/ops/orders/detail/DeliveryCard';
import ItemsCard from '@/components/ops/orders/detail/ItemsCard';
import PaymentCard from '@/components/ops/orders/detail/PaymentCard';
import DetailStickyBar, { nextTransition } from '@/components/ops/orders/detail/DetailStickyBar';
import OrderActionSheet from '@/components/ops/orders/detail/OrderActionSheet';
import { computeAmendmentRefundPrefill } from '@/components/ops/orders/detail/refund-prefill';
import { getStatusColor, formatDateTime, SectionHeader } from '@/components/ops/orders/detail/shared';
import type { OrderDetail } from '@/components/ops/orders/detail/types';

interface EditItem {
  productId: string;
  variantId: string;
  title: string;
  variantTitle?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  isNew?: boolean;
}

interface SearchProduct {
  id: string;
  title: string;
  status: string;
  variants: {
    id: string;
    title: string | null;
    price: string | number;
    sku: string | null;
    option1Value: string | null;
    option2Value: string | null;
  }[];
  images: { url: string }[];
}

interface PreviewData {
  previousTotal: number;
  newTotal: number;
  amountDelta: number;
  previousSubtotal: number;
  newSubtotal: number;
  previousTax: number;
  newTax: number;
  previousDeliveryFee: number;
  newDeliveryFee: number;
  changes: {
    added: { title: string; quantity: number; price: number }[];
    removed: { title: string; quantity: number; price: number }[];
    modified: { title: string; oldQuantity: number; newQuantity: number; price: number }[];
    deliveryFeeChange: { from: number; to: number } | null;
  };
  warnings: string[];
}

const TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM',
  '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
  '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM',
];

export default function OrderDetailPage(): ReactElement {
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editDeliveryFee, setEditDeliveryFee] = useState(0);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editDeliveryTime, setEditDeliveryTime] = useState('');
  const [editDeliveryPhone, setEditDeliveryPhone] = useState('');
  const [editDeliveryInstructions, setEditDeliveryInstructions] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState({ address1: '', address2: '', city: '', state: '', zip: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [amendProcessing, setAmendProcessing] = useState(false);
  const [amendNotes, setAmendNotes] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Action sheet + refund state
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundReason, setRefundReason] = useState('');
  const [refundProcessing, setRefundProcessing] = useState(false);
  const [pendingAmendmentId, setPendingAmendmentId] = useState<string | null>(null);
  const [refundType, setRefundType] = useState<string>('custom');

  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelNote, setCancelNote] = useState('');
  const [cancelProcessing, setCancelProcessing] = useState(false);
  const [cancelEmailPreview, setCancelEmailPreview] = useState('');
  const [issueRefund, setIssueRefund] = useState(false);

  // Return dialog state
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnItems, setReturnItems] = useState<Record<string, number>>({});
  const [returnReason, setReturnReason] = useState('');
  const [returnProcessing, setReturnProcessing] = useState(false);

  // Affiliate attribution state
  const [affiliateCode, setAffiliateCode] = useState('');
  const [affiliateLinking, setAffiliateLinking] = useState(false);
  const [affiliateError, setAffiliateError] = useState('');
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [sendingReview, setSendingReview] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/v1/admin/orders/${orderId}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load order');
        return;
      }

      setOrder(data.data);
      setInternalNote(data.data.notes.internal || '');
    } catch {
      setError('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function enterEditMode() {
    if (!order) return;
    setEditItems(
      order.items.map((item) => ({
        productId: item.product.id,
        variantId: item.variant?.id || '',
        title: item.title,
        variantTitle: item.variantTitle || undefined,
        quantity: item.quantity,
        price: item.price,
      }))
    );
    setEditDeliveryFee(order.pricing.deliveryFee);
    setEditCustomerName(order.customerSnapshot.name || order.customer.name || '');
    // Parse ISO date to YYYY-MM-DD for input
    setEditDeliveryDate(order.delivery.date.split('T')[0]);
    setEditDeliveryTime(order.delivery.time || '');
    setEditDeliveryPhone(order.delivery.phone || '');
    setEditDeliveryInstructions(order.delivery.instructions || '');
    setEditDeliveryAddress({
      address1: order.delivery.address.address1 || '',
      address2: order.delivery.address.address2 || '',
      city: order.delivery.address.city || '',
      state: order.delivery.address.state || '',
      zip: order.delivery.address.zip || '',
    });
    setAmendNotes('');
    setPreview(null);
    setIsEditing(true);
  }

  function cancelEditMode() {
    setIsEditing(false);
    setEditItems([]);
    setPreview(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setEditCustomerName('');
    setEditDeliveryDate('');
    setEditDeliveryTime('');
    setEditDeliveryPhone('');
    setEditDeliveryInstructions('');
    setEditDeliveryAddress({ address1: '', address2: '', city: '', state: '', zip: '' });
  }

  // Product search
  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/v1/products/search?q=${encodeURIComponent(query)}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
        setShowSearchResults(true);
      }
    } finally {
      setSearchLoading(false);
    }
  }, []);

  function handleSearchInput(value: string) {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchProducts(value), 300);
  }

  function addProduct(product: SearchProduct, variant: SearchProduct['variants'][0]) {
    const key = `${product.id}-${variant.id}`;
    const existing = editItems.find(
      (item) => `${item.productId}-${item.variantId}` === key
    );
    if (existing) {
      setEditItems(
        editItems.map((item) =>
          `${item.productId}-${item.variantId}` === key
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const variantTitle = [variant.option1Value, variant.option2Value].filter(Boolean).join(' / ');
      setEditItems([
        ...editItems,
        {
          productId: product.id,
          variantId: variant.id,
          title: product.title,
          variantTitle: variantTitle || (variant.title !== 'Default Title' ? variant.title || undefined : undefined),
          quantity: 1,
          price: parseFloat(variant.price as string),
          imageUrl: product.images[0]?.url || '',
          isNew: true,
        },
      ]);
    }
    setSearchQuery('');
    setShowSearchResults(false);
    setPreview(null);
  }

  function updateItemQuantity(productId: string, variantId: string, delta: number) {
    setEditItems(
      editItems
        .map((item) =>
          item.productId === productId && item.variantId === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
    setPreview(null);
  }

  function removeItem(productId: string, variantId: string) {
    setEditItems(editItems.filter((item) => !(item.productId === productId && item.variantId === variantId)));
    setPreview(null);
  }

  async function fetchPreview() {
    if (!order) return;
    setAmendProcessing(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          items: editItems,
          deliveryFee: editDeliveryFee,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      } else {
        alert(data.error || 'Failed to preview amendment');
      }
    } catch {
      alert('Failed to preview amendment');
    } finally {
      setAmendProcessing(false);
    }
  }

  function hasFinancialChanges(): boolean {
    if (!order) return false;
    if (editDeliveryFee !== order.pricing.deliveryFee) return true;
    const origItems = order.items.map(i => `${i.product.id}-${i.variant?.id || ''}-${i.quantity}-${i.price}`).sort().join('|');
    const editItemsStr = editItems.map(i => `${i.productId}-${i.variantId}-${i.quantity}-${i.price}`).sort().join('|');
    return origItems !== editItemsStr;
  }

  function getNonFinancialUpdates(): Record<string, unknown> {
    if (!order) return {};
    const updates: Record<string, unknown> = {};
    const origName = order.customerSnapshot.name || order.customer.name || '';
    if (editCustomerName !== origName) updates.customerName = editCustomerName;
    if (editDeliveryDate !== order.delivery.date.split('T')[0]) updates.deliveryDate = editDeliveryDate;
    if (editDeliveryTime !== (order.delivery.time || '')) updates.deliveryTime = editDeliveryTime;
    if (editDeliveryPhone !== (order.delivery.phone || '')) updates.deliveryPhone = editDeliveryPhone;
    if (editDeliveryInstructions !== (order.delivery.instructions || '')) updates.deliveryInstructions = editDeliveryInstructions;
    const origAddr = order.delivery.address;
    if (editDeliveryAddress.address1 !== (origAddr.address1 || '') ||
        editDeliveryAddress.address2 !== (origAddr.address2 || '') ||
        editDeliveryAddress.city !== (origAddr.city || '') ||
        editDeliveryAddress.state !== (origAddr.state || '') ||
        editDeliveryAddress.zip !== (origAddr.zip || '')) {
      updates.deliveryAddress = editDeliveryAddress;
    }
    return updates;
  }

  async function saveNonFinancialChanges() {
    const updates = getNonFinancialUpdates();
    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      return;
    }
    setAmendProcessing(true);
    try {
      await updateOrder(updates);
      setIsEditing(false);
      setToast('Order updated successfully');
      setTimeout(() => setToast(null), 3000);
    } catch {
      alert('Failed to save changes');
    } finally {
      setAmendProcessing(false);
    }
  }

  async function confirmAmendment() {
    if (!order || !preview) return;
    setAmendProcessing(true);
    try {
      // Save non-financial changes alongside the amendment
      const nonFinancialUpdates = getNonFinancialUpdates();
      if (Object.keys(nonFinancialUpdates).length > 0) {
        await updateOrder(nonFinancialUpdates);
      }

      const res = await fetch(`/api/v1/admin/orders/${orderId}/amend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          items: editItems,
          deliveryFee: editDeliveryFee,
          notes: amendNotes || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const amendment = data.data.amendment;
        if (amendment.amountDelta > 0 && amendment.draftOrderId) {
          // Positive delta -- offer to send amendment invoice
          if (confirm(`Amendment invoice created ($${amendment.amountDelta.toFixed(2)}). Send invoice email to customer now?`)) {
            await sendAmendmentInvoice(amendment.id);
          }
        } else if (amendment.amountDelta < 0) {
          // Negative delta -- open the action sheet's refund zone prefilled
          setPendingAmendmentId(amendment.id);
          setRefundAmount(Math.abs(amendment.amountDelta));
          setRefundReason('Order amendment');
          setRefundType('custom');
          setShowActionSheet(true);
        }
        setIsEditing(false);
        setPreview(null);
        await fetchOrder();
      } else {
        alert(data.error || 'Failed to confirm amendment');
      }
    } catch {
      alert('Failed to confirm amendment');
    } finally {
      setAmendProcessing(false);
    }
  }

  async function sendAmendmentInvoice(amendmentId: string) {
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/send-amendment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amendmentId }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Invoice sent to ${data.data.sentTo}`);
        await fetchOrder();
      } else {
        alert(data.error || 'Failed to send invoice');
      }
    } catch {
      alert('Failed to send invoice');
    }
  }

  async function processRefund() {
    if (!order) return;
    setRefundProcessing(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount,
          reason: refundReason || 'Order amendment',
          amendmentId: pendingAmendmentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // The server refunds even when the linked amendment couldn't be
        // marked REFUNDED (amount mismatch etc.) — surface that, don't
        // report an unqualified success.
        alert(
          data.warning
            ? `Refund of $${refundAmount.toFixed(2)} processed — WARNING: ${data.warning}`
            : `Refund of $${refundAmount.toFixed(2)} processed successfully`
        );
        setShowActionSheet(false);
        setPendingAmendmentId(null);
        setRefundAmount(0);
        setRefundReason('');
        setRefundType('custom');
        await fetchOrder();
      } else {
        alert(data.error || 'Failed to process refund');
      }
    } catch {
      alert('Failed to process refund');
    } finally {
      setRefundProcessing(false);
    }
  }

  const returnRefundTotal = order?.items.reduce((sum, item) => {
    const qty = returnItems[item.id] || 0;
    return sum + qty * item.price;
  }, 0) || 0;

  const returnItemCount = Object.values(returnItems).reduce((sum, qty) => sum + qty, 0);

  async function processReturn() {
    if (!order) return;
    setReturnProcessing(true);
    try {
      // Only send the order-item id and quantity. Price, product, and variant
      // are resolved server-side from the stored OrderItem, so there is nothing
      // here a tampered client could use to inflate the refund.
      const itemsToReturn = order.items
        .filter((item) => (returnItems[item.id] || 0) > 0)
        .map((item) => ({
          orderItemId: item.id,
          returnQuantity: returnItems[item.id],
        }));

      const res = await fetch(`/api/v1/admin/orders/${orderId}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: itemsToReturn,
          reason: returnReason || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowReturnDialog(false);
        setReturnItems({});
        setReturnReason('');
        await fetchOrder();
        alert(`Return processed: $${data.data.amount.toFixed(2)} refunded, ${data.data.itemsReturned} item(s) returned to inventory`);
      } else {
        alert(data.error || 'Failed to process return');
      }
    } catch {
      alert('Failed to process return');
    } finally {
      setReturnProcessing(false);
    }
  }

  async function openCancelDialog() {
    setCancelNote('');
    setIssueRefund(false);
    setCancelProcessing(false);
    setCancelEmailPreview('');
    setShowCancelDialog(true);

    // Fetch preview HTML
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true }),
      });
      const data = await res.json();
      if (data.success) {
        setCancelEmailPreview(data.html);
      }
    } catch {
      console.error('Failed to load cancel email preview');
    }
  }

  function getCancelPreviewHtml(): string {
    if (!cancelEmailPreview) return '';
    if (!cancelNote) return cancelEmailPreview;

    const escaped = cancelNote
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const noteHtml = `
      <div style="background-color: #f9fafb; border-left: 4px solid #D4AF37; border-radius: 4px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;">Note from Party On Delivery</p>
        <p style="margin: 0; font-size: 14px; color: #1a1a1a; line-height: 1.5;">${escaped}</p>
      </div>`;

    return cancelEmailPreview.replace('<!--CUSTOM_NOTE-->', noteHtml);
  }

  async function processCancellation() {
    if (!order) return;
    setCancelProcessing(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customNote: cancelNote || undefined,
          issueRefund,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCancelDialog(false);
        await fetchOrder();
        alert(
          issueRefund && data.data?.refund
            ? `Order cancelled and refund of $${data.data.refund.amount.toFixed(2)} processed`
            : 'Order cancelled successfully'
        );
      } else {
        alert(data.error || 'Failed to cancel order');
      }
    } catch {
      alert('Failed to cancel order');
    } finally {
      setCancelProcessing(false);
    }
  }

  async function updateOrder(updates: Record<string, unknown>): Promise<void> {
    if (!order) return;
    const prev = order;

    // Optimistic: reflect status changes instantly (stepper/sticky bar), then
    // reconcile with the server; roll back + refetch if the write fails.
    const optimistic: Partial<OrderDetail> = {};
    if (typeof updates.status === 'string') optimistic.status = updates.status;
    if (typeof updates.fulfillmentStatus === 'string') {
      optimistic.fulfillmentStatus = updates.fulfillmentStatus;
      // Mirrors the API: DELIVERED fulfillment auto-sets order status
      if (updates.fulfillmentStatus === 'DELIVERED') optimistic.status = 'DELIVERED';
    }
    if (Object.keys(optimistic).length > 0) setOrder({ ...prev, ...optimistic });
    setSaving(true);

    try {
      const response = await fetch(`/api/v1/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        await fetchOrder();
        // Show review prompt when fulfillment changes to DELIVERED
        if (updates.fulfillmentStatus === 'DELIVERED' && !prev.reviewRequestSentAt) {
          setShowReviewPrompt(true);
        }
      } else {
        setOrder(prev);
        await fetchOrder();
        alert('Failed to update order: ' + data.error);
      }
    } catch {
      setOrder(prev);
      await fetchOrder();
      alert('Failed to update order');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReview(): Promise<void> {
    if (!order) return;
    setSendingReview(true);
    try {
      const response = await fetch('/api/v1/admin/orders/send-review-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: [order.id] }),
      });
      const result = await response.json();
      if (result.success && result.data.sentCount > 0) {
        setToast('Review request sent');
        setTimeout(() => setToast(null), 3000);
      } else if (result.success && result.data.skippedCount > 0) {
        const detail = result.data.details?.[0];
        alert('Review request skipped: ' + (detail?.reason || 'Unknown reason'));
      } else {
        alert('Failed to send review request');
      }
    } catch {
      alert('Failed to send review request');
    } finally {
      setSendingReview(false);
      setShowReviewPrompt(false);
      await fetchOrder();
    }
  }

  async function handleLinkAffiliate() {
    if (!order || !affiliateCode.trim()) return;
    setAffiliateLinking(true);
    setAffiliateError('');
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linkAffiliateCode: affiliateCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (data.success) {
        setAffiliateCode('');
        await fetchOrder();
      } else {
        setAffiliateError(data.error || 'Failed to link affiliate');
      }
    } catch {
      setAffiliateError('Network error');
    } finally {
      setAffiliateLinking(false);
    }
  }

  async function handleUnlinkAffiliate() {
    if (!order?.affiliate) return;
    if (!confirm(`Remove ${order.affiliate.businessName} from this order? This will void their commission.`)) return;
    setAffiliateLinking(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unlinkAffiliate: true }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrder();
      } else {
        alert(data.error || 'Failed to remove affiliate');
      }
    } catch {
      alert('Network error');
    } finally {
      setAffiliateLinking(false);
    }
  }

  function openActionSheet(): void {
    // Fresh open: clear any leftover refund prefill from an abandoned flow
    setRefundType('custom');
    setRefundAmount(0);
    setRefundReason('');
    setPendingAmendmentId(null);
    setShowActionSheet(true);
  }

  function openReturnDialog(): void {
    setReturnItems({});
    setReturnReason('');
    setShowReturnDialog(true);
  }

  function handlePrint(): void {
    window.print();
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2500);
  };

  function buildOrderSummaryText(o: OrderDetail): string {
    const lines: string[] = [];
    lines.push(`Order #${o.orderNumber} - ${o.customer.name || o.customerSnapshot.name || 'Guest'}`);

    if (o.groupOrderV2?.isGroupOrder) {
      lines.push(`Group Dashboard: ${o.groupOrderV2.name}${o.groupOrderV2.hostName ? ` (Host: ${o.groupOrderV2.hostName})` : ''}`);
    } else if (o.groupOrder.isGroupOrder) {
      lines.push(`Group Order: ${o.groupOrder.name || o.groupOrder.shareCode}`);
    }

    const deliveryDate = new Date(o.delivery.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    lines.push(`Delivery: ${deliveryDate} at ${o.delivery.time}`);

    const addr = o.delivery.address;
    const addrParts = [addr.address1, addr.address2].filter(Boolean).join(', ');
    lines.push(`Address: ${addrParts}, ${addr.city}, ${addr.state} ${addr.zip}`);

    if (o.delivery.phone) lines.push(`Phone: ${o.delivery.phone}`);
    if (o.customer.email) lines.push(`Email: ${o.customer.email}`);

    lines.push('');
    lines.push('Items:');
    for (const item of o.items) {
      const variant = item.variantTitle && item.variantTitle !== 'Default Title' ? ` (${item.variantTitle})` : '';
      lines.push(`- ${item.quantity}x ${item.title}${variant} ($${item.price.toFixed(2)} ea) = $${item.total.toFixed(2)}`);
    }

    lines.push('');
    lines.push(`Subtotal: $${o.pricing.subtotal.toFixed(2)}`);
    if (o.pricing.discountAmount > 0) {
      lines.push(`Discount${o.pricing.discountCode ? ` (${o.pricing.discountCode})` : ''}: -$${o.pricing.discountAmount.toFixed(2)}`);
    }
    lines.push(`Delivery: $${o.pricing.deliveryFee.toFixed(2)}`);
    lines.push(`Tax: $${o.pricing.taxAmount.toFixed(2)}`);
    if (o.pricing.tipAmount > 0) {
      lines.push(`Tip: $${o.pricing.tipAmount.toFixed(2)}`);
    }
    lines.push(`Total: $${o.pricing.total.toFixed(2)}`);

    return lines.join('\n');
  }

  async function handleCopySummary() {
    if (!order) return;
    const text = buildOrderSummaryText(order);
    try {
      await navigator.clipboard.writeText(text);
      showToast('Order summary copied');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Order summary copied');
    }
  }

  async function handleSendReceipt() {
    if (!order) return;
    const email = order.customerSnapshot.email || order.customer.email;
    if (!confirm(`Send receipt to ${email}?`)) return;
    setSendingReceipt(true);
    try {
      const res = await fetch(`/api/v1/admin/orders/${order.id}/send-receipt`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Receipt sent to ${data.data.sentTo}`);
      } else {
        alert(data.error || 'Failed to send receipt');
      }
    } catch {
      alert('Failed to send receipt');
    } finally {
      setSendingReceipt(false);
    }
  }

  const canAmend = order && !['CANCELLED', 'REFUNDED'].includes(order.status);

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-8 w-32 bg-gray-200 rounded-lg" />
              <div className="h-10 w-48 bg-gray-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-24 bg-gray-200 rounded-xl" />
              <div className="h-24 bg-gray-200 rounded-xl" />
              <div className="h-24 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-red-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Order</h2>
            <p className="text-red-600 mb-6">{error || 'Order not found'}</p>
            <Link
              href="/ops/orders"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const showStickyBar = !isEditing && nextTransition(order) !== null;

  return (
    <>
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg shadow-lg animate-fade-in print:hidden">
          {toast}
        </div>
      )}
      {/* Screen View */}
      <div className={`p-4 md:p-8 bg-gray-50 min-h-screen print:hidden ${isEditing ? 'pb-48' : showStickyBar ? 'pb-28' : ''}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <DetailHeader
            order={order}
            isEditing={isEditing}
            canAmend={!!canAmend}
            sendingReceipt={sendingReceipt}
            onCopySummary={handleCopySummary}
            onPrint={handlePrint}
            onSendReceipt={handleSendReceipt}
            onOpenActions={openActionSheet}
            onOpenReturn={openReturnDialog}
            onEnterEdit={enterEditMode}
            onOpenCancel={openCancelDialog}
            onCancelEdit={cancelEditMode}
          />

          {/* Edit mode banner */}
          {isEditing && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-800 font-medium">
                Edit Mode -- You can edit delivery details, customer name, items, and delivery fee. Click &quot;Save Changes&quot; when done.
              </p>
            </div>
          )}

          {/* Status Cards */}
          <StatusStepperCard
            order={order}
            saving={saving}
            showReviewPrompt={showReviewPrompt}
            sendingReview={sendingReview}
            onUpdateOrder={updateOrder}
            onSendReview={handleSendReview}
            onDismissReview={() => setShowReviewPrompt(false)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Details */}
              {isEditing ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  title="Delivery Details"
                />
                <div className="p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Date</label>
                          <input
                            type="date"
                            value={editDeliveryDate}
                            onChange={(e) => setEditDeliveryDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Time Window</label>
                          <select
                            value={editDeliveryTime}
                            onChange={(e) => setEditDeliveryTime(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select time</option>
                            {TIME_SLOTS.map((slot) => (
                              <option key={slot} value={slot}>{slot}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Address Line 1</label>
                          <input
                            type="text"
                            value={editDeliveryAddress.address1}
                            onChange={(e) => setEditDeliveryAddress({ ...editDeliveryAddress, address1: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Address Line 2</label>
                          <input
                            type="text"
                            value={editDeliveryAddress.address2}
                            onChange={(e) => setEditDeliveryAddress({ ...editDeliveryAddress, address2: e.target.value })}
                            placeholder="Apt, suite, unit, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">City</label>
                            <input
                              type="text"
                              value={editDeliveryAddress.city}
                              onChange={(e) => setEditDeliveryAddress({ ...editDeliveryAddress, city: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">State</label>
                            <input
                              type="text"
                              value={editDeliveryAddress.state}
                              onChange={(e) => setEditDeliveryAddress({ ...editDeliveryAddress, state: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ZIP</label>
                            <input
                              type="text"
                              value={editDeliveryAddress.zip}
                              onChange={(e) => setEditDeliveryAddress({ ...editDeliveryAddress, zip: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Phone</label>
                          <input
                            type="tel"
                            value={editDeliveryPhone}
                            onChange={(e) => setEditDeliveryPhone(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Delivery Instructions</label>
                          <textarea
                            value={editDeliveryInstructions}
                            onChange={(e) => setEditDeliveryInstructions(e.target.value)}
                            rows={3}
                            placeholder="Gate code, special instructions, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          />
                        </div>
                      </div>
                </div>
              </div>
              ) : (
                <DeliveryCard order={order} />
              )}

              {/* Order Items */}
              {isEditing ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  }
                  title="Order Items"
                />

                {/* Product search */}
                  <div className="px-6 py-4 border-b border-gray-100 bg-blue-50" ref={searchRef}>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearchInput(e.target.value)}
                        placeholder="Search products to add..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {searchLoading && (
                        <div className="absolute right-3 top-3.5">
                          <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </div>
                      )}
                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                          {searchResults.map((product) => (
                            <div key={product.id}>
                              {product.variants.map((variant) => (
                                <button
                                  key={variant.id}
                                  onClick={() => addProduct(product, variant)}
                                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex justify-between items-center"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">{product.title}</p>
                                    {variant.title && variant.title !== 'Default Title' && (
                                      <p className="text-sm text-gray-500">{variant.title}</p>
                                    )}
                                  </div>
                                  <span className="text-gray-700 font-medium">
                                    ${parseFloat(variant.price as string).toFixed(2)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                <div className="divide-y divide-gray-100">
                  {editItems.map((item) => (
                      <div
                        key={`${item.productId}-${item.variantId}`}
                        className={`px-6 py-4 flex items-center justify-between ${item.isNew ? 'bg-green-50' : ''}`}
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            {item.title}
                            {item.isNew && (
                              <span className="ml-2 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">NEW</span>
                            )}
                          </p>
                          {item.variantTitle && (
                            <p className="text-sm text-gray-500">{item.variantTitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600">${item.price.toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateItemQuantity(item.productId, item.variantId, -1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                            >
                              -
                            </button>
                            <span className="w-8 text-center font-semibold">{item.quantity}</span>
                            <button
                              onClick={() => updateItemQuantity(item.productId, item.variantId, 1)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-20 text-right font-medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            onClick={() => removeItem(item.productId, item.variantId)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                            title="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Pricing Summary */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900 font-medium">${order.pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {order.pricing.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        Discount {order.pricing.discountCode && (
                          <span className="inline-flex px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded ml-2">
                            {order.pricing.discountCode}
                          </span>
                        )}
                      </span>
                      <span className="text-green-600 font-medium">-${order.pricing.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">$</span>
                      <input
                        type="number"
                        value={editDeliveryFee}
                        onChange={(e) => {
                          setEditDeliveryFee(parseFloat(e.target.value) || 0);
                          setPreview(null);
                        }}
                        step="0.01"
                        min="0"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax (8.25%)</span>
                    <span className="text-gray-900 font-medium">${order.pricing.taxAmount.toFixed(2)}</span>
                  </div>
                  {order.pricing.tipAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tip</span>
                      <span className="text-amber-600 font-medium">${order.pricing.tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xl font-bold pt-3 mt-3 border-t border-gray-200">
                    <span>Total</span>
                    <span className="text-blue-600">${order.pricing.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              ) : (
                <ItemsCard order={order} />
              )}

              {/* Amendment History */}
              {order.amendments && order.amendments.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <SectionHeader
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                    title="Amendment History"
                  />
                  <div className="divide-y divide-gray-100">
                    {order.amendments.map((amendment) => (
                      <div key={amendment.id} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(amendment.resolution)}`}>
                              {amendment.resolution}
                            </span>
                            <span className="text-sm font-medium text-gray-700">
                              {amendment.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(amendment.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">
                            ${amendment.previousTotal.toFixed(2)} &rarr; ${amendment.newTotal.toFixed(2)}
                          </span>
                          <span className={`font-semibold ${amendment.amountDelta > 0 ? 'text-red-600' : amendment.amountDelta < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                            {amendment.amountDelta > 0 ? '+' : ''}${amendment.amountDelta.toFixed(2)}
                          </span>
                        </div>
                        {/* Show changes details */}
                        <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                          {amendment.changes.added?.map((item, i) => (
                            <p key={`a-${i}`}>+ Added {item.quantity}x {item.title} (${item.price.toFixed(2)})</p>
                          ))}
                          {amendment.changes.removed?.map((item, i) => (
                            <p key={`r-${i}`}>- Removed {item.quantity}x {item.title}</p>
                          ))}
                          {amendment.changes.modified?.map((item, i) => (
                            <p key={`m-${i}`}>~ {item.title}: qty {item.oldQuantity} &rarr; {item.newQuantity}</p>
                          ))}
                          {amendment.changes.deliveryFeeChange && (
                            <p>Delivery fee: ${amendment.changes.deliveryFeeChange.from.toFixed(2)} &rarr; ${amendment.changes.deliveryFeeChange.to.toFixed(2)}</p>
                          )}
                        </div>
                        {amendment.notes && (
                          <p className="mt-2 text-sm text-gray-600 italic">{amendment.notes}</p>
                        )}
                        {/* Action buttons for pending amendments */}
                        {amendment.resolution === 'PENDING' && amendment.amountDelta > 0 && amendment.draftOrderId && (
                          <button
                            onClick={() => sendAmendmentInvoice(amendment.id)}
                            className="mt-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Send Invoice (${amendment.amountDelta.toFixed(2)})
                          </button>
                        )}
                        {amendment.resolution === 'PENDING' && amendment.amountDelta < 0 && (() => {
                          // Seed the netted remainder, not the full |amountDelta| —
                          // refunds recorded since the amendment was created must not
                          // be offered again on a retry (PR #225 security review).
                          const prefill = computeAmendmentRefundPrefill(amendment, order.refunds?.items ?? []);
                          return (
                            <button
                              onClick={() => {
                                setPendingAmendmentId(amendment.id);
                                setRefundAmount(prefill.suggestedAmount);
                                setRefundReason('Order amendment');
                                setRefundType('custom');
                                setShowActionSheet(true);
                              }}
                              disabled={refundProcessing || !order.payment.stripePaymentIntentId}
                              className="mt-2 px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={!order.payment.stripePaymentIntentId ? 'No Stripe payment found for this order' : ''}
                            >
                              {prefill.fullyCovered
                                ? 'Review Refund (already covered)'
                                : `Process Refund ($${prefill.suggestedAmount.toFixed(2)})`}
                            </button>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  }
                  title="Notes"
                />
                <div className="p-6 space-y-4">
                  {order.notes.customer && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Customer Note</p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-800">
                        {order.notes.customer}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Internal Note</p>
                    <textarea
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value)}
                      onBlur={() => {
                        if (internalNote !== order.notes.internal) {
                          updateOrder({ internalNote });
                        }
                      }}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Add internal notes about this order..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Customer & Payment */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                  title="Customer"
                />
                <div className="p-6 space-y-4">
                  <div>
                    {isEditing ? (
                      <>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-semibold text-gray-900"
                        />
                      </>
                    ) : (
                      <p className="font-semibold text-gray-900 text-lg">
                        {order.customer.name || order.customerSnapshot.name || 'Guest'}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email</p>
                    <a
                      href={`mailto:${order.customer.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {order.customer.email}
                    </a>
                  </div>
                  {(order.customer.phone || order.customerSnapshot.phone) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Phone</p>
                      <a
                        href={`tel:${order.customer.phone || order.customerSnapshot.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {order.customer.phone || order.customerSnapshot.phone}
                      </a>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-100">
                    <Link
                      href={`/ops/customers?search=${encodeURIComponent(order.customer.email)}`}
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Customer Profile
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Group Order Info */}
              {order.groupOrder.isGroupOrder && order.groupOrder.id && (
                <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-100 bg-purple-50">
                    <span className="text-purple-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </span>
                    <h2 className="text-lg font-semibold text-purple-900">Part of Group Order</h2>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Parent Group</p>
                      <Link
                        href={`/ops/group-orders/${order.groupOrder.id}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-medium"
                      >
                        <span className="font-mono">{order.groupOrder.shareCode}</span>
                        {order.groupOrder.name && (
                          <span className="text-purple-600">- {order.groupOrder.name}</span>
                        )}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                      {order.groupOrder.status && (
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          order.groupOrder.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          order.groupOrder.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.groupOrder.status}
                        </span>
                      )}
                    </div>

                    {order.groupOrder.siblingOrders.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Other Orders in This Group ({order.groupOrder.siblingOrders.length})
                        </p>
                        <div className="space-y-2">
                          {order.groupOrder.siblingOrders.map((sibling) => (
                            <Link
                              key={sibling.id}
                              href={`/ops/orders/${sibling.id}`}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div>
                                <span className="font-mono text-sm text-gray-900">#{sibling.orderNumber}</span>
                                <span className="text-gray-500 ml-2">- {sibling.customerName}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">${sibling.total.toFixed(2)}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(sibling.status)}`}>
                                  {sibling.status}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Group Dashboard (V2) Info */}
              {order.groupOrderV2 && (
                <div className="bg-white rounded-xl shadow-sm border border-teal-200 overflow-hidden">
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-teal-100 bg-teal-50">
                    <span className="text-teal-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    </span>
                    <h2 className="text-lg font-semibold text-teal-900">Part of Group Dashboard</h2>
                    <Link
                      href={`/dashboard/${order.groupOrderV2.shareCode}`}
                      target="_blank"
                      className="ml-auto text-sm text-teal-600 hover:underline"
                    >
                      Open dashboard
                    </Link>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Dashboard</p>
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">{order.groupOrderV2.name}</span>
                        <span className="text-gray-500"> - Host: {order.groupOrderV2.hostName}</span>
                      </p>
                      <p className="mt-1 text-xs font-mono text-gray-400">{order.groupOrderV2.shareCode}</p>
                    </div>

                    {order.groupOrderV2.siblingOrders.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Other Orders in This Group ({order.groupOrderV2.siblingOrders.length})
                        </p>
                        <div className="space-y-2">
                          {order.groupOrderV2.siblingOrders.map((sibling) => (
                            <Link
                              key={sibling.id}
                              href={`/ops/orders/${sibling.id}`}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <div>
                                <span className="font-mono text-sm text-gray-900">#{sibling.orderNumber}</span>
                                <span className="text-gray-500 ml-2">- {sibling.customerName}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-gray-900">${sibling.total.toFixed(2)}</span>
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(sibling.fulfillmentStatus)}`}>
                                  {sibling.fulfillmentStatus}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <PaymentCard order={order} />

              {/* Affiliate Attribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                  title="Affiliate"
                />
                <div className="p-6">
                  {order.affiliate ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-800">
                            {order.affiliate.businessName}
                            <span className="ml-2 text-xs font-mono text-blue-600">({order.affiliate.code})</span>
                          </p>
                          <p className="text-xs text-blue-600">{order.affiliate.contactName}</p>
                        </div>
                        <button
                          onClick={handleUnlinkAffiliate}
                          disabled={affiliateLinking}
                          className="text-xs text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">No affiliate attributed. Enter a code to link one.</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={affiliateCode}
                          onChange={(e) => { setAffiliateCode(e.target.value.toUpperCase()); setAffiliateError(''); }}
                          placeholder="e.g. POUR24"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                          onKeyDown={(e) => e.key === 'Enter' && handleLinkAffiliate()}
                        />
                        <button
                          onClick={handleLinkAffiliate}
                          disabled={affiliateLinking || !affiliateCode.trim()}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {affiliateLinking ? 'Linking...' : 'Link'}
                        </button>
                      </div>
                      {affiliateError && (
                        <p className="text-xs text-red-600">{affiliateError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Order Timeline */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  title="Timeline"
                />
                <div className="p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Created</span>
                    <span className="text-sm text-gray-900 font-medium">{formatDateTime(order.createdAt)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Last Updated</span>
                    <span className="text-sm text-gray-900 font-medium">{formatDateTime(order.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky next-transition bar (MARK PACKED → MARK OUT → MARK DELIVERED) */}
      {showStickyBar && (
        <DetailStickyBar order={order} saving={saving} onAdvance={updateOrder} onOpenActions={openActionSheet} />
      )}

      {/* Edit Bar (sticky bottom in edit mode) */}
      {isEditing && (
        <div className="fixed bottom-[var(--pod-tab-h,0px)] left-0 right-0 md:left-[232px] bg-white border-t-2 border-gray-200 shadow-2xl z-50 print:hidden">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            {preview ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-4 text-lg">
                    <span className="text-gray-500">Original: ${preview.previousTotal.toFixed(2)}</span>
                    <span className="text-gray-400">&rarr;</span>
                    <span className="font-bold text-gray-900">New: ${preview.newTotal.toFixed(2)}</span>
                    <span className={`font-bold text-lg ${preview.amountDelta > 0 ? 'text-red-600' : preview.amountDelta < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      ({preview.amountDelta > 0 ? '+' : ''}${preview.amountDelta.toFixed(2)})
                    </span>
                  </div>
                  {preview.warnings.length > 0 && (
                    <div className="text-sm text-yellow-700">
                      {preview.warnings.map((w, i) => (
                        <p key={i}>{w}</p>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={amendNotes}
                      onChange={(e) => setAmendNotes(e.target.value)}
                      placeholder="Amendment notes (optional)"
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={cancelEditMode}
                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  {preview.amountDelta > 0 ? (
                    <button
                      onClick={confirmAmendment}
                      disabled={amendProcessing}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {amendProcessing ? 'Processing...' : `Create Amendment Invoice ($${preview.amountDelta.toFixed(2)})`}
                    </button>
                  ) : preview.amountDelta < 0 ? (
                    <button
                      onClick={confirmAmendment}
                      disabled={amendProcessing || !order.payment.stripePaymentIntentId}
                      className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      title={!order.payment.stripePaymentIntentId ? 'No Stripe payment found -- cannot process refund' : ''}
                    >
                      {amendProcessing ? 'Processing...' : `Process Refund ($${Math.abs(preview.amountDelta).toFixed(2)})`}
                    </button>
                  ) : (
                    <button
                      onClick={confirmAmendment}
                      disabled={amendProcessing}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {amendProcessing ? 'Processing...' : 'Apply Changes'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-600">
                  {editItems.length} item{editItems.length !== 1 ? 's' : ''} | Delivery: ${editDeliveryFee.toFixed(2)}
                  {Object.keys(getNonFinancialUpdates()).length > 0 && (
                    <span className="ml-2 text-blue-600">+ delivery/customer changes</span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={cancelEditMode}
                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  {hasFinancialChanges() ? (
                    <button
                      onClick={fetchPreview}
                      disabled={amendProcessing}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {amendProcessing ? 'Loading...' : 'Preview Changes'}
                    </button>
                  ) : (
                    <button
                      onClick={saveNonFinancialChanges}
                      disabled={amendProcessing || Object.keys(getNonFinancialUpdates()).length === 0}
                      className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {amendProcessing ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Order action sheet (overflow actions + refund zone) */}
      <OrderActionSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        order={order}
        canAmend={!!canAmend}
        saving={saving}
        sendingReceipt={sendingReceipt}
        sendingReview={sendingReview}
        refundAmount={refundAmount}
        refundReason={refundReason}
        refundType={refundType}
        refundProcessing={refundProcessing}
        pendingAmendmentId={pendingAmendmentId}
        onRefundAmount={(amount) => {
          setRefundAmount(amount);
          // Any preset/manual amount change inside the sheet detaches the
          // refund from a prefilled amendment — otherwise a mismatched
          // amount could stamp that amendment REFUNDED (security review).
          setPendingAmendmentId(null);
        }}
        onRefundReason={setRefundReason}
        onRefundType={setRefundType}
        onMarkDelivered={() => {
          setShowActionSheet(false);
          updateOrder({ fulfillmentStatus: 'DELIVERED' });
        }}
        onPrint={handlePrint}
        onSendReceipt={handleSendReceipt}
        onAmend={enterEditMode}
        onRequestReview={() => {
          setShowActionSheet(false);
          handleSendReview();
        }}
        onProcessRefund={processRefund}
      />

      {/* Return Dialog */}
      {showReturnDialog && order && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Process Return -- Order #{order.orderNumber}</h3>
              <p className="text-sm text-gray-500 mt-1">Select items to return. Inventory will be restored and a Stripe refund will be issued.</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Item list */}
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
                {order.items.map((item) => {
                  const maxReturnable = item.quantity - item.refundedQuantity;
                  const currentQty = returnItems[item.id] || 0;
                  const lineRefund = currentQty * item.price;

                  return (
                    <div key={item.id} className="px-4 py-3 flex items-center gap-3">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                        {item.variantTitle && item.variantTitle !== 'Default Title' && (
                          <p className="text-xs text-gray-500">{item.variantTitle}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>Ordered: {item.quantity}</span>
                          {item.refundedQuantity > 0 && (
                            <span className="text-orange-600">Previously returned: {item.refundedQuantity}</span>
                          )}
                          <span>${item.price.toFixed(2)} each</span>
                        </div>
                        {item.bundleComponents && item.bundleComponents.length > 0 && (
                          <p className="text-xs text-blue-600 mt-0.5">Bundle -- component inventory will be restored</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {maxReturnable > 0 ? (
                          <>
                            <button
                              onClick={() => setReturnItems({ ...returnItems, [item.id]: Math.max(0, currentQty - 1) })}
                              disabled={currentQty === 0}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-30 text-sm"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-semibold text-sm">{currentQty}</span>
                            <button
                              onClick={() => setReturnItems({ ...returnItems, [item.id]: Math.min(maxReturnable, currentQty + 1) })}
                              disabled={currentQty >= maxReturnable}
                              className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 disabled:opacity-30 text-sm"
                            >
                              +
                            </button>
                            {lineRefund > 0 && (
                              <span className="text-sm font-medium text-gray-700 w-16 text-right">${lineRefund.toFixed(2)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">Fully returned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              {returnItemCount > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-800">
                      {returnItemCount} item{returnItemCount !== 1 ? 's' : ''} returning
                    </span>
                    <span className="text-lg font-bold text-orange-900">
                      ${returnRefundTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                  placeholder="e.g. Customer returned unopened items"
                />
              </div>

              {/* Warning */}
              {returnItemCount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    This will refund <strong>${returnRefundTotal.toFixed(2)}</strong> via Stripe and restore <strong>{returnItemCount}</strong> item{returnItemCount !== 1 ? 's' : ''} to inventory.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowReturnDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={processReturn}
                disabled={returnProcessing || returnItemCount === 0}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50"
              >
                {returnProcessing ? 'Processing...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Dialog */}
      {showCancelDialog && order && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Cancel Order #{order.orderNumber}</h3>
              <p className="text-sm text-gray-500 mt-1">The customer will receive a cancellation notification email.</p>
            </div>

            <div className="p-6 space-y-4">
              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 font-medium">This action cannot be undone.</p>
              </div>

              {/* Refund checkbox */}
              {order.financialStatus === 'PAID' && order.payment.stripePaymentIntentId && (
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={issueRefund}
                    onChange={(e) => setIssueRefund(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-900">
                    Issue a full refund (<strong>${order.pricing.total.toFixed(2)}</strong>) right now
                  </span>
                </label>
              )}

              {/* Custom note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Note (optional)</label>
                <textarea
                  value={cancelNote}
                  onChange={(e) => setCancelNote(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Add a personal message to the customer..."
                />
              </div>

              {/* Email preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Preview</label>
                {cancelEmailPreview ? (
                  <iframe
                    srcDoc={getCancelPreviewHtml()}
                    sandbox=""
                    className="w-full border border-gray-200 rounded-lg"
                    style={{ height: '400px' }}
                    title="Cancellation email preview"
                  />
                ) : (
                  <div className="w-full h-[400px] border border-gray-200 rounded-lg flex items-center justify-center text-gray-400">
                    Loading preview...
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Go Back
              </button>
              <button
                onClick={processCancellation}
                disabled={cancelProcessing}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelProcessing ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View */}
      <div ref={printRef} className="hidden print:block order-sheet">
        {/* Color-coded banner */}
        {(() => {
          const addr = order.delivery.address.address1?.toLowerCase() || '';
          const isMarina = addr.includes('13993 fm 2769') || addr.includes('rocky hills');
          const customerName = order.customer.name || order.customerSnapshot.name || 'Guest';
          const lastName = customerName.trim().split(/\s+/).pop() || customerName;
          const dayOfWeek = new Date(order.delivery.date).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
          const printTime = (order.delivery.time || '').replace(/:00\s*/g, ' ').trim();
          return (
            <div className={`rounded-lg px-4 py-3 mb-3 overflow-hidden ${isMarina ? 'bg-blue-600 text-white' : 'bg-yellow-400 text-black'}`}>
              <div className="flex items-center gap-4 overflow-hidden">
                <span className="text-[60px] font-black leading-none tracking-tight whitespace-nowrap">#{order.orderNumber}</span>
                <span className="text-[48px] font-light leading-none opacity-50">|</span>
                <span className="text-[60px] font-black leading-none tracking-tight whitespace-nowrap">{lastName}</span>
                <span className="text-[48px] font-light leading-none opacity-50">|</span>
                <span className="text-[60px] font-black leading-none tracking-tight whitespace-nowrap">{dayOfWeek} {printTime}</span>
              </div>
              {order.affiliate && (
                <div className="flex justify-end mt-1">
                  <span className="text-xl font-semibold opacity-85">{order.affiliate.businessName}</span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Group Order banner (V1) */}
        {order.groupOrder.isGroupOrder && (
          <div className="mb-3 px-2 py-1.5 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold">
            Group Order: {order.groupOrder.name || order.groupOrder.shareCode}
          </div>
        )}

        {/* Group Dashboard banner (V2) */}
        {order.groupOrderV2?.isGroupOrder && (
          <div className="mb-3 px-2 py-1.5 border-2 border-teal-600 bg-teal-50 rounded text-sm font-bold text-teal-900">
            Group Dashboard: {order.groupOrderV2.name}
            {order.groupOrderV2.hostName && ` (Host: ${order.groupOrderV2.hostName})`}
          </div>
        )}

        {/* Info boxes: Customer | Delivery | Partner */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 border border-gray-400 rounded p-2">
            <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">Customer</div>
            <div className="font-bold text-sm">{order.customer.name || order.customerSnapshot.name || 'Guest'}</div>
            <div className="text-sm">{order.customer.email}</div>
            {(order.customer.phone || order.customerSnapshot.phone) && (
              <div className="text-sm">Tel: {order.customer.phone || order.customerSnapshot.phone}</div>
            )}
          </div>
          <div className="flex-1 border border-gray-400 rounded p-2">
            <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">Delivery</div>
            <div className="font-bold text-sm">
              {new Date(order.delivery.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
              {' '}&middot;{' '}{order.delivery.time}
            </div>
            <div className="text-sm mt-1">
              {order.delivery.address.address1}
              {order.delivery.address.address2 ? `, ${order.delivery.address.address2}` : ''}
              <br />
              {order.delivery.address.city}, {order.delivery.address.state} {order.delivery.address.zip}
            </div>
            {order.delivery.phone && (
              <div className="text-sm mt-1">Tel: {order.delivery.phone}</div>
            )}
          </div>
          {order.affiliate && (
            <div className="flex-1 border border-gray-400 rounded p-2">
              <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">Partner</div>
              <div className="font-bold text-sm">{order.affiliate.businessName}</div>
              <div className="text-sm">{order.affiliate.contactName}</div>
              {order.affiliate.phone && (
                <div className="text-sm">Tel: {order.affiliate.phone}</div>
              )}
            </div>
          )}
        </div>

        {/* Delivery instructions */}
        {order.delivery.instructions && (
          <div className="mb-3 px-2 py-1.5 border-2 border-yellow-500 bg-yellow-50 rounded text-sm">
            <span className="font-bold">Instructions: </span>{order.delivery.instructions}
          </div>
        )}

        {/* Notes */}
        {(order.notes.customer || order.notes.internal) && (
          <div className="mb-3 space-y-1">
            {order.notes.customer && (
              <div className="px-2 py-1 border border-gray-400 rounded text-sm">
                <span className="font-bold">Customer Note: </span>{order.notes.customer}
              </div>
            )}
            {order.notes.internal && (
              <div className="px-2 py-1 border border-gray-400 rounded text-sm">
                <span className="font-bold">Internal Note: </span>{order.notes.internal}
              </div>
            )}
          </div>
        )}

        {/* Items table */}
        <table className="w-full mb-3 border-collapse text-lg">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1 px-2 font-bold">Item</th>
              <th className="text-center py-1 px-2 w-14 font-bold">Qty</th>
              <th className="text-right py-1 px-2 w-24 font-bold">Price</th>
              <th className="text-center py-1 w-20 font-bold">In Stock?</th>
              <th className="text-center py-1 w-20 font-bold">Packed?</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <>
                <tr key={item.id} className="border-b border-gray-300">
                  <td className="py-1 px-2">
                    <span className="font-medium">{item.title}</span>
                    {item.variantTitle && item.variantTitle !== 'Default Title' && (
                      <span className="text-gray-500 ml-1">({item.variantTitle})</span>
                    )}
                  </td>
                  <td className="text-center py-1 px-2 font-bold text-xl">{item.quantity}</td>
                  <td className="text-right py-1 px-2">${item.total.toFixed(2)}</td>
                  <td className="text-center py-1">
                    <span className="inline-block w-5 h-5 border-2 border-black rounded-sm"></span>
                  </td>
                  <td className="text-center py-1">
                    <span className="inline-block w-5 h-5 border-2 border-black rounded-sm"></span>
                  </td>
                </tr>
                {item.bundleComponents && item.bundleComponents.length > 0 && item.bundleComponents.map((bc, bcIdx) => (
                  <tr key={`${item.id}-bc-${bcIdx}`} className="border-b border-gray-200">
                    <td className="py-0.5 pl-6 pr-2 text-gray-500 text-[15px]">
                      |- {bc.title}
                      {bc.variantTitle && bc.variantTitle !== 'Default Title' && ` (${bc.variantTitle})`}
                    </td>
                    <td className="text-center py-0.5 text-base font-semibold text-gray-500">{item.quantity * bc.quantity}</td>
                    <td></td>
                    <td className="text-center py-0.5">
                      <span className="inline-block w-[18px] h-[18px] border-[1.5px] border-black rounded-sm"></span>
                    </td>
                    <td className="text-center py-0.5">
                      <span className="inline-block w-[18px] h-[18px] border-[1.5px] border-black rounded-sm"></span>
                    </td>
                  </tr>
                ))}
              </>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black">
              <td className="py-1.5 px-2 font-bold">
                Total Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </td>
              <td></td>
              <td></td>
              <td colSpan={2} className="text-center py-1.5">
                <span className="font-bold text-sm mr-1">Order Complete?</span>
                <span className="inline-block w-6 h-6 border-2 border-black rounded-sm align-middle"></span>
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Footer: discount + pricing summary */}
        <div className="flex gap-4">
          <div className="flex-1">
            {order.pricing.discountCode && (
              <div className="text-sm">
                <span className="font-bold">Discount: </span>
                <span className="font-mono">{order.pricing.discountCode}</span>
                {order.pricing.discountAmount > 0 && (
                  <span> (-${order.pricing.discountAmount.toFixed(2)})</span>
                )}
              </div>
            )}
          </div>
          <div className="w-48 border border-gray-400 rounded overflow-hidden text-sm">
            <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
              <span>Subtotal</span>
              <span>${order.pricing.subtotal.toFixed(2)}</span>
            </div>
            {order.pricing.discountAmount > 0 && (
              <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                <span>Discount</span>
                <span>-${order.pricing.discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
              <span>Delivery</span>
              <span>${order.pricing.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
              <span>Tax</span>
              <span>${order.pricing.taxAmount.toFixed(2)}</span>
            </div>
            {order.pricing.tipAmount > 0 && (
              <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                <span>Tip</span>
                <span>${order.pricing.tipAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between py-1 px-2 bg-gray-100 font-bold text-base">
              <span>TOTAL</span>
              <span>${order.pricing.total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
