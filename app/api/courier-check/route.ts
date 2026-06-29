import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(request: NextRequest) {
  try {
    const { phone, orderId } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required.' }, { status: 400 });
    }

    // 1. Fetch dynamic BDCourier API Key from settings
    const { data: settings, error: settingsError } = await supabase
      .from('oh_settings')
      .select('bdcourier_api_key')
      .eq('id', 1)
      .single();

    if (settingsError || !settings?.bdcourier_api_key) {
      return NextResponse.json(
        { error: 'BDCourier API Key is not configured in Admin Settings.' },
        { status: 400 }
      );
    }

    const apiKey = settings.bdcourier_api_key.trim();

    // 2. Call BDCourier API
    const bdResponse = await fetch('https://api.bdcourier.com/courier-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phone }),
    });

    if (!bdResponse.ok) {
      const errorText = await bdResponse.text();
      console.error('BDCourier API error response:', errorText);
      return NextResponse.json(
        { error: `BDCourier API responded with status ${bdResponse.status}: ${errorText}` },
        { status: 502 }
      );
    }

    const resData = await bdResponse.json();

    // 3. Store result permanently in the oh_orders table
    const { error: updateError } = await supabase
      .from('oh_orders')
      .update({ courier_ratio_data: resData })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to save courier ratio data to order:', updateError);
      // We still return the data to the user even if DB write fails, but log it
    }

    return NextResponse.json(resData);
  } catch (err: any) {
    console.error('Courier check API handler error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
