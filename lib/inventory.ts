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

/**
 * Deducts or restores stock in oh_products and its variants array
 * @param items Array of items with product_id, quantity, and selected_variant
 * @param mode 'deduct' (when order is placed/restored) | 'restore' (when order is cancelled)
 */
export async function syncProductStock(
  items: StockItemToSync[],
  mode: 'deduct' | 'restore' = 'deduct'
) {
  if (!items || items.length === 0) return;

  for (const item of items) {
    if (!item.product_id) continue;
    const qty = Math.abs(Number(item.quantity) || 1);
    const multiplier = mode === 'deduct' ? -1 : 1;
    const delta = multiplier * qty;

    try {
      // 1. Fetch current product data
      const { data: product, error: fetchErr } = await supabase
        .from('oh_products')
        .select('id, stock, variants')
        .eq('id', item.product_id)
        .single();

      if (fetchErr || !product) {
        console.error(`[Stock Sync] Product not found: ${item.product_id}`, fetchErr);
        continue;
      }

      let currentStock = Number(product.stock) || 0;
      let newStock = Math.max(0, currentStock + delta);
      let updatedVariants = product.variants;

      // 2. If variant is selected, update variant stock inside variants JSON array
      if (item.selected_variant && Array.isArray(product.variants) && product.variants.length > 0) {
        const targetVariantName = item.selected_variant.trim().toLowerCase();

        updatedVariants = product.variants.map((v: any) => {
          const vName = (v.name || '').trim().toLowerCase();
          if (vName === targetVariantName || v.id === item.selected_variant) {
            const currentVarStock = Number(v.stock ?? currentStock) || 0;
            const newVarStock = Math.max(0, currentVarStock + delta);
            return {
              ...v,
              stock: newVarStock,
            };
          }
          return v;
        });

        // If all variants have explicit stock numbers, recalculate total stock as sum of variants
        const hasAllVariantStocks = updatedVariants.every((v: any) => typeof v.stock === 'number');
        if (hasAllVariantStocks) {
          newStock = updatedVariants.reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
        }
      }

      // 3. Update oh_products
      const { error: updateErr } = await supabase
        .from('oh_products')
        .update({
          stock: newStock,
          variants: updatedVariants,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateErr) {
        console.error(`[Stock Sync] Failed to update product ${product.id}:`, updateErr);
      } else {
        console.log(`[Stock Sync] Updated product ${product.id}: stock=${newStock} (delta=${delta})`);
      }
    } catch (err) {
      console.error(`[Stock Sync] Exception for product ${item.product_id}:`, err);
    }
  }
}
