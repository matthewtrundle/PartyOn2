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
vi.mock('@/lib/supabase/client', () => ({
  supabase: { storage: { from: () => storageMock } },
}));

import { POST, GET } from '../route';

const ME = 'customer-me';
const VICTIM = 'customer-someone-else';

function uploadRequest(
  { type = 'image/png', size = 1024, customerId }: { type?: string; size?: number; customerId?: string } = {}
): NextRequest {
  const file = new File(['x'.repeat(size)], 'photo.png', { type });
  // Force the reported size without allocating megabytes.
  Object.defineProperty(file, 'size', { value: size });

  const form = new FormData();
  form.append('file', file);
  if (customerId) form.append('customerId', customerId);

  return { formData: async () => form } as unknown as NextRequest;
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

  it('rejects an oversized file', async () => {
    const res = await POST(uploadRequest({ size: 6 * 1024 * 1024 }));

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
