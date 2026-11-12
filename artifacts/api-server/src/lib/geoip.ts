/**
 * IP geolocation using the bundled geoip-lite database.
 *
 * Uses MaxMind GeoLite2 data embedded in the geoip-lite package — no outbound
 * API calls, no signup required, city-level accuracy.
 *
 * Privacy note: IP-derived geolocation at city level is permissible under
 * legitimate-interest basis (fraud prevention, security) without explicit
 * consent. Disclose in the privacy policy. Raw IPs are only readable by
 * admins with telemetry.read permission.
 */
import geoip from "geoip-lite";
import type { Request } from "express";

export interface GeoResult {
  country: string | null;  // ISO 3166-1 alpha-2, e.g. "NG"
  city:    string | null;
  lat:     number | null;
  lon:     number | null;
  isp:     string | null;  // geoip-lite doesn't include ISP — left for MaxMind paid tier
}

const PRIVATE_RANGES = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fc|fd)/;

/**
 * Resolves req.ip to a GeoResult. Returns all-nulls for private/loopback IPs
 * (common in local dev) rather than throwing.
 */
export function geolocateRequest(req: Request): GeoResult {
  const ip = req.ip ?? req.socket.remoteAddress ?? "";
  return geolocateIp(ip);
}

export function geolocateIp(ip: string): GeoResult {
  const empty: GeoResult = { country: null, city: null, lat: null, lon: null, isp: null };

  if (!ip || PRIVATE_RANGES.test(ip)) return empty;

  // Strip IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 → 1.2.3.4)
  const normalised = ip.startsWith("::ffff:") ? ip.slice(7) : ip;

  const geo = geoip.lookup(normalised);
  if (!geo) return empty;

  return {
    country: geo.country || null,
    city:    geo.city    || null,
    lat:     geo.ll?.[0] ?? null,
    lon:     geo.ll?.[1] ?? null,
    isp:     null, // available in MaxMind paid GeoIP2-City; set null for GeoLite2
  };
}
