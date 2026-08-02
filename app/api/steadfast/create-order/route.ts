import { NextRequest, NextResponse } from 'next/server';
import { getSteadfastSettings } from '@/lib/steadfast';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

const BASE_URL = 'https://portal.packzy.com/api/v1';

/**
 * POST /api/steadfast/create-order
 * Creates one or more orders on Steadfast Courier and saves consignment data back to oh_orders.
 * Body: { orderIds: string[] }  — array of oh_orders.id values
 */
export async function POST(req: NextRequest) {
  try {
    const { orderIds } = await req.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
    }

    const settings = await getSteadfastSettings();
    if (!settings?.steadfast_api_key || !settings?.steadfast_secret_key) {
      return NextResponse.json(
        { error: 'Steadfast credentials not configured. Please set them in Settings.' },
        { status: 401 }
      );
    }

    // Fetch orders from DB
    const { data: orders, error: fetchErr } = await supabase
      .from('oh_orders')
      .select('id,order_number,customer_name,phone,address,district,grand_total,note')
      .in('id', orderIds);

    if (fetchErr || !orders) {
      return NextResponse.json({ error: 'Failed to fetch orders from database' }, { status: 500 });
    }

    const results: Array<{ orderId: string; success: boolean; consignment_id?: string; tracking_code?: string; error?: string }> = [];

    for (const order of orders) {
      try {
        const recipientAddress = `${order.address}, ${order.district}`.substring(0, 240);
        const recipientPhone = order.phone.replace(/[^0-9]/g, '').slice(-11);

        const payload = {
          invoice: order.order_number,
          recipient_name: order.customer_name,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          cod_amount: Math.round(order.grand_total),
          note: order.note || `Order #${order.order_number} from Origin Haat`,
        };

        const response = await fetch(`${BASE_URL}/create_order`, {
          method: 'POST',
          headers: {
            'Api-Key': settings.steadfast_api_key,
            'Secret-Key': settings.steadfast_secret_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok || data.status !== 200) {
          results.push({
            orderId: order.id,
            success: false,
            error: data?.message || `Steadfast API error: HTTP ${response.status}`,
          });
          continue;
        }

        const consignmentId = String(data?.consignment?.consignment_id || '');
        const trackingCode = data?.consignment?.tracking_code || '';
        const orderStatus = data?.consignment?.status || '';

        // Save consignment info back to oh_orders
        await supabase
          .from('oh_orders')
          .update({
            steadfast_consignment_id: consignmentId,
            steadfast_tracking_code: trackingCode,
            steadfast_order_status: orderStatus,
            steadfast_sent_at: new Date().toISOString(),
            status: 'confirmed',
          })
          .eq('id', order.id);

        results.push({
          orderId: order.id,
          success: true,
          consignment_id: consignmentId,
          tracking_code: trackingCode
        });
      } catch (err: any) {
        results.push({ orderId: order.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} order(s) sent to Steadfast${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    });
  } catch (err: any) {
    console.error('[Steadfast Create Order]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
