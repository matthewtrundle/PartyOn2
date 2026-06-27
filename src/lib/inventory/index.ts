/**
 * Inventory Management System
 *
 * Centralized exports for all inventory-related services
 */

// Types
export type {
  ApiResponse,
  PaginationParams,
  ProductCreateInput,
  ProductUpdateInput,
  ProductFilters,
  ProductWithRelations,
  VariantCreateInput,
  VariantUpdateInput,
  InventoryAdjustment,
  InventoryTransfer,
  InventoryCount,
  LowStockItem,
  OrderFilters,
  CustomerFilters,
} from './types';

// Product Service
export {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  getProductTypes,
  getVendors,
  searchProducts,
} from './services/product-service';

// Variant Service
export {
  getVariantsByProduct,
  getVariant,
  getVariantBySku,
  createVariant,
  updateVariant,
  deleteVariant,
  bulkUpdatePrices,
  getLowInventoryVariants,
} from './services/variant-service';

// Inventory Service
export {
  getLocations,
  getDefaultLocation,
  createLocation,
  getProductInventory,
  getLocationInventory,
  adjustInventory,
  setInventoryCount,
  getLowStockAlerts,
  acknowledgeAlert,
  resolveAlert,
  getMovementHistory,
} from './services/inventory-service';

// Cart Service
export {
  getOrCreateCart,
  getCartById,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  setDeliveryInfo,
  applyDiscount,
  removeDiscount,
  associateWithGroupOrder,
  markCartConverted,
  markCartAbandoned,
  mergeGuestCart,
  validateCartMinimum,
  hasDeliveryInfo,
  cartToCheckoutData,
} from './services/cart-service';
export type { CartWithItems, AddToCartInput, UpdateCartItemInput, DeliveryInfo } from './services/cart-service';

// Feature Flag Service
export {
  isFeatureEnabled,
  isFeatureEnabledForUser,
  getAllFlags,
  setFeatureFlag,
  FEATURE_FLAGS,
} from './services/feature-flag-service';
export type { FeatureFlagKey } from './services/feature-flag-service';

// Order Service
export {
  createOrderFromCheckout,
  getOrderById,
  getOrderByNumber,
  getOrderByCheckoutSession,
  getCustomerOrders,
  getOrders,
  updateOrderStatus,
  updateFulfillmentStatus,
  createRefund,
  recomputeOrderFinancialStatus,
} from './services/order-service';
export type { OrderWithItems, OrderItemWithProduct } from './services/order-service';
