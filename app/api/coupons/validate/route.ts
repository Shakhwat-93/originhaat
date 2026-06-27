import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const amount = parseInt(searchParams.get('amount') || '0');

  if (!code || !amount) {
    return NextResponse.json({ error: 'Missing code or amount' }, { status: 400 });
  }

  const { data: coupon, error } = await supabase
    .from('oh_coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (error || !coupon) {
    return NextResponse.json({ error: 'কুপন কোড সঠিক নয়' }, { status: 404 });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ error: 'কুপনের মেয়াদ শেষ হয়ে গেছে' }, { status: 400 });
  }

  if (coupon.max_uses > 0 && coupon.used_count >= coupon.max_uses) {
    return NextResponse.json({ error: 'কুপনের ব্যবহার সীমা শেষ' }, { status: 400 });
  }

  if (amount < coupon.min_order) {
    return NextResponse.json({ 
      error: `এই কুপনের জন্য সর্বনিম্ন অর্ডার ৳${coupon.min_order}` 
    }, { status: 400 });
  }

  const discount = coupon.discount_type === 'percent'
    ? Math.round((amount * coupon.discount_value) / 100)
    : coupon.discount_value;

  return NextResponse.json({
    valid: true,
    coupon_id: coupon.id,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: coupon.discount_value,
    discount_amount: Math.min(discount, amount),
  });
}
