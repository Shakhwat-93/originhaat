import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  return authHeader === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: logs, error } = await supabase
      .from('oh_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); // Fetch last 100 entries

    if (error) {
      console.error('Failed to load audit logs:', error);
      return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 });
    }

    return NextResponse.json(logs || []);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
