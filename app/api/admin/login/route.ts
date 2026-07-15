import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPassword, hashPassword } from '@/lib/crypto';
import { generateToken } from '@/lib/jwt';

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

    // Verify password using secure scrypt comparison
    const isValid = verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড' }, { status: 401 });
    }

    // Lazy Migration: If stored password is plain text, hash it and update DB on-the-fly
    if (!user.password.startsWith('scrypt$')) {
      const secureHash = hashPassword(password);
      await supabase
        .from('oh_admin_users')
        .update({ password: secureHash })
        .eq('id', user.id);
    }

    // Generate cryptographically signed session token
    const token = await generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions || []
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      }
    });

    // Set secure HttpOnly session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: 'admin_session',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (err: any) {
    console.error('Login API error:', err);
    return NextResponse.json({ error: 'অভ্যন্তরীণ ত্রুটি ঘটেছে' }, { status: 500 });
  }
}
