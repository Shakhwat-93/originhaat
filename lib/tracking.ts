'use client';

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
    fbq?: (...args: any[]) => void;
    ttq?: {
      track: (event: string, params: any, options?: any) => void;
      page: () => void;
    };
  }
}

// Helper to generate custom event IDs for de-duplication with Conversions API (CAPI)
export function generateEventId() {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function trackViewContent(product: { id: string; name_bn: string; price: number }) {
  if (typeof window === 'undefined') return;

  const eventId = generateEventId();

  // GTM / GA4 dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'view_item',
    ecommerce: {
      items: [{
        item_id: product.id,
        item_name: product.name_bn,
        price: product.price,
        quantity: 1
      }]
    }
  });

  // Facebook Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'ViewContent', {
      content_ids: [product.id],
      content_name: product.name_bn,
      content_type: 'product',
      value: product.price,
      currency: 'BDT'
    }, { eventID: eventId });
  }

  // TikTok Pixel
  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('ViewContent', {
      contents: [{
        content_id: product.id,
        content_name: product.name_bn,
        content_type: 'product'
      }],
      value: product.price,
      currency: 'BDT'
    }, { event_id: eventId });
  }
}

export function trackAddToCart(product: { id: string; name_bn: string; price: number }, quantity = 1) {
  if (typeof window === 'undefined') return;

  const eventId = generateEventId();

  // GTM / GA4 dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'add_to_cart',
    ecommerce: {
      items: [{
        item_id: product.id,
        item_name: product.name_bn,
        price: product.price,
        quantity: quantity
      }]
    }
  });

  // Facebook Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'AddToCart', {
      content_ids: [product.id],
      content_name: product.name_bn,
      content_type: 'product',
      value: product.price * quantity,
      currency: 'BDT'
    }, { eventID: eventId });
  }

  // TikTok Pixel
  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('AddToCart', {
      contents: [{
        content_id: product.id,
        content_name: product.name_bn,
        content_type: 'product',
        quantity: quantity
      }],
      value: product.price * quantity,
      currency: 'BDT'
    }, { event_id: eventId });
  }
}

export function trackInitiateCheckout(items: Array<{ product: { id: string; name_bn: string; price: number }; quantity: number }>, total: number) {
  if (typeof window === 'undefined') return;

  const eventId = generateEventId();

  // GTM / GA4 dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'begin_checkout',
    ecommerce: {
      value: total,
      currency: 'BDT',
      items: items.map(item => ({
        item_id: item.product.id,
        item_name: item.product.name_bn,
        price: item.product.price,
        quantity: item.quantity
      }))
    }
  });

  // Facebook Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'InitiateCheckout', {
      content_ids: items.map(item => item.product.id),
      content_type: 'product',
      value: total,
      currency: 'BDT'
    }, { eventID: eventId });
  }

  // TikTok Pixel
  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('InitiateCheckout', {
      contents: items.map(item => ({
        content_id: item.product.id,
        content_name: item.product.name_bn,
        content_type: 'product',
        quantity: item.quantity
      })),
      value: total,
      currency: 'BDT'
    }, { event_id: eventId });
  }
}

export function trackPurchase(order: { id: string; total: number; deliveryCharge: number; items: Array<{ product: { id: string; name_bn: string; price: number }; quantity: number }> }) {
  if (typeof window === 'undefined') return;

  // Prevent duplicate purchase tracking
  const trackedOrders = JSON.parse(localStorage.getItem('tracked_purchases') || '[]');
  if (trackedOrders.includes(order.id)) {
    console.log(`Purchase event already tracked for order ${order.id}. Skipping.`);
    return;
  }

  // GTM / GA4 dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: 'purchase',
    ecommerce: {
      transaction_id: order.id,
      value: order.total,
      currency: 'BDT',
      tax: 0,
      shipping: order.deliveryCharge,
      items: order.items.map(item => ({
        item_id: item.product.id,
        item_name: item.product.name_bn,
        price: item.product.price,
        quantity: item.quantity
      }))
    }
  });

  // Facebook Pixel
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', {
      content_ids: order.items.map(item => item.product.id),
      content_type: 'product',
      value: order.total,
      currency: 'BDT',
      transaction_id: order.id
    }, { eventID: order.id }); // Using order.id as eventID for CAPI de-duplication
  }

  // TikTok Pixel
  if (typeof window.ttq?.track === 'function') {
    window.ttq.track('CompletePayment', {
      contents: order.items.map(item => ({
        content_id: item.product.id,
        content_name: item.product.name_bn,
        content_type: 'product',
        quantity: item.quantity
      })),
      value: order.total,
      currency: 'BDT',
      transaction_id: order.id
    }, { event_id: order.id }); // Using order.id as event_id for CAPI de-duplication
  }

  // Save order number to tracked purchases to prevent duplicates
  trackedOrders.push(order.id);
  localStorage.setItem('tracked_purchases', JSON.stringify(trackedOrders));
}
