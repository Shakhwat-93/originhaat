import crypto from 'crypto';

function sha256(text: string): string {
  if (!text) return '';
  // Clean phone number (keep digits only) or clean email (keep lowercase letters, digits, dots, etc.)
  const cleaned = text.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return crypto.createHash('sha256').update(cleaned).digest('hex');
}

export async function sendServerPurchaseEvent(params: {
  orderNumber: string;
  total: number;
  customerName: string;
  phone: string;
  ipAddress: string;
  userAgent: string;
  items: Array<{ product_id: string; product_name: string; price: number; quantity: number }>;
  settings: {
    tracking_fb_pixel_id?: string | null;
    tracking_fb_capi_token?: string | null;
    tracking_fb_capi_test_code?: string | null;
    tracking_tiktok_pixel_id?: string | null;
    tracking_tiktok_capi_token?: string | null;
  };
}) {
  const { orderNumber, total, phone, ipAddress, userAgent, items, settings } = params;

  const eventTime = Math.floor(Date.now() / 1000);
  const hashedPhone = sha256(phone);

  // 1. Meta Facebook Conversions API (CAPI)
  if (settings.tracking_fb_pixel_id && settings.tracking_fb_capi_token) {
    try {
      const fbPayload: any = {
        data: [
          {
            event_name: 'Purchase',
            event_time: eventTime,
            event_id: orderNumber,
            event_source: 'website',
            action_source: 'website',
            user_data: {
              ph: hashedPhone ? [hashedPhone] : [],
              client_ip_address: ipAddress === 'unknown' ? undefined : ipAddress,
              client_user_agent: userAgent || undefined,
            },
            custom_data: {
              currency: 'BDT',
              value: total,
              content_type: 'product',
              content_ids: items.map(item => item.product_id),
            },
          },
        ],
      };

      if (settings.tracking_fb_capi_test_code) {
        fbPayload.test_event_code = settings.tracking_fb_capi_test_code;
      }

      const fbUrl = `https://graph.facebook.com/v18.0/${settings.tracking_fb_pixel_id}/events?access_token=${settings.tracking_fb_capi_token}`;

      fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fbPayload),
      }).catch(err => console.error('[Meta CAPI Request Error]', err));
    } catch (err) {
      console.error('[Meta CAPI Setup Error]', err);
    }
  }

  // 2. TikTok Conversions API (Events API)
  if (settings.tracking_tiktok_pixel_id && settings.tracking_tiktok_capi_token) {
    try {
      const ttPayload = {
        pixel_code: settings.tracking_tiktok_pixel_id,
        event: 'CompletePayment',
        event_id: orderNumber,
        timestamp: new Date().toISOString(),
        context: {
          user: {
            phone_number: hashedPhone || undefined,
            ip: ipAddress === 'unknown' ? undefined : ipAddress,
            user_agent: userAgent || undefined,
          },
        },
        properties: {
          contents: items.map(item => ({
            content_id: item.product_id,
            content_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
          })),
          value: total,
          currency: 'BDT',
        },
      };

      fetch('https://business-api.tiktok.com/open_api/v1.3/pixel/track/', {
        method: 'POST',
        headers: {
          'Access-Token': settings.tracking_tiktok_capi_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ttPayload),
      }).catch(err => console.error('[TikTok CAPI Request Error]', err));
    } catch (err) {
      console.error('[TikTok CAPI Setup Error]', err);
    }
  }
}
