import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

// ──────────────────────────────────────────
// POST  /api/orders  →  create new order (customer)
// ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_name, phone, address, district, note, items, subtotal, delivery_charge, grand_total } = body;

    if (!customer_name || !phone || !address || !district || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const order_number = `OH-${Date.now()}`;
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

    const { data: order, error: orderError } = await supabase
      .from('oh_orders')
      .insert({ order_number, customer_name, phone, address, district, note: note || null, subtotal, delivery_charge, grand_total, status: 'pending', payment_method: 'cod', ip_address })
      .select()
      .single();

    if (orderError) {
      console.error('Order insert error:', orderError);
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
    if (itemsError) console.error('Order items insert error:', itemsError);

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
    const { orderId, status } = await request.json();
    if (!orderId || !status) {
      return NextResponse.json({ error: 'Missing orderId or status' }, { status: 400 });
    }

    const { error } = await supabase
      .from('oh_orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
