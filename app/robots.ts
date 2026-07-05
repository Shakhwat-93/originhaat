import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/cart',
          '/checkout',
          '/order-success',
        ],
      },
      {
        // Allow Google Image Bot to crawl product images
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
    ],
    sitemap: 'https://originhaat.com/sitemap.xml',
    host: 'https://originhaat.com',
  };
}
