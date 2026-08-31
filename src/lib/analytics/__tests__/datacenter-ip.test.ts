/**
 * Tests for the datacenter-IP matcher. Positive cases pin well-known,
 * long-stable cloud blocks (verified present in the vendored ranges at
 * generation time); negatives use RFC 5737/6890 documentation and private
 * space, which can never appear in a provider feed.
 */

import { describe, it, expect } from 'vitest';
import { isDatacenterIp } from '../datacenter-ip';

describe('isDatacenterIp', () => {
  it('flags well-known cloud IPv4 space', () => {
    expect(isDatacenterIp('52.95.110.1')).toBe(true); // AWS (52.95.0.0/16 family)
    expect(isDatacenterIp('4.200.10.20')).toBe(true); // Azure (4.192.0.0/10)
    expect(isDatacenterIp('34.1.208.5')).toBe(true); // GCP (34.1.208.0/20)
  });

  it('does not flag documentation, private, or carrier space', () => {
    expect(isDatacenterIp('203.0.113.7')).toBe(false); // TEST-NET-3
    expect(isDatacenterIp('192.168.1.10')).toBe(false); // RFC 1918
    expect(isDatacenterIp('10.0.0.1')).toBe(false); // RFC 1918
    expect(isDatacenterIp('73.155.10.1')).toBe(false); // Comcast residential
  });

  it('handles IPv6, including v4-mapped forms', () => {
    expect(isDatacenterIp('2600:1f18::1')).toBe(true); // AWS v6 block
    expect(isDatacenterIp('2001:db8::1')).toBe(false); // documentation space
    expect(isDatacenterIp('::ffff:52.95.110.1')).toBe(true); // mapped v4 → AWS
    expect(isDatacenterIp('::ffff:203.0.113.7')).toBe(false);
  });

  it('treats missing or malformed input as NOT datacenter — uncertainty stays human', () => {
    expect(isDatacenterIp(null)).toBe(false);
    expect(isDatacenterIp(undefined)).toBe(false);
    expect(isDatacenterIp('')).toBe(false);
    expect(isDatacenterIp('not-an-ip')).toBe(false);
    expect(isDatacenterIp('999.1.1.1')).toBe(false);
    expect(isDatacenterIp('1.2.3')).toBe(false);
    expect(isDatacenterIp('::gggg')).toBe(false);
    expect(isDatacenterIp('1:2:3:4:5:6:7:8:9')).toBe(false);
  });
});
