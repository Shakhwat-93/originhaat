import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSettings } from '@/lib/db';
import { sendServerPurchaseEvent } from '@/lib/capi';
import { writeAuditLog } from '@/lib/audit';
import { formatName } from '@/lib/utils';

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
    const { incompleteOrderId, customer_name, phone, address, district, note, items, subtotal, delivery_charge, grand_total, discount_amount, coupon_code, utm_source, utm_medium, utm_campaign } = body;

    if (!customer_name || !phone || !address || !district || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const order_number = `OH-${Date.now()}`;
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

    const isAdmin = request.headers.get('x-admin-key') === (process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123');

    // Anti-spam order rate limit check by IP address
    if (!isAdmin) {
      try {
        const settings = await getSettings();
        const limitMinutes = settings?.order_limit_time ?? 10;

        if (limitMinutes > 0 && ip_address && ip_address !== 'unknown') {
          const cutOffTime = new Date(Date.now() - limitMinutes * 60000).toISOString();
          const { data: recentOrders } = await supabase
            .from('oh_orders')
            .select('id, created_at')
            .eq('ip_address', ip_address)
            .gte('created_at', cutOffTime)
            .neq('status', 'trash')
            .limit(1);

          if (recentOrders && recentOrders.length > 0) {
            return NextResponse.json({
              error: 'ORDER_LIMIT_REACHED',
              message: `আপনি ইতিমধ্যে একটি অর্ডার করেছেন। নতুন অর্ডার করতে হোয়াটসঅ্যাপে যোগাযোগ করুন।`
            }, { status: 429 });
          }
        }
      } catch (err) {
        console.error('Rate limit check error:', err);
      }
    }

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
          status: body.status || 'processing',
          ip_address,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
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
          status: body.status || 'processing',
          payment_method: 'cod',
          ip_address,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null
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

    const orderItems = items.map((item: any) => {
      // Admin format (has product_id directly)
      if (item.product_id) {
        return {
          order_id: order.id,
          product_id: item.product_id,
          product_slug: item.product_slug || '',
          product_name: item.product_name,
          product_image: item.product_image || null,
          price: Number(item.price),
          quantity: Number(item.quantity),
          subtotal: Number(item.price) * Number(item.quantity),
          selected_variant: item.selected_variant || null,
        };
      }
      // Client format (has nested product object)
      const variantObj = item.product.variants?.find((v: any) => v.name === item.selectedVariant);
      const activePrice = variantObj && variantObj.price && variantObj.price > 0
        ? Number(variantObj.price)
        : Number(item.product.price);
      return {
        order_id: order.id,
        product_id: item.product.id,
        product_slug: item.product.slug,
        product_name: formatName(item.product.name_bn, item.product.name_en, item.product.display_name_lang) + (item.selectedVariant ? ` (${item.selectedVariant})` : ''),
        product_image: item.product.images?.[0] || null,
        price: activePrice,
        quantity: Number(item.quantity),
        subtotal: activePrice * Number(item.quantity),
        selected_variant: item.selectedVariant || null,
      };
    });

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

    // Check if order was placed via a landing page to fetch custom CAPI credentials
    let lpPixelId = null;
    let lpCapiToken = null;
    let lpCapiTestCode = null;
    try {
      const match = (note || '').match(/placed via Landing Page:\s*([^\s(]+)/i);
      const lpSlug = match ? match[1] : null;
      if (lpSlug) {
        const { data: lpData } = await supabase
          .from('oh_landing_pages')
          .select('pixel_id, capi_token, capi_test_code')
          .eq('slug', lpSlug)
          .single();
        if (lpData) {
          lpPixelId = lpData.pixel_id;
          lpCapiToken = lpData.capi_token;
          lpCapiTestCode = lpData.capi_test_code;
        }
      }
    } catch (err) {
      console.error('[LP Tracking Load Error]', err);
    }

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
        settings: {
          ...settings,
          tracking_fb_pixel_id: lpPixelId || settings?.tracking_fb_pixel_id,
          tracking_fb_capi_token: lpCapiToken || settings?.tracking_fb_capi_token,
          tracking_fb_capi_test_code: lpCapiTestCode || settings?.tracking_fb_capi_test_code
        } as any
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
// GET  /api/orders  →  list all orders (admin with pagination)
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

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '30', 10);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const dateFilter = searchParams.get('dateFilter') || 'all';
  const productFilter = searchParams.get('productFilter') || '';
  const locationFilter = searchParams.get('locationFilter') || 'all';
  const assignedToFilter = searchParams.get('assignedToFilter') || 'all';

  let query = supabase
    .from('oh_orders')
    .select('*, oh_order_items (*)', { count: 'exact' });

  // 1. Product Filter (requires inner join for child items)
  if (productFilter) {
    query = supabase
      .from('oh_orders')
      .select('*, oh_order_items!inner (*)', { count: 'exact' })
      .eq('oh_order_items.product_name', productFilter);
  }

  // 2. Status Filter
  if (status) {
    query = query.eq('status', status);
  } else {
    // Exclude trash by default when no status filter is selected
    query = query.neq('status', 'trash');
  }

  // 3. Search Filter (customer name, phone, order number)
  if (search) {
    const searchTrim = search.trim();
    query = query.or(`customer_name.ilike.%${searchTrim}%,phone.ilike.%${searchTrim}%,order_number.ilike.%${searchTrim}%`);
  }

  // 4. Date Filter
  if (dateFilter !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateFilter === 'today') {
      query = query.gte('created_at', today.toISOString());
    } else if (dateFilter === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      query = query
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString());
    } else if (dateFilter === 'week') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('created_at', sevenDaysAgo.toISOString());
    }
  }

  // 5. Location Filter
  if (locationFilter === 'inside') {
    query = query.eq('district', 'Dhaka');
  } else if (locationFilter === 'outside') {
    query = query.neq('district', 'Dhaka');
  }

  // 6. Assigned To Filter
  if (assignedToFilter !== 'all') {
    if (assignedToFilter === 'unassigned') {
      query = query.is('assigned_to', null);
    } else {
      query = query.eq('assigned_to', assignedToFilter);
    }
  }

  // Order and Pagination Range
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to fetch orders:', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }

  return NextResponse.json({
    orders: data,
    totalCount: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// ──────────────────────────────────────────
// PATCH  /api/orders  →  update order status (admin)
// ──────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const adminUsername = request.headers.get('x-admin-username') || 'admin';

  try {
    const body = await request.json();

    // Check if it's a bulk operation
    if (Array.isArray(body.orderIds)) {
      const { orderIds, assigned_to, status } = body;
      const updateFields: any = {
        updated_at: new Date().toISOString()
      };
      if (assigned_to !== undefined) updateFields.assigned_to = assigned_to;
      if (status !== undefined) updateFields.status = status;

      const { error } = await supabase
        .from('oh_orders')
        .update(updateFields)
        .in('id', orderIds);

      if (error) {
        console.error('Bulk update error:', error);
        return NextResponse.json({ error: 'Failed to update orders in bulk' }, { status: 500 });
      }

      await writeAuditLog(
        adminUsername,
        'BULK_UPDATE_ORDERS',
        `Bulk updated ${orderIds.length} orders. Assigned to: ${assigned_to || 'unassigned'}, Status: ${status || 'no change'}`,
        request.headers.get('x-forwarded-for') || 'unknown'
      );

      return NextResponse.json({ success: true, message: `Successfully updated ${orderIds.length} orders.` });
    }

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
      items,
      assigned_to
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
    if (assigned_to !== undefined) updateFields.assigned_to = assigned_to;
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

    try {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      await writeAuditLog(
        adminUsername,
        'UPDATE_ORDER',
        `Updated order #${existingOrder.order_number}. Fields changed: ${Object.keys(updateFields).filter(k => k !== 'updated_at').join(', ')}`,
        ipAddress
      );
    } catch (logErr) {
      console.error('Audit logging failed:', logErr);
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
  const adminUsername = request.headers.get('x-admin-username') || 'admin';
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

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

      await writeAuditLog(adminUsername, 'EMPTY_TRASH', 'Emptied all orders from trash bin', ipAddress);
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }

    // Get order number before deletion
    const { data: orderToDelete } = await supabase
      .from('oh_orders')
      .select('order_number')
      .eq('id', id)
      .single();

    // Delete order permanently
    const { error } = await supabase
      .from('oh_orders')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await writeAuditLog(
      adminUsername,
      'PERMANENT_DELETE_ORDER',
      `Permanently deleted order #${orderToDelete?.order_number || id}`,
      ipAddress
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE Order error:', err);
    return NextResponse.json({ error: 'Failed to delete order permanently' }, { status: 500 });
  }
}
