import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import * as net from 'net';

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const first = parts[0];
    const second = parts[1];

    // 127.0.0.0/8 (Loopback)
    if (first === 127) return true;
    // 10.0.0.0/8 (Private)
    if (first === 10) return true;
    // 172.16.0.0/12 (Private)
    if (first === 172 && second >= 16 && second <= 31) return true;
    // 192.168.0.0/16 (Private)
    if (first === 192 && second === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (first === 169 && second === 254) return true;
    // 0.0.0.0/8 (Broadcast/unspecified)
    if (first === 0) return true;

    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();

    // Loopback ::1
    if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') return true;
    // Unspecified ::
    if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0') return true;

    // Unique Local Address (fc00::/7)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

    // Link-local (fe80::/10)
    if (
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb')
    ) {
      return true;
    }

    // IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (normalized.startsWith('::ffff:')) {
      const ipv4Part = normalized.substring(7);
      if (net.isIPv4(ipv4Part)) {
        return isPrivateIp(ipv4Part);
      }
    }

    return false;
  }

  return false;
}

export function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid URL: ${url}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `Only HTTPS URLs are allowed, got: ${parsed.protocol}`
    );
  }

  const hostname = parsed.hostname;

  // Handle localhost explicitly
  if (hostname.toLowerCase() === 'localhost') {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `URLs pointing to private or local addresses are not allowed: ${hostname}`
    );
  }

  // Strip brackets for IPv6 check
  let ipToCheck = hostname;
  if (ipToCheck.startsWith('[') && ipToCheck.endsWith(']')) {
    ipToCheck = ipToCheck.slice(1, -1);
  }

  if (isPrivateIp(ipToCheck)) {
    throw new McpError(
      ErrorCode.InvalidRequest,
      `URLs pointing to private or local addresses are not allowed: ${hostname}`
    );
  }
}
