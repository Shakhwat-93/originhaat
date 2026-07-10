import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Origin Haat',
    short_name: 'Origin Haat',
    description: 'Origin Haat — বাংলাদেশের সেরা ই-commerce অনলাইন শপিং প্ল্যাটফর্ম।',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f9fa',
    theme_color: '#ff6b35',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
