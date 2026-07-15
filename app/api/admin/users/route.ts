import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hashPassword } from '@/lib/crypto';
import { verifyToken } from '@/lib/jwt';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabase = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);
import { writeAuditLog } from '@/lib/audit';

function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-key');
  return authHeader === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: users, error } = await supabase
    .from('oh_admin_users')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load admin users:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }

  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { username, password, role, permissions } = await request.json();

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const sessionCookie = request.cookies.get('admin_session');
    const token = sessionCookie?.value;
    const session = token ? await verifyToken(token) : null;
    const adminUsername = session?.username || request.headers.get('x-admin-username') || 'admin';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const { data: newUser, error } = await supabase
      .from('oh_admin_users')
      .insert({
        username: username.trim().toLowerCase(),
        password: hashPassword(password.trim()),
        role,
        permissions: permissions || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create admin user:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    await writeAuditLog(
      adminUsername,
      'CREATE_ADMIN_USER',
      `Created admin/moderator user: ${newUser.username} (${newUser.role})`,
      ipAddress
    );

    return NextResponse.json(newUser);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, username, password, role, permissions } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const sessionCookie = request.cookies.get('admin_session');
    const token = sessionCookie?.value;
    const session = token ? await verifyToken(token) : null;
    const adminUsername = session?.username || request.headers.get('x-admin-username') || 'admin';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    const updateFields: any = {};
    if (username !== undefined) updateFields.username = username.trim().toLowerCase();
    if (password !== undefined && password.trim()) updateFields.password = hashPassword(password.trim());
    if (role !== undefined) updateFields.role = role;
    if (permissions !== undefined) updateFields.permissions = permissions;

    const { data: updatedUser, error } = await supabase
      .from('oh_admin_users')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update admin user:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হয়েছে' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    await writeAuditLog(
      adminUsername,
      'UPDATE_ADMIN_USER',
      `Updated user: ${updatedUser.username}. Fields: ${Object.keys(updateFields).filter(k => k !== 'password').join(', ')}`,
      ipAddress
    );

    return NextResponse.json(updatedUser);
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const sessionCookie = request.cookies.get('admin_session');
    const token = sessionCookie?.value;
    const session = token ? await verifyToken(token) : null;
    const adminUsername = session?.username || request.headers.get('x-admin-username') || 'admin';
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    // Load user to check if they are the master 'admin' account to prevent lockout
    const { data: user } = await supabase
      .from('oh_admin_users')
      .select('username')
      .eq('id', id)
      .single();

    if (user?.username === 'admin') {
      return NextResponse.json({ error: 'মাস্টার এডমিন ইউজার ডিলেট করা সম্ভব নয়' }, { status: 400 });
    }

    const { error } = await supabase
      .from('oh_admin_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Failed to delete user:', error);
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    await writeAuditLog(
      adminUsername,
      'DELETE_ADMIN_USER',
      `Deleted user account: ${user?.username || id}`,
      ipAddress
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
