import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the secure admin_session cookie
  response.cookies.set({
    name: 'admin_session',
    value: '',
    httpOnly: true,
    expires: new Date(0), // Set to epoch to delete it immediately
    path: '/'
  });

  return response;
}
