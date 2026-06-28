import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
  if (ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  let country = 'Bangladesh';
  let city = 'Dhaka';

  try {
    if (ip && ip !== '127.0.0.1' && ip !== '::1' && !ip.startsWith('192.168.') && !ip.startsWith('10.')) {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          country = geoData.country || 'Bangladesh';
          city = geoData.city || 'Dhaka';
        }
      }
    }
  } catch (err) {
    console.error('IP geolocate failed:', err);
  }

  // Parse User Agent
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  let device = 'Desktop';

  if (/mobile/i.test(userAgent)) device = 'Mobile';
  else if (/tablet/i.test(userAgent)) device = 'Tablet';

  if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/opr\//i.test(userAgent)) browser = 'Opera';
  else if (/edg/i.test(userAgent)) browser = 'Edge';

  if (/windows/i.test(userAgent)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent)) os = 'macOS';
  else if (/iphone|ipad/i.test(userAgent)) os = 'iOS';
  else if (/android/i.test(userAgent)) os = 'Android';
  else if (/linux/i.test(userAgent)) os = 'Linux';

  return NextResponse.json({
    ip,
    country,
    city,
    browser,
    os,
    device,
  });
}
