import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'ইউজারনেম এবং পাসওয়ার্ড দিন' }, { status: 400 });
    }

    // Query oh_admin_users table
    const { data: user, error } = await supabase
      .from('oh_admin_users')
      .select('*')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড' }, { status: 401 });
    }

    // Verify password (plain text as standard in this project's .env matching)
    if (user.password !== password) {
      return NextResponse.json({ error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      }
    });
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'অভ্যন্তরীণ ত্রুটি ঘটেছে' }, { status: 500 });
  }
}
