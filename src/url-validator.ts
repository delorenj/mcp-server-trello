import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.\d+\.\d+\.\d+$/,
  /^\[::1\]$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^::$/,
];

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

  for (const pattern of PRIVATE_HOST_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `URLs pointing to private or local addresses are not allowed: ${hostname}`
      );
    }
  }
}
