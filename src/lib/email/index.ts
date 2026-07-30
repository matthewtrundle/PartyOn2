/**
 * Email Module
 * Centralized email functionality for Party On Delivery
 */

// Client and utilities
export { sendEmail, resend, formatCurrency, formatDate, formatTime } from './resend-client';

// Email service functions
export {
  sendOrderConfirmationEmail,
  sendDeliveryEnRouteEmail,
  sendDeliveryCompletedEmail,
  sendPaymentFailedEmail,
  sendRefundProcessedEmail,
  sendOrderCancellationEmail,
  sendFullMoonTicketEmail,
  sendFullMoonSaleAlert,
} from './email-service';

// Template types
export type { OrderConfirmationData } from './templates/order-confirmation';
export type { DeliveryUpdateData } from './templates/delivery-update';
export type { InvoiceEmailData } from './templates/invoice';
export type { ReceiptEmailData } from './templates/receipt';
export type { OrderCancellationData } from './templates/order-cancellation';

// Template generators
export { generateInvoiceEmail, generateInvoiceSubject } from './templates/invoice';
export { generateReceiptEmail, generateReceiptSubject } from './templates/receipt';
export { generateAffiliateProspectEmail } from './templates/affiliate-prospect';

// Prospect template types
export type { AffiliateProspectEmailData } from './templates/affiliate-prospect';
