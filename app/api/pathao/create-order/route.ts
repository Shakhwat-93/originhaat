import { NextRequest, NextResponse } from 'next/server';
import { getValidPathaoToken, getPathaoSettings } from '@/lib/pathao';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

/**
 * POST /api/pathao/create-order
 * Creates one or more orders on Pathao and saves consignment data back to oh_orders.
 * Body: { orderIds: string[] }  — array of oh_orders.id values
 */
export async function POST(req: NextRequest) {
  try {
    const { orderIds } = await req.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: 'orderIds array is required' }, { status: 400 });
    }

    const auth = await getValidPathaoToken();
    if (!auth) {
      return NextResponse.json(
        { error: 'No valid Pathao token. Please configure credentials in Settings → Pathao API.' },
        { status: 401 }
      );
    }

    const settings = await getPathaoSettings();
    const storeId = settings?.pathao_store_id;

    if (!storeId) {
      return NextResponse.json(
        { error: 'Pathao Store ID not configured. Please set it in Settings → Pathao API.' },
        { status: 400 }
      );
    }

    // Fetch orders with order items from DB
    const { data: orders, error: fetchErr } = await supabase
      .from('oh_orders')
      .select('id,order_number,customer_name,phone,address,district,grand_total,note,oh_order_items(product_name,quantity,selected_variant)')
      .in('id', orderIds);

    if (fetchErr || !orders) {
      return NextResponse.json({ error: 'Failed to fetch orders from database' }, { status: 500 });
    }

    const results: Array<{ orderId: string; success: boolean; consignment_id?: string; error?: string }> = [];

    for (const order of orders) {
      try {
        // Build recipient address ensuring ONLY the exact customer address without any trailing district or 'Dhaka'
        const recipientAddress = (order.address || '')
          .trim()
          .replace(/,\s*(inside\s+dhaka|outside\s+dhaka|dhaka|ঢাকা|ঢাকার\s*ভিতরে|ঢাকার\s*বাইরে)\s*$/gi, '')
          .trim()
          .substring(0, 220);

        const recipientPhone = order.phone.replace(/[^0-9]/g, '').slice(-11);

        // Format product details with variant/color and quantity
        const productDetails = (order.oh_order_items && order.oh_order_items.length > 0)
          ? order.oh_order_items.map((item: any) => {
              const variantStr = item.selected_variant ? ` (${item.selected_variant.trim()})` : '';
              return `${item.product_name}${variantStr} x${item.quantity}`;
            }).join(', ')
          : `Order #${order.order_number}`;

        const totalQuantity = (order.oh_order_items && order.oh_order_items.length > 0)
          ? order.oh_order_items.reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1), 0)
          : 1;

        const pathaoPayload = {
          store_id: storeId,
          merchant_order_id: order.order_number,
          recipient_name: order.customer_name,
          recipient_phone: recipientPhone,
          recipient_address: recipientAddress,
          delivery_type: 48, // Normal Delivery
          item_type: 2,       // Parcel
          item_quantity: totalQuantity,
          item_weight: 0.5,
          amount_to_collect: Math.round(order.grand_total),
          item_description: productDetails.substring(0, 200),
          special_instruction: (order.note || '').trim().substring(0, 200),
        };

        const pathaoRes = await fetch(`${auth.baseUrl}/aladdin/api/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify(pathaoPayload),
        });

        const pathaoData = await pathaoRes.json();

        if (!pathaoRes.ok) {
          results.push({
            orderId: order.id,
            success: false,
            error: pathaoData?.message || `Pathao API error: ${pathaoRes.status}`,
          });
          continue;
        }

        const consignmentId = pathaoData?.data?.consignment_id;
        const orderStatus = pathaoData?.data?.order_status;
        const deliveryFee = pathaoData?.data?.delivery_fee;

        // Save consignment info back to oh_orders
        await supabase
          .from('oh_orders')
          .update({
            pathao_consignment_id: consignmentId,
            pathao_order_status: orderStatus,
            pathao_delivery_fee: deliveryFee,
            pathao_sent_at: new Date().toISOString(),
            status: 'confirmed',
          })
          .eq('id', order.id);

        results.push({ orderId: order.id, success: true, consignment_id: consignmentId });
      } catch (err: any) {
        results.push({ orderId: order.id, success: false, error: err.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      message: `${successCount} order(s) sent to Pathao${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
    });
  } catch (err: any) {
    console.error('[Pathao Create Order]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
