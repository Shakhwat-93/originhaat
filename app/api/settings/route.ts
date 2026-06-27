import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function GET() {
  const { data, error } = await supabase
    .from('oh_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  
  const { data, error } = await supabase
    .from('oh_settings')
    .upsert({ id: 1, ...body, updated_at: new Date().toISOString() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  return NextResponse.json(data);
}
