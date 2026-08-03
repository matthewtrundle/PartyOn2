/**
 * Profile image upload/fetch for the signed-in customer.
 *
 * The customer is taken from the session cookie, never from the request. Both
 * handlers used to read a client-supplied `customerId`: POST wrote to
 * `<customerId>/profile.<ext>` with `upsert: true`, so anyone could overwrite
 * any customer's profile image (or fill the bucket) with no account at all,
 * and GET could read any customer's image back.
 *
 * Storage goes through the SERVICE ROLE client, not the anon client. Our
 * customer session is a `jose` JWT cookie, not Supabase Auth, so storage RLS
 * has no `auth.uid()` to key on — checking the session in this handler while
 * writing with the anon key would leave the bucket reachable directly with a
 * key that is non-secret by design, reproducing the original bug.
 *
 * The upload is also constrained to real images: the stored content type is
 * chosen from an allow-list rather than echoed from the request, the extension
 * is derived from that type rather than the client's filename, and the bytes
 * must actually begin with that format's signature. Objects are served from a
 * public URL, so an attacker-chosen content type would be a stored-XSS vector.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server-client';
import { getSession } from '@/lib/auth/session';

/** Content types we will store, mapped to the extension we save them under. */
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Does the byte stream actually start like the type it claims to be? */
function hasMatchingSignature(type: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  switch (type) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return (
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
      );
    case 'image/webp': {
      const ascii = (i: number) => String.fromCharCode(bytes[i]);
      const riff = ascii(0) + ascii(1) + ascii(2) + ascii(3);
      const webp = ascii(8) + ascii(9) + ascii(10) + ascii(11);
      return riff === 'RIFF' && webp === 'WEBP';
    }
    default:
      return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in to upload a profile image' }, { status: 401 });
    }
    const customerId = session.customerId;

    // Reject oversized bodies BEFORE formData() buffers the whole upload into
    // memory. The post-parse size check below still stands as the real gate —
    // this only avoids doing the parse at all for an obviously-too-large body.
    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image must be 5 MB or smaller' }, { status: 413 });
    }

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

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasMatchingSignature(file.type, bytes)) {
      return NextResponse.json(
        { error: "That file doesn't look like a real image" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    // If Supabase is not configured, use base64 fallback
    if (!supabase) {
      const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
      return NextResponse.json({ url: base64, storage: 'localStorage' });
    }

    // Path, content type and extension all come from values we control —
    // never from the filename or the declared type alone.
    const fileName = `${customerId}/profile.${extension}`;

    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(fileName, bytes, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      // Fallback to base64 if Supabase fails
      const base64 = `data:${file.type};base64,${Buffer.from(bytes).toString('base64')}`;
      return NextResponse.json({ url: base64, storage: 'localStorage' });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(data.path);

    return NextResponse.json({ url: publicUrl, storage: 'supabase' });

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

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ url: null });
  }

  try {
    const { data, error } = await supabase.storage
      .from('profile-images')
      .list(customerId);

    if (error || !data || data.length === 0) {
      return NextResponse.json({ url: null });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(`${customerId}/${data[0].name}`);

    return NextResponse.json({ url: publicUrl });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ url: null });
  }
}
