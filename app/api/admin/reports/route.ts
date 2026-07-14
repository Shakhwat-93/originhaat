import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate'); // ISO string or YYYY-MM-DD
    const endDate = searchParams.get('endDate');     // ISO string or YYYY-MM-DD
    const productId = searchParams.get('productId');

    let query = supabase
      .from('oh_orders')
      .select(`
        id, order_number, customer_name, status, created_at,
        subtotal, delivery_charge, discount_amount, grand_total,
        oh_order_items (
          id, product_id, product_name, quantity, price
        )
      `)
      .neq('status', 'trash'); // ignore trash orders in reports

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
