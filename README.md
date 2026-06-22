# Origin Haat — বাংলাদেশ ই-কমার্স প্ল্যাটফর্ম

> Production-ready Next.js 14+ e-commerce platform optimized for the Bangladesh market.

## 🚀 Quick Start

```bash
# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

## 📁 Key Pages

| URL | Description |
|---|---|
| `/` | Homepage with 7 CRO sections |
| `/product/vitamin-c-serum` | Product detail page example |
| `/cart` | Shopping cart |
| `/checkout` | 1-step checkout (COD) |
| `/order-success` | Order confirmation |
| `/admin` | Admin panel (password: `admin123`) |

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand (localStorage persistent)
- **Forms**: React Hook Form + Zod
- **Animation**: Framer Motion
- **Font**: Hind Siliguri (Bangla-compatible)

## 🎨 Design System

### Colors
- **Primary**: `#ff6b35` (Forest Green — trust)
- **CTA**: `#ff6b35` (Orange — urgency)
- **Success**: `#10b981` (Green)
- **Text**: `#111827` / `#374151` / `#6b7280`
- **Background**: `#f8f9fa`

### Typography
- **Font**: Hind Siliguri (supports Bengali + Latin)
- **Weights**: 300, 400, 500, 600, 700

## 🔑 Customization

### Update Phone Number
Replace all instances of `01XXXXXXXXX` and `8801XXXXXXXXX` with your real number:
- `components/layout/Header.tsx`
- `components/layout/Footer.tsx`
- `components/shared/WhatsAppButton.tsx` (in `app/layout.tsx`)
- `app/checkout/page.tsx`
- `app/order-success/page.tsx`

### Update Products
Edit `data/products.ts` — add your real products with Bangla names, prices, and Unsplash image URLs.

### Connect to Supabase
1. Create a project at supabase.com
2. Add `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```
3. Replace static data in `data/products.ts` with Supabase queries

## 📱 CRO Features

- ✅ Rotating recent order social proof popup (auto-shows after 6s)
- ✅ Live order counter in hero ("আজ ৩৪৭ জন অর্ডার করেছেন")
- ✅ Countdown timer for urgency
- ✅ Sticky mobile CTA bar on product pages
- ✅ COD badge everywhere
- ✅ WhatsApp floating button (bottom-right)
- ✅ Low stock indicators
- ✅ Discount percentage badges

## 🔒 Admin Panel

Visit `/admin` and use password: `admin123`

Features:
- Dashboard with stats
- Order management with status updates  
- Product inventory view

To change password, update `ADMIN_PASSWORD` in `app/admin/page.tsx`.

## 📦 Build for Production

```bash
npm run build
npm start
```

## 🌐 Deploy to Vercel

```bash
npx vercel --prod
```
