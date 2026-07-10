import { NextRequest, NextResponse } from 'next/server';
import { getSteadfastBalance } from '@/lib/steadfast';

export async function GET(req: NextRequest) {
  try {
    const balance = await getSteadfastBalance();
    return NextResponse.json({ success: true, balance });
  } catch (err: any) {
    console.error('[Steadfast Balance]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch balance' }, { status: 500 });
  }
}
