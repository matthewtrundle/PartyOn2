/**
 * Profile image upload/fetch for the signed-in customer.
 *
 * The customer is taken from the session cookie, never from the request. Both
 * handlers used to read a client-supplied `customerId`: POST wrote to
 * `<customerId>/profile.<ext>` with `upsert: true`, so anyone could overwrite
 * any customer's profile image (or fill the bucket) with no account at all,
 * and GET could read any customer's image back.
 *
 * The upload is also constrained to real images: the stored content type is
 * chosen from an allow-list rather than echoed from the request, and the
 * extension is derived from that type rather than from the client's filename.
 * Both files are served from a public Supabase URL, so an attacker-chosen
 * content type is a stored-XSS vector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { getSession } from '@/lib/auth/session';

/** Content types we will store, mapped to the extension we save them under. */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in to upload a profile image' }, { status: 401 });
    }
    const customerId = session.customerId;

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const extension = ALLOWED_IMAGE_TYPES[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: 'Profile images must be a JPEG, PNG or WebP' },
        { status: 400 }
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 400 });
    }

    // If Supabase is not configured, use base64 fallback
    if (!supabase) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

      return NextResponse.json({
        url: base64,
        storage: 'localStorage'
      });
    }

    // Upload to Supabase Storage. Path and content type both come from values
    // we control — never from the filename or the declared type.
    const fileName = `${customerId}/profile.${extension}`;

    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Supabase upload error:', error);
      // Fallback to base64 if Supabase fails
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

      return NextResponse.json({
        url: base64,
        storage: 'localStorage'
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.path);

    return NextResponse.json({
      url: publicUrl,
      storage: 'supabase'
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in to view your profile image' }, { status: 401 });
  }
  const customerId = session.customerId;

  // If Supabase is not configured, return null
  if (!supabase) {
    return NextResponse.json({ url: null });
  }

  try {
    // List files for this customer
    const { data, error } = await supabase.storage
      .from('profile-images')
      .list(customerId);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ url: null });
    }

    // Get public URL for the profile image
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(`${customerId}/${data[0].name}`);

    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ url: null });
  }
}
