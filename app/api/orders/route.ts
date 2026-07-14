import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSettings } from '@/lib/db';
import { sendServerPurchaseEvent } from '@/lib/capi';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// ──────────────────────────────────────────
// POST  /api/orders  →  create new order (customer)
// ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { incompleteOrderId, customer_name, phone, address, district, note, items, subtotal, delivery_charge, grand_total, discount_amount, coupon_code } = body;

    if (!customer_name || !phone || !address || !district || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const order_number = `OH-${Date.now()}`;
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

    let order = null;
    let orderError = null;

    if (incompleteOrderId) {
      // Upgrade existing incomplete order to pending
      const { data, error } = await supabase
        .from('oh_orders')
        .update({
          order_number,
          customer_name,
          phone,
          address,
          district,
          note: note || null,
          subtotal,
          delivery_charge,
          discount_amount: discount_amount || 0,
          coupon_code: coupon_code || null,
          grand_total,
          status: 'processing',
          ip_address,
          updated_at: new Date().toISOString()
        })
        .eq('id', incompleteOrderId)
        .select()
        .single();
      order = data;
      orderError = error;

      if (!orderError && order) {
        // Delete old items so we can re-insert them cleanly
        await supabase.from('oh_order_items').delete().eq('order_id', incompleteOrderId);
      }
    } else {
      // Create new order
      const { data, error } = await supabase
        .from('oh_orders')
        .insert({
          order_number,
          customer_name,
          phone,
          address,
          district,
          note: note || null,
          subtotal,
          delivery_charge,
          discount_amount: discount_amount || 0,
          coupon_code: coupon_code || null,
          grand_total,
          status: 'processing',
          payment_method: 'cod',
          ip_address
        })
        .select()
        .single();
      order = data;
      orderError = error;
    }

    if (orderError || !order) {
      console.error('Order upsert error:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    const orderItems = items.map((item: {
      product: { id: string; slug: string; name_bn: string; images: string[]; price: number };
      quantity: number;
    }) => ({
      order_id: order.id,
      product_id: item.product.id,
      product_slug: item.product.slug,
      product_name: item.product.name_bn,
      product_image: item.product.images?.[0] || null,
      price: item.product.price,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
    }));

    const { error: itemsError } = await supabase.from('oh_order_items').insert(orderItems);
    if (itemsError) {
      console.error('Order items insert error:', itemsError);
    } else if (orderItems.length > 0) {
      // Record sale in inventory logs (automatically decrements product stocks via database trigger)
      const inventoryTransactions = orderItems.map((item: any) => ({
        product_id: item.product_id,
        quantity: -Number(item.quantity),
        transaction_type: 'sale',
        reference: `Order #${order.order_number}`,
        created_by: 'system'
      }));
      const { error: invError } = await supabase.from('oh_inventory_transactions').insert(inventoryTransactions);
      if (invError) console.error('Inventory log insert error:', invError);
    }

    // Fetch settings dynamically to get CAPI keys
    const settings = await getSettings();

    // Trigger Conversions API (CAPI) events for Meta and TikTok
    try {
      const userAgent = request.headers.get('user-agent') || '';
      const capiItems = orderItems.map((item: any) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity
      }));

      // Fire CAPI asynchronously to keep checkout response fast
      sendServerPurchaseEvent({
        orderNumber: order.order_number,
        total: grand_total,
        customerName: customer_name,
        phone,
        ipAddress: ip_address,
        userAgent,
        items: capiItems,
        settings: settings as any
      }).catch(err => console.error('[CAPI Purchase Event Fire Error]', err));
    } catch (capiErr) {
      console.error('[CAPI Event Preparation Error]', capiErr);
    }

    return NextResponse.json({ success: true, order_id: order.id, order_number: order.order_number });
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// GET  /api/orders  →  list all orders (admin)
// ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Run automatic trash cleanup asynchronously in the database background
  const cleanupSql = `
    DELETE FROM oh_orders 
    WHERE status = 'trash' 
    AND updated_at < now() - (COALESCE((SELECT trash_auto_delete_days FROM oh_settings LIMIT 1), 30) || ' days')::interval;
  `;
  supabase.rpc('exec_sql', { query_text: cleanupSql }).then((res: any) => {
    if (res?.error) console.error('Failed to run trash auto-cleanup:', res.error);
  });

  const { data, error } = await supabase
    .from('oh_orders')
    .select('*, oh_order_items (*)')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({ orders: data });
}

// ──────────────────────────────────────────
// PATCH  /api/orders  →  update order status (admin)
// ──────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      orderId,
      status,
      customer_name,
      phone,
      address,
      district,
      note,
      delivery_charge,
      discount_amount,
      subtotal,
      grand_total,
      items
    } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Fetch existing order details first to get status and order number
    const { data: existingOrder, error: fetchOrderError } = await supabase
      .from('oh_orders')
      .select('order_number, status')
      .eq('id', orderId)
      .single();

    if (fetchOrderError || !existingOrder) {
      console.error('Failed to fetch existing order:', fetchOrderError);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (customer_name !== undefined) updateFields.customer_name = customer_name;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;
    if (district !== undefined) updateFields.district = district;
    if (note !== undefined) updateFields.note = note;
    if (delivery_charge !== undefined) updateFields.delivery_charge = Number(delivery_charge);
    if (discount_amount !== undefined) updateFields.discount_amount = Number(discount_amount);
    if (subtotal !== undefined) updateFields.subtotal = Number(subtotal);
    if (grand_total !== undefined) updateFields.grand_total = Number(grand_total);
    updateFields.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('oh_orders')
      .update(updateFields)
      .eq('id', orderId);

    if (error) {
      console.error('Order update error:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    // Handle status change inventory sync
    if (status !== undefined && status !== existingOrder.status) {
      if (status === 'cancelled') {
        // Return products to stock (record positive transaction)
        const { data: currentItems } = await supabase
          .from('oh_order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);
        
        if (currentItems && currentItems.length > 0) {
          const returnLogs = currentItems.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            transaction_type: 'return',
            reference: `Cancelled Order #${existingOrder.order_number}`,
            created_by: 'system'
          }));
          await supabase.from('oh_inventory_transactions').insert(returnLogs);
        }
      } else if (existingOrder.status === 'cancelled') {
        // Restore order: deduct products from stock (record negative transaction)
        const { data: currentItems } = await supabase
          .from('oh_order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);
        
        if (currentItems && currentItems.length > 0) {
          const saleLogs = currentItems.map(item => ({
            product_id: item.product_id,
            quantity: -Number(item.quantity),
            transaction_type: 'sale',
            reference: `Restored Order #${existingOrder.order_number}`,
            created_by: 'system'
          }));
          await supabase.from('oh_inventory_transactions').insert(saleLogs);
        }
      }
    }

    // If items are provided, replace them in the database
    if (items && Array.isArray(items)) {
      // Delete old items
      const { error: deleteError } = await supabase
        .from('oh_order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteError) {
        console.error('Failed to delete old items:', deleteError);
        return NextResponse.json({ error: 'Failed to update order items' }, { status: 500 });
      }

      if (items.length > 0) {
        const orderItems = items.map((item: any) => ({
          order_id: orderId,
          product_id: item.product_id,
          product_slug: item.product_slug,
          product_name: item.product_name,
          product_image: item.product_image || null,
          price: Number(item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.price) * Number(item.quantity),
        }));

        const { error: insertError } = await supabase
          .from('oh_order_items')
          .insert(orderItems);

        if (insertError) {
          console.error('Failed to insert new items:', insertError);
          return NextResponse.json({ error: 'Failed to insert new order items' }, { status: 500 });
        }

        // Adjust inventory transactions if order is active (not cancelled)
        const activeStatus = status !== undefined ? status : existingOrder.status;
        if (activeStatus !== 'cancelled') {
          // Delete old sale transactions for this order
          await supabase
            .from('oh_inventory_transactions')
            .delete()
            .in('reference', [`Order #${existingOrder.order_number}`, `Restored Order #${existingOrder.order_number}`])
            .eq('transaction_type', 'sale');

          // Insert new sale transactions
          const saleLogs = items.map((item: any) => ({
            product_id: item.product_id,
            quantity: -Number(item.quantity),
            transaction_type: 'sale',
            reference: `Order #${existingOrder.order_number}`,
            created_by: 'system'
          }));
          await supabase.from('oh_inventory_transactions').insert(saleLogs);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('PATCH API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ──────────────────────────────────────────
// DELETE /api/orders  →  permanently delete order or empty trash
// ──────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const empty = searchParams.get('empty') === 'true';

    if (empty) {
      // Empty all trash
      const { error } = await supabase
        .from('oh_orders')
        .delete()
        .eq('status', 'trash');

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Delete order permanently
    const { error } = await supabase
      .from('oh_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE Order error:', err);
    return NextResponse.json({ error: 'Failed to delete order permanently' }, { status: 500 });
  }
}
