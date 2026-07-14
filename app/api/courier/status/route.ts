import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getValidPathaoToken } from '@/lib/pathao';
import { getSteadfastSettings } from '@/lib/steadfast';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

const STEADFAST_BASE = 'https://portal.packzy.com/api/v1';

/**
 * GET /api/courier/status?type=pathao|steadfast&consignment_id=XXX
 * Fetches live courier status for a single consignment.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'pathao' | 'steadfast'
    const consignmentId = searchParams.get('consignment_id');

    if (!type || !consignmentId) {
      return NextResponse.json({ error: 'type and consignment_id are required' }, { status: 400 });
    }

    if (type === 'pathao') {
      const auth = await getValidPathaoToken();
      if (!auth) return NextResponse.json({ error: 'Pathao not configured' }, { status: 401 });

      const res = await fetch(`${auth.baseUrl}/aladdin/api/v1/orders/${consignmentId}/info`, {
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      const status = data?.data?.order_status || data?.data?.status || null;
      return NextResponse.json({ status, raw: data?.data || null });
    }

    if (type === 'steadfast') {
      const settings = await getSteadfastSettings();
      if (!settings?.steadfast_api_key || !settings?.steadfast_secret_key) {
        return NextResponse.json({ error: 'Steadfast not configured' }, { status: 401 });
      }

      const res = await fetch(`${STEADFAST_BASE}/status_by_cid/${consignmentId}`, {
        headers: {
          'Api-Key': settings.steadfast_api_key,
          'Secret-Key': settings.steadfast_secret_key,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      const status = data?.delivery_status || null;
      return NextResponse.json({ status, raw: data });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

/**
 * GET /api/courier/status?all=true
 * Returns all orders that have been sent to Pathao or Steadfast.
 */
export async function POST(req: NextRequest) {
  try {
    // Fetch all orders with any courier consignment
    const { data: orders, error } = await supabase
      .from('oh_orders')
      .select(`
        id, order_number, customer_name, phone, district, address,
        grand_total, status, created_at,
        pathao_consignment_id, pathao_order_status, pathao_delivery_fee, pathao_sent_at,
        steadfast_consignment_id, steadfast_tracking_code, steadfast_order_status, steadfast_sent_at,
        oh_order_items(id, product_name, quantity, price)
      `)
      .or('pathao_consignment_id.not.is.null,steadfast_consignment_id.not.is.null')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ orders: orders || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
