import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET(request: NextRequest) {
  const sql = `
    -- Add Steadfast columns to oh_settings
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS steadfast_api_key text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS steadfast_secret_key text;

    -- Add Steadfast columns to oh_orders
    ALTER TABLE oh_orders ADD COLUMN IF NOT EXISTS steadfast_consignment_id text;
    ALTER TABLE oh_orders ADD COLUMN IF NOT EXISTS steadfast_tracking_code text;
    ALTER TABLE oh_orders ADD COLUMN IF NOT EXISTS steadfast_order_status text;
    ALTER TABLE oh_orders ADD COLUMN IF NOT EXISTS steadfast_sent_at timestamp with time zone;

    -- Add Tracking columns to oh_settings
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_gtm_id text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_ga4_id text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_fb_pixel_id text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_fb_capi_token text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_fb_capi_test_code text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_tiktok_pixel_id text;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS tracking_tiktok_capi_token text;

    -- Update status check constraint on oh_orders to allow 'incomplete'
    ALTER TABLE oh_orders DROP CONSTRAINT IF EXISTS oh_orders_status_check;
    ALTER TABLE oh_orders ADD CONSTRAINT oh_orders_status_check CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'incomplete'));

    -- Add AI chat auto-reply columns to oh_settings
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS chat_ai_active boolean DEFAULT false;
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS chat_ai_instructions text DEFAULT 'You are an AI assistant for Origin Haat (originhaat.com). Answer customer queries politely in Bengali. Delivery charges: Inside Dhaka 60 TK, Outside Dhaka 120 TK. Free delivery on orders over 999 TK. Dhaka delivery within 24 hours, outside Dhaka 2-3 days.';
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS chat_ai_api_key text;

    -- Add live chat widget active column to oh_settings
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS is_live_chat_active boolean DEFAULT true;

    -- Add whatsapp_default_message column to oh_settings
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS whatsapp_default_message text DEFAULT 'হ্যালো! আমি Origin Haat থেকে সাহায্য চাই।';

    -- Add sort_order column to oh_products for product reordering
    ALTER TABLE oh_products ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

    -- Add default_faqs column to oh_settings for editable product FAQs
    ALTER TABLE oh_settings ADD COLUMN IF NOT EXISTS default_faqs jsonb DEFAULT '[]'::jsonb;

    -- Add variants column to oh_products
    ALTER TABLE oh_products ADD COLUMN IF NOT EXISTS variants jsonb DEFAULT '[]'::jsonb;

    -- Add selected_variant column to oh_order_items
    ALTER TABLE oh_order_items ADD COLUMN IF NOT EXISTS selected_variant text;

    -- Add display_name_lang column to oh_products
    ALTER TABLE oh_products ADD COLUMN IF NOT EXISTS display_name_lang text DEFAULT 'bn';

    -- Add assigned_to column to oh_orders
    ALTER TABLE oh_orders ADD COLUMN IF NOT EXISTS assigned_to text;

    -- Add code column to oh_products
    ALTER TABLE oh_products ADD COLUMN IF NOT EXISTS code text;

    -- Create oh_brands table if not exists
    CREATE TABLE IF NOT EXISTS oh_brands (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      logo_url text NOT NULL,
      description text,
      is_active boolean DEFAULT true,
      show_on_homepage boolean DEFAULT true,
      sort_order integer DEFAULT 0,
      seo_title text,
      seo_description text,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );

    -- Add brand_id column to oh_products if not exists
    ALTER TABLE oh_products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES oh_brands(id) ON DELETE SET NULL;

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_oh_products_brand_id ON oh_products(brand_id);
    CREATE INDEX IF NOT EXISTS idx_oh_brands_slug ON oh_brands(slug);
    CREATE INDEX IF NOT EXISTS idx_oh_brands_sort_order ON oh_brands(sort_order);
    CREATE INDEX IF NOT EXISTS idx_oh_brands_show_on_homepage ON oh_brands(show_on_homepage, is_active);

    -- Create oh_top_selling_products table if not exists
    CREATE TABLE IF NOT EXISTS oh_top_selling_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES oh_products(id) ON DELETE CASCADE,
      sort_order integer NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      badge_text text DEFAULT 'BEST SELLER',
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now(),
      CONSTRAINT uq_oh_top_selling_product UNIQUE (product_id)
    );

    CREATE INDEX IF NOT EXISTS idx_oh_top_selling_sort_order ON oh_top_selling_products(sort_order);
    CREATE INDEX IF NOT EXISTS idx_oh_top_selling_active ON oh_top_selling_products(is_active);
    CREATE INDEX IF NOT EXISTS idx_oh_top_selling_product_id ON oh_top_selling_products(product_id);
  `;

  // We will try to connect to the internal database container
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'supabase-db',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'OgwsUwvzFIWNLuhiszh8360LCTd6Z9dp',
    database: 'postgres',
  });

  try {
    await client.connect();
    await client.query(sql);
    await client.end();
    return NextResponse.json({
      success: true,
      message: 'Database migrated successfully! Added steadfast_api_key, steadfast_secret_key to oh_settings, and steadfast columns to oh_orders.'
    });
  } catch (err: any) {
    console.error('Migration error:', err);
    return NextResponse.json({
      success: false,
      error: err.message,
      instruction: 'If you are running on localhost, port 5432 is blocked. Please run the following SQL query directly in your Supabase SQL Editor or Coolify database console:',
      sql: sql.trim()
    }, { status: 500 });
  }
}
