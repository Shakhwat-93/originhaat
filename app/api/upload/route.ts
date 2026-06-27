import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'product-images';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize filename
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

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

      // 2. Upload file to Supabase
      const { error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filename, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from(bucket)
        .getPublicUrl(filename);

      return NextResponse.json({ url: publicUrl });
    } catch (storageError) {
      console.warn('Supabase storage failed, falling back to local storage:', storageError);

      // FALLBACK: Local storage in public/uploads
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Ensure folder exists
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);

      return NextResponse.json({ url: `/uploads/${filename}` });
    }
  } catch (error: any) {
    console.error('Upload API Error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
