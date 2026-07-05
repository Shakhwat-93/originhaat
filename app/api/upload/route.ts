import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.startsWith('https://') ? rawUrl.replace('https://', 'http://') : rawUrl;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// ── Convert any image to WebP ─────────────────────────────────────────────
async function convertToWebP(buffer: Buffer, originalType: string): Promise<Uint8Array> {
  // Skip SVG & GIF (no meaningful WebP conversion)
  if (originalType === 'image/svg+xml' || originalType === 'image/gif') {
    return buffer;
  }
  return sharp(buffer)
    .webp({ quality: 82, effort: 4 }) // quality 82 = great visual / small size balance
    .toBuffer();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'product-images';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const originalBuffer = Buffer.from(bytes);

    // ── WebP Conversion ────────────────────────────────────────────────────
    const isImage = file.type.startsWith('image/');
    const shouldConvert = isImage && file.type !== 'image/svg+xml' && file.type !== 'image/gif';

    let uploadBuffer: Buffer | Uint8Array = originalBuffer;
    let uploadContentType = file.type;
    let uploadExtension = path.extname(file.name) || '';

    if (shouldConvert) {
      uploadBuffer = await convertToWebP(originalBuffer, file.type);
      uploadContentType = 'image/webp';
      uploadExtension = '.webp';
    }

    // Sanitize filename and force .webp extension
    const baseName = file.name
      .replace(/\.[^/.]+$/, '')          // remove original extension
      .replace(/[^a-zA-Z0-9-]/g, '_')   // sanitize special chars
      .substring(0, 60);                 // max 60 chars

    const filename = `${Date.now()}-${baseName}${uploadExtension}`;

    try {
      // 1. Ensure bucket exists in Supabase Storage
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === bucket);

      if (!bucketExists) {
        await supabaseAdmin.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
      }

      // 2. Upload converted file to Supabase
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filename, uploadBuffer, {
          contentType: uploadContentType,
          upsert: true,
        });

      if (error) throw error;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filename);

      return NextResponse.json({
        url: publicUrl,
        converted: shouldConvert,
        originalSize: originalBuffer.byteLength,
        convertedSize: uploadBuffer.byteLength,
        savings: shouldConvert
          ? `${Math.round((1 - uploadBuffer.byteLength / originalBuffer.byteLength) * 100)}%`
          : '0%',
      });
    } catch (storageError) {
      console.warn('Supabase storage failed, falling back to local storage:', storageError);

      // FALLBACK: Local storage in public/uploads
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, uploadBuffer);

      return NextResponse.json({
        url: `/uploads/${filename}`,
        converted: shouldConvert,
        originalSize: originalBuffer.byteLength,
        convertedSize: uploadBuffer.byteLength,
        savings: shouldConvert
          ? `${Math.round((1 - uploadBuffer.byteLength / originalBuffer.byteLength) * 100)}%`
          : '0%',
      });
    }
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
