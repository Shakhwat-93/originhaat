import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    // Simple authentication
    const webhookSecret = process.env.WEBHOOK_SECRET || process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin123';
    if (token !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    // Steadfast sends webhook POST with consignment_id or tracking_code, and status
    const { consignment_id, status, tracking_code } = body;

    if (!consignment_id && !tracking_code) {
      return NextResponse.json({ error: 'Missing identifiers' }, { status: 400 });
    }

    // Find the corresponding order
    let query = supabase.from('oh_orders').select('id, status');
    if (consignment_id) {
      query = query.eq('steadfast_consignment_id', consignment_id);
    } else {
      query = query.eq('steadfast_tracking_code', tracking_code);
    }

    const { data: order, error: findError } = await query.single();

    if (findError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Map Steadfast status to standard order status
    let mainStatus = order.status;
    const cleanStatus = status?.toLowerCase() || '';

    if (cleanStatus.includes('delivered') || cleanStatus.includes('success')) {
      mainStatus = 'delivered';
    } else if (cleanStatus.includes('return') || cleanStatus.includes('cancel')) {
      mainStatus = 'cancelled';
    } else if (cleanStatus.includes('transit') || cleanStatus.includes('ship') || cleanStatus.includes('picked_up')) {
      mainStatus = 'shipped';
    }

    // Update order stats
    const { error: updateError } = await supabase
      .from('oh_orders')
      .update({
        steadfast_order_status: status,
        status: mainStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order_id: order.id, status: mainStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
