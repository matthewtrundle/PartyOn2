/**
 * Profile images are scoped to the signed-in customer.
 *
 * Both handlers used to read a client-supplied `customerId`. POST wrote to
 * `<customerId>/profile.<ext>` with upsert, so with no account at all you
 * could overwrite someone else's profile image; GET could read anyone's back.
 * The upload also stored a client-declared content type under a filename-
 * derived extension, from a public URL — a stored-XSS shape.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const sessionMock = vi.hoisted(() => ({ getSession: vi.fn() }));
const storageMock = vi.hoisted(() => ({
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
  list: vi.fn(),
}));

vi.mock('@/lib/auth/session', () => sessionMock);
// Storage goes through the SERVICE ROLE client — the anon client would leave
// the bucket reachable directly, since our session is not Supabase Auth.
vi.mock('@/lib/supabase/server-client', () => ({
  getSupabaseServerClient: () => ({ storage: { from: () => storageMock } }),
}));

import { POST, GET } from '../route';

const ME = 'customer-me';
const VICTIM = 'customer-someone-else';

const SIGNATURES: Record<string, number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
};

function uploadRequest(
  {
    type = 'image/png',
    size = 1024,
    customerId,
    bodyBytes,
    contentLength,
  }: {
    type?: string;
    size?: number;
    customerId?: string;
    bodyBytes?: number[];
    contentLength?: number;
  } = {}
): NextRequest {
  // Real signature bytes by default, so the magic-number check is genuinely
  // exercised — a garbage body would make every success case fail for the
  // wrong reason.
  const head = bodyBytes ?? SIGNATURES[type] ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  // Hand-rolled File-like: the jsdom File polyfill has no arrayBuffer(), and
  // we need `size` to be independent of the actual byte count.
  const file = {
    name: 'photo.png',
    type,
    size,
    arrayBuffer: async () => new Uint8Array(head).buffer,
  };

  // A real FormData would coerce the File-like object to a string on append,
  // so the form is mocked too.
  const form = {
    get: (k: string) => (k === 'file' ? file : k === 'customerId' ? customerId ?? null : null),
  };

  return {
    headers: { get: (h: string) => (h === 'content-length' ? String(contentLength ?? size) : null) },
    formData: async () => form,
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionMock.getSession.mockResolvedValue({ customerId: ME, email: 'me@example.com' });
  storageMock.upload.mockResolvedValue({ data: { path: `${ME}/profile.png` }, error: null });
  storageMock.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.test/img.png' } });
  storageMock.list.mockResolvedValue({ data: [{ name: 'profile.png' }], error: null });
});

describe('POST profile image', () => {
  it('401s with no session and stores nothing', async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await POST(uploadRequest({ customerId: VICTIM }));

    expect(res.status).toBe(401);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it("ignores a supplied customerId and writes under the session's customer", async () => {
    const res = await POST(uploadRequest({ customerId: VICTIM }));

    expect(res.status).toBe(200);
    const path = storageMock.upload.mock.calls[0][0];
    expect(path).toBe(`${ME}/profile.png`);
    expect(path).not.toContain(VICTIM);
  });

  it('rejects a non-image content type (public URL = stored-XSS vector)', async () => {
    const res = await POST(uploadRequest({ type: 'text/html' }));

    expect(res.status).toBe(400);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('rejects an oversized file even when content-length understates it', async () => {
    const res = await POST(uploadRequest({ size: 6 * 1024 * 1024, contentLength: 1024 }));

    expect(res.status).toBe(400);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before parsing it (content-length pre-check)', async () => {
    const res = await POST(uploadRequest({ contentLength: 20 * 1024 * 1024 }));

    expect(res.status).toBe(413);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('rejects a file whose bytes do not match its declared image type', async () => {
    // Declares PNG, body is "<html>" — a polyglot/disguised upload.
    const res = await POST(uploadRequest({ bodyBytes: [0x3c, 0x68, 0x74, 0x6d, 0x6c, 0x3e, 0, 0, 0, 0, 0, 0] }));

    expect(res.status).toBe(400);
    expect(storageMock.upload).not.toHaveBeenCalled();
  });

  it('derives the extension from the allowed type, not the filename', async () => {
    const res = await POST(uploadRequest({ type: 'image/webp' }));

    expect(res.status).toBe(200);
    // Filename said .png; the stored path must follow the validated type.
    expect(storageMock.upload.mock.calls[0][0]).toBe(`${ME}/profile.webp`);
  });
});

describe('GET profile image', () => {
  it('401s with no session and lists nothing', async () => {
    sessionMock.getSession.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(storageMock.list).not.toHaveBeenCalled();
  });

  it("only ever lists the session customer's own folder", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(storageMock.list).toHaveBeenCalledWith(ME);
  });
});
