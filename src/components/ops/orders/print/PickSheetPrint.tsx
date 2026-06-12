'use client';

import React, { ReactElement } from 'react';
import { formatAddress, formatCurrency } from '../format';
import { loadCachedChecks } from '../usePickChecks';
import type { Order } from '../types';

/**
 * Print-only pick sheets: one full page per order with a color-coded banner,
 * customer/delivery/partner info boxes, the item checklist (reflecting the
 * prefetched pick state from the localStorage cache), and a financial
 * summary. Render inside a `hidden print:block` container; callers must
 * prefetch pick state (fetchChecks → cacheChecks) before mounting so the
 * sheet reflects cross-device updates.
 * Extracted verbatim from the ops Orders page (Phase 1).
 */
export default function PickSheetPrint({ orders }: { orders: Order[] }): ReactElement {
  return (
    <>
      {orders.map((order, pageIdx) => {
        const addr = order.deliveryAddress;
        const addrStr = addr ? formatAddress(addr) : '';
        return (
          <div key={order.id} className={`order-sheet ${pageIdx > 0 ? 'break-before-page' : ''}`} style={pageIdx > 0 ? { pageBreakBefore: 'always' } : undefined}>
            {/* Color-coded banner */}
            {(() => {
              const isMarina = addrStr.toLowerCase().includes('13993 fm 2769') || addrStr.toLowerCase().includes('rocky hills');
              const lastName = (order.customerName || 'Guest').trim().split(/\s+/).pop() || order.customerName;
              const dayOfWeek = new Date(order.deliveryDate).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
              const printTime = (order.deliveryTime || '').replace(/:00\s*/g, ' ').trim();
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

            {order.groupOrder && (
              <div className="mb-3 px-2 py-1.5 border-2 border-blue-500 bg-blue-50 rounded text-sm font-bold">
                Group Order: {order.groupOrder.name || order.groupOrder.shareCode}
              </div>
            )}

            {/* Info boxes: Customer | Delivery | Partner */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1 border border-gray-400 rounded p-2">
                <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">Customer</div>
                <div className="font-bold text-sm">{order.customerName}</div>
                <div className="text-sm">{order.customerEmail}</div>
                {order.customerPhone && (
                  <div className="text-sm">Tel: {order.customerPhone}</div>
                )}
              </div>
              <div className="flex-1 border border-gray-400 rounded p-2">
                <div className="font-bold text-xs uppercase tracking-wide border-b border-gray-300 pb-1 mb-1">Delivery</div>
                <div className="font-bold text-sm">
                  {new Date(order.deliveryDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  {' '}&middot;{' '}{order.deliveryTime}
                </div>
                {addrStr && <div className="text-sm mt-1">{addrStr}</div>}
                {order.deliveryPhone && (
                  <div className="text-sm mt-1">Tel: {order.deliveryPhone}</div>
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

            {order.deliveryInstructions && (
              <div className="mb-3 px-2 py-1.5 border-2 border-yellow-500 bg-yellow-50 rounded text-sm">
                <span className="font-bold">Instructions: </span>{order.deliveryInstructions}
              </div>
            )}

            {(order.customerNote || order.internalNote) && (
              <div className="mb-3 space-y-1">
                {order.customerNote && (
                  <div className="px-2 py-1 border border-gray-400 rounded text-sm">
                    <span className="font-bold">Customer Note: </span>{order.customerNote}
                  </div>
                )}
                {order.internalNote && (
                  <div className="px-2 py-1 border border-gray-400 rounded text-sm">
                    <span className="font-bold">Internal Note: </span>{order.internalNote}
                  </div>
                )}
              </div>
            )}

            {(() => {
              const printChecks = loadCachedChecks(order.id);
              return (
                <table className="w-full mb-3 border-collapse text-lg">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="text-left py-1 px-2 font-bold">Item</th>
                      <th className="text-center py-1 px-2 w-14 font-bold">Qty</th>
                      <th className="text-center py-1 w-20 font-bold">In Stock?</th>
                      <th className="text-center py-1 w-20 font-bold">Packed?</th>
                      <th className="text-center py-1 w-20 font-bold">Short By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="border-b border-gray-300">
                          <td className="py-1 px-2">
                            <span className="font-medium">{item.title}</span>
                          </td>
                          <td className="text-center py-1 px-2 font-bold text-xl">{item.quantity}</td>
                          <td className="text-center py-1">
                            <span className={`inline-block w-5 h-5 border-2 border-black rounded-sm ${printChecks[item.title]?.inStock ? 'bg-black' : ''}`}>
                              {printChecks[item.title]?.inStock && (
                                <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          </td>
                          <td className="text-center py-1">
                            <span className={`inline-block w-5 h-5 border-2 border-black rounded-sm ${printChecks[item.title]?.packed ? 'bg-black' : ''}`}>
                              {printChecks[item.title]?.packed && (
                                <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          </td>
                          <td className="text-center py-1 font-bold text-xl">
                            {printChecks[item.title]?.shortBy ? printChecks[item.title]?.shortBy : ''}
                          </td>
                        </tr>
                        {item.bundleComponents && item.bundleComponents.length > 0 && item.bundleComponents.map((bc, bcIdx) => {
                          const bcKey = `${item.title}::${bc.title}`;
                          return (
                            <tr key={`${idx}-bc-${bcIdx}`} className="border-b border-gray-200">
                              <td className="py-0.5 pl-6 pr-2 text-gray-500 text-[15px]">
                                |- {bc.title}
                                {bc.variantTitle && bc.variantTitle !== 'Default Title' && ` (${bc.variantTitle})`}
                              </td>
                              <td className="text-center py-0.5 text-base font-semibold text-gray-500">{item.quantity * bc.quantity}</td>
                              <td className="text-center py-0.5">
                                <span className={`inline-block w-[18px] h-[18px] border-[1.5px] border-black rounded-sm ${printChecks[bcKey]?.inStock ? 'bg-black' : ''}`}>
                                  {printChecks[bcKey]?.inStock && (
                                    <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              </td>
                              <td className="text-center py-0.5">
                                <span className={`inline-block w-[18px] h-[18px] border-[1.5px] border-black rounded-sm ${printChecks[bcKey]?.packed ? 'bg-black' : ''}`}>
                                  {printChecks[bcKey]?.packed && (
                                    <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={4}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                              </td>
                              <td className="text-center py-0.5 text-base font-semibold text-gray-500">
                                {printChecks[bcKey]?.shortBy ? printChecks[bcKey]?.shortBy : ''}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black">
                      <td className="py-1.5 px-2 font-bold">
                        Total Items: {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </td>
                      <td></td>
                      <td colSpan={3} className="text-center py-1.5">
                        <span className="font-bold text-sm mr-1">Order Complete?</span>
                        <span className="inline-block w-6 h-6 border-2 border-black rounded-sm align-middle"></span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}

            <div className="w-48 border border-gray-400 rounded overflow-hidden text-sm ml-auto">
              <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                <span>Subtotal</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                <span>Delivery</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="flex justify-between py-0.5 px-2 border-b border-gray-200">
                <span>Tax</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
              <div className="flex justify-between py-1 px-2 bg-gray-100 font-bold text-base">
                <span>TOTAL</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
