'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Script from 'next/script';

interface TrackingScriptsProps {
  settings: {
    tracking_gtm_id?: string | null;
    tracking_ga4_id?: string | null;
    tracking_fb_pixel_id?: string | null;
    tracking_tiktok_pixel_id?: string | null;
  } | null;
}

function TrackingScriptsInner({ settings }: TrackingScriptsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!settings) return;

    const url = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;

    // dataLayer pageview
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'pageview',
        page_path: url,
      });
    }

    // GA4 pageview
    if (settings.tracking_ga4_id && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: url,
      });
    }

    // FB Pixel PageView
    if (settings.tracking_fb_pixel_id && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
    }

    // TikTok Pixel PageView
    if (settings.tracking_tiktok_pixel_id && typeof window.ttq?.page === 'function') {
      window.ttq.page();
    }
  }, [pathname, searchParams, settings]);

  return null;
}

export function TrackingScripts({ settings }: TrackingScriptsProps) {
  if (!settings) return null;

  const { tracking_gtm_id, tracking_ga4_id, tracking_fb_pixel_id, tracking_tiktok_pixel_id } = settings;

  return (
    <>
      <Suspense fallback={null}>
        <TrackingScriptsInner settings={settings} />
      </Suspense>
      {/* ─── Google Tag Manager ─── */}
      {tracking_gtm_id && (
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${tracking_gtm_id}');
            `,
          }}
        />
      )}

      {/* ─── Google Analytics 4 (GA4) ─── */}
      {tracking_ga4_id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${tracking_ga4_id}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${tracking_ga4_id}', { send_page_view: false });
              `,
            }}
          />
        </>
      )}

      {/* ─── Facebook Pixel ─── */}
      {tracking_fb_pixel_id && (
        <Script
          id="fb-pixel-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${tracking_fb_pixel_id}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* ─── TikTok Pixel ─── */}
      {tracking_tiktok_pixel_id && (
        <Script
          id="tiktok-pixel-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var e=0;e<ttq.methods.length;e++)ttq.setAndDefer(ttq,ttq.methods[e]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._t[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a)};
                ttq.load('${tracking_tiktok_pixel_id}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}
    </>
  );
}
