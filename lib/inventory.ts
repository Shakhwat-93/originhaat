import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export interface StockItemToSync {
  product_id: string;
  quantity: number;
  selected_variant?: string | null;
}

export interface StockValidationResult {
  valid: boolean;
  error?: string;
  code?: 'OUT_OF_STOCK' | 'PRODUCT_NOT_FOUND' | 'INACTIVE_PRODUCT' | 'INVALID_QUANTITY';
  details?: {
    product_id: string;
    product_name?: string;
    requested_qty: number;
    available_stock: number;
    selected_variant?: string | null;
  }[];
}

// In-memory per-product async lock queue to ensure serial execution per product,
// preventing concurrent purchase race conditions and overselling.
const productQueues = new Map<string, Promise<any>>();

export function withProductLock<T>(productId: string, fn: () => Promise<T>): Promise<T> {
  const currentQueue = productQueues.get(productId) || Promise.resolve();
  const nextQueue = currentQueue
    .then(async () => {
      try {
        return await fn();
      } catch (err) {
        throw err;
      }
    })
    .finally(() => {
      if (productQueues.get(productId) === nextQueue) {
        productQueues.delete(productId);
      }
    });

  productQueues.set(productId, nextQueue);
  return nextQueue;
}

/**
 * Validates stock availability for an array of items before an order is placed.
 * Ensures requested quantity is positive, product exists, is active, and has sufficient stock.
 */
export async function validateStockAvailability(
  items: StockItemToSync[]
): Promise<StockValidationResult> {
  if (!items || items.length === 0) {
    return { valid: false, error: 'No items provided for stock validation', code: 'INVALID_QUANTITY' };
  }

  const details: StockValidationResult['details'] = [];

  for (const item of items) {
    if (!item.product_id) {
      return { valid: false, error: 'Product ID is missing on an order item', code: 'PRODUCT_NOT_FOUND' };
    }

    const qty = Number(item.quantity);
    if (!qty || qty <= 0 || isNaN(qty)) {
      return { valid: false, error: 'Invalid item quantity', code: 'INVALID_QUANTITY' };
    }

    const { data: product, error: fetchErr } = await supabase
      .from('oh_products')
      .select('id, name_bn, name_en, stock, is_active, variants')
      .eq('id', item.product_id)
      .single();

    if (fetchErr || !product) {
      return {
        valid: false,
        error: `পণ্যটি পাওয়া যায়নি (${item.product_id})`,
        code: 'PRODUCT_NOT_FOUND',
      };
    }

    if (product.is_active === false) {
      const pName = product.name_bn || product.name_en || 'পণ্যটি';
      return {
        valid: false,
        error: `"${pName}" বর্তমানে বিক্রয়ের জন্য সক্রিয় নেই।`,
        code: 'INACTIVE_PRODUCT',
      };
    }

    const currentBaseStock = Math.max(0, Number(product.stock) || 0);
    const pName = product.name_bn || product.name_en || 'পণ্যটি';

    // Variant validation
    if (item.selected_variant && Array.isArray(product.variants) && product.variants.length > 0) {
      const targetVariantName = item.selected_variant.trim().toLowerCase();
      const variantObj = product.variants.find((v: any) => {
        const vName = (v.name || '').trim().toLowerCase();
        return vName === targetVariantName || v.id === item.selected_variant;
      });

      if (variantObj) {
        if (typeof variantObj.stock === 'number') {
          const varStock = Math.max(0, Number(variantObj.stock) || 0);
          if (varStock < qty) {
            details.push({
              product_id: product.id,
              product_name: pName,
              requested_qty: qty,
              available_stock: varStock,
              selected_variant: item.selected_variant,
            });
            return {
              valid: false,
              error: `দুঃখিত, "${pName}" (${item.selected_variant}) পর্যাপ্ত স্টকে নেই। বর্তমান স্টক: ${varStock} টি।`,
              code: 'OUT_OF_STOCK',
              details,
            };
          }
        }
      }
    }

    // Base stock validation
    if (currentBaseStock < qty) {
      details.push({
        product_id: product.id,
        product_name: pName,
        requested_qty: qty,
        available_stock: currentBaseStock,
        selected_variant: item.selected_variant,
      });
      return {
        valid: false,
        error: `দুঃখিত, "${pName}" পর্যাপ্ত স্টকে নেই। বর্তমান স্টক: ${currentBaseStock} টি।`,
        code: 'OUT_OF_STOCK',
        details,
      };
    }
  }

  return { valid: true };
}

/**
 * Atomically deducts stock for order items.
 * Uses per-product serialization lock to eliminate concurrent overselling.
 * Updates variants JSON in oh_products and logs sale in oh_inventory_transactions,
 * which triggers the database stock decrement atomically without double deduction.
 * If any item fails, automatically rolls back previously deducted items in the batch.
 */
export async function atomicDeductStock(
  items: StockItemToSync[],
  referenceOrderNumber?: string
): Promise<{ success: boolean; error?: string; deductedItems?: StockItemToSync[] }> {
  if (!items || items.length === 0) return { success: true };

  const successfullyDeducted: StockItemToSync[] = [];

  for (const item of items) {
    if (!item.product_id) continue;
    const qty = Math.abs(Number(item.quantity) || 1);

    const result = await withProductLock(item.product_id, async () => {
      // 1. Fetch current product state
      const { data: product, error: fetchErr } = await supabase
        .from('oh_products')
        .select('id, name_en, name_bn, stock, variants, is_active')
        .eq('id', item.product_id)
        .single();

      if (fetchErr || !product) {
        return { success: false, error: `Product not found: ${item.product_id}` };
      }

      const pName = product.name_bn || product.name_en || 'পণ্যটি';
      const currentStock = Math.max(0, Number(product.stock) || 0);

      // Validate base stock
      if (currentStock < qty) {
        return {
          success: false,
          error: `দুঃখিত, "${pName}" পর্যাপ্ত স্টকে নেই। বর্তমান স্টক: ${currentStock} টি।`,
        };
      }

      let updatedVariants = product.variants;

      // 2. If variant selected, validate and deduct variant stock
      if (item.selected_variant && Array.isArray(product.variants) && product.variants.length > 0) {
        const targetVariantName = item.selected_variant.trim().toLowerCase();
        let variantMatched = false;

        for (const v of product.variants) {
          const vName = (v.name || '').trim().toLowerCase();
          if (vName === targetVariantName || v.id === item.selected_variant) {
            variantMatched = true;
            if (typeof v.stock === 'number') {
              const curVarStock = Math.max(0, Number(v.stock) || 0);
              if (curVarStock < qty) {
                return {
                  success: false,
                  error: `দুঃখিত, "${pName}" (${item.selected_variant}) পর্যাপ্ত স্টকে নেই। বর্তমান স্টক: ${curVarStock} টি।`,
                };
              }
            }
          }
        }

        if (variantMatched) {
          updatedVariants = product.variants.map((v: any) => {
            const vName = (v.name || '').trim().toLowerCase();
            if (vName === targetVariantName || v.id === item.selected_variant) {
              if (typeof v.stock === 'number') {
                return {
                  ...v,
                  stock: Math.max(0, (Number(v.stock) || 0) - qty),
                };
              }
            }
            return v;
          });

          // Update variants in oh_products
          const { error: variantUpdateErr } = await supabase
            .from('oh_products')
            .update({
              variants: updatedVariants,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);

          if (variantUpdateErr) {
            return { success: false, error: variantUpdateErr.message };
          }
        }
      }

      // 3. Record transaction in oh_inventory_transactions
      // The database trigger updates oh_products.stock = oh_products.stock + (-qty)
      const { error: txErr } = await supabase.from('oh_inventory_transactions').insert({
        product_id: product.id,
        quantity: -qty,
        transaction_type: 'sale',
        reference: referenceOrderNumber ? `Order #${referenceOrderNumber}` : 'Online Order',
        created_by: 'system',
      });

      if (txErr) {
        return { success: false, error: txErr.message };
      }

      return { success: true };
    });

    if (result.success) {
      successfullyDeducted.push(item);
    } else {
      console.error(`[Stock Deduction Failed] Rolling back batch: ${result.error}`);
      if (successfullyDeducted.length > 0) {
        await atomicRestoreStock(successfullyDeducted, referenceOrderNumber, 'Rollback failed order');
      }
      return { success: false, error: result.error };
    }
  }

  return { success: true, deductedItems: successfullyDeducted };
}

/**
 * Atomically restores stock to oh_products and variants.
 * Updates variants in oh_products and inserts return record into oh_inventory_transactions,
 * which triggers the database stock increment atomically without double restoration.
 */
export async function atomicRestoreStock(
  items: StockItemToSync[],
  referenceOrderNumber?: string,
  reason: string = 'Cancelled'
): Promise<{ success: boolean; error?: string }> {
  if (!items || items.length === 0) return { success: true };

  for (const item of items) {
    if (!item.product_id) continue;
    const qty = Math.abs(Number(item.quantity) || 1);

    await withProductLock(item.product_id, async () => {
      const { data: product, error: fetchErr } = await supabase
        .from('oh_products')
        .select('id, stock, variants')
        .eq('id', item.product_id)
        .single();

      if (fetchErr || !product) return;

      // 1. If variant was selected, restore variant stock in variants JSON
      if (item.selected_variant && Array.isArray(product.variants) && product.variants.length > 0) {
        const targetVariantName = item.selected_variant.trim().toLowerCase();
        let variantMatched = false;

        const updatedVariants = product.variants.map((v: any) => {
          const vName = (v.name || '').trim().toLowerCase();
          if (vName === targetVariantName || v.id === item.selected_variant) {
            variantMatched = true;
            if (typeof v.stock === 'number') {
              return {
                ...v,
                stock: Math.max(0, Number(v.stock) || 0) + qty,
              };
            }
          }
          return v;
        });

        if (variantMatched) {
          await supabase
            .from('oh_products')
            .update({
              variants: updatedVariants,
              updated_at: new Date().toISOString(),
            })
            .eq('id', product.id);
        }
      }

      // 2. Record return transaction in oh_inventory_transactions
      // The database trigger automatically updates oh_products.stock = oh_products.stock + qty
      await supabase.from('oh_inventory_transactions').insert({
        product_id: product.id,
        quantity: qty,
        transaction_type: 'return',
        reference: referenceOrderNumber ? `${reason} Order #${referenceOrderNumber}` : reason,
        created_by: 'system',
      });
    });
  }

  return { success: true };
}

const ACTIVE_ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const INACTIVE_ORDER_STATUSES = ['cancelled', 'fake', 'trash'];

/**
 * Handles stock synchronization when an order status changes.
 * Completely idempotent: prevents duplicate stock deductions or restorations.
 */
export async function syncOrderStockOnStatusChange(
  orderId: string,
  newStatus: string,
  oldStatus?: string,
  orderNumber?: string
): Promise<{ success: boolean; action: 'restored' | 'deducted' | 'none'; error?: string }> {
  try {
    const isNewActive = ACTIVE_ORDER_STATUSES.includes(newStatus);
    const isNewInactive = INACTIVE_ORDER_STATUSES.includes(newStatus);

    let prevStatus = oldStatus;
    if (!prevStatus) {
      const { data: order } = await supabase
        .from('oh_orders')
        .select('status, order_number')
        .eq('id', orderId)
        .single();
      prevStatus = order?.status;
      if (!orderNumber && order?.order_number) {
        orderNumber = order.order_number;
      }
    }

    const isOldActive = prevStatus ? ACTIVE_ORDER_STATUSES.includes(prevStatus) : false;
    const isOldInactive = prevStatus ? INACTIVE_ORDER_STATUSES.includes(prevStatus) : false;

    // Transition from ACTIVE to INACTIVE (e.g. processing -> cancelled / fake / trash)
    // -> RESTORE STOCK
    if (isOldActive && isNewInactive) {
      const { data: items } = await supabase
        .from('oh_order_items')
        .select('product_id, quantity, selected_variant')
        .eq('order_id', orderId);

      if (items && items.length > 0) {
        const stockItems: StockItemToSync[] = items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          selected_variant: it.selected_variant,
        }));
        await atomicRestoreStock(stockItems, orderNumber, `Status: ${newStatus.toUpperCase()}`);
        return { success: true, action: 'restored' };
      }
    }

    // Transition from INACTIVE to ACTIVE (e.g. cancelled -> processing / confirmed)
    // -> DEDUCT STOCK (Order reactivation)
    if (isOldInactive && isNewActive) {
      const { data: items } = await supabase
        .from('oh_order_items')
        .select('product_id, quantity, selected_variant')
        .eq('order_id', orderId);

      if (items && items.length > 0) {
        const stockItems: StockItemToSync[] = items.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          selected_variant: it.selected_variant,
        }));
        const deductRes = await atomicDeductStock(stockItems, orderNumber);
        return { success: deductRes.success, action: 'deducted', error: deductRes.error };
      }
    }

    // No stock change needed (e.g. pending -> confirmed, cancelled -> cancelled, etc.)
    return { success: true, action: 'none' };
  } catch (err: any) {
    console.error('[syncOrderStockOnStatusChange Error]:', err);
    return { success: false, action: 'none', error: err.message };
  }
}

/**
 * Backward compatibility wrapper for legacy callers.
 */
export async function syncProductStock(
  items: StockItemToSync[],
  mode: 'deduct' | 'restore' = 'deduct'
) {
  if (mode === 'deduct') {
    return atomicDeductStock(items);
  } else {
    return atomicRestoreStock(items);
  }
}
