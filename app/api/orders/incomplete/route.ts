import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { formatName } from '@/lib/utils';
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      incompleteOrderId,
      customer_name,
      phone,
      address,
      district,
      note,
      items,
      subtotal,
      delivery_charge,
      grand_total,
      utm_source,
      utm_medium,
      utm_campaign
    } = body;

    // We only require customer_name and phone to create an incomplete order!
    if (!customer_name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required to track incomplete order' }, { status: 400 });
    }

    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';

    let orderId = incompleteOrderId;
    let orderNumber = '';

    if (orderId) {
      // Update existing incomplete order
      const { data: updatedOrder, error: updateError } = await supabase
        .from('oh_orders')
        .update({
          customer_name,
          phone,
          address: address || null,
          district: district || null,
          note: note || null,
          subtotal: subtotal || 0,
          delivery_charge: delivery_charge || 0,
          grand_total: grand_total || 0,
          ip_address,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (updateError) {
        console.error('Incomplete order update error:', updateError);
        return NextResponse.json({ error: 'Failed to update incomplete order' }, { status: 500 });
      }
      orderNumber = updatedOrder.order_number;

      // Delete existing order items
      await supabase.from('oh_order_items').delete().eq('order_id', orderId);
    } else {
      // Insert new incomplete order
      orderNumber = `INC-${Date.now()}`;
      const { data: newOrder, error: insertError } = await supabase
        .from('oh_orders')
        .insert({
          order_number: orderNumber,
          customer_name,
          phone,
          address: address || null,
          district: district || null,
          note: note || null,
          subtotal: subtotal || 0,
          delivery_charge: delivery_charge || 0,
          grand_total: grand_total || 0,
          status: 'incomplete',
          payment_method: 'cod',
          ip_address,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('Incomplete order insert error:', insertError);
        return NextResponse.json({ error: 'Failed to create incomplete order' }, { status: 500 });
      }
      orderId = newOrder.id;
    }

    // Insert order items if items are provided
    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => {
        const variantObj = item.product.variants?.find((v: any) => v.name === item.selectedVariant);
        const activePrice = variantObj && variantObj.price && variantObj.price > 0
          ? Number(variantObj.price)
          : Number(item.product.price);
        return {
          order_id: orderId,
          product_id: item.product.id,
          product_slug: item.product.slug,
          product_name: formatName(item.product.name_bn, item.product.name_en) + (item.selectedVariant ? ` (${item.selectedVariant})` : ''),
          product_image: item.product.images?.[0] || null,
          price: activePrice,
          quantity: item.quantity,
          subtotal: activePrice * item.quantity,
          selected_variant: item.selectedVariant || null,
        };
      });

      const { error: itemsError } = await supabase.from('oh_order_items').insert(orderItems);
      if (itemsError) console.error('Incomplete order items insert error:', itemsError);
    }

    return NextResponse.json({ success: true, incompleteOrderId: orderId, orderNumber });
  } catch (error) {
    console.error('Incomplete checkout API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
