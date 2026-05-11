import { AxiosInstance } from 'axios';
import FormData from 'form-data';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TrelloAttachment } from '../types.js';

export const MIME_TYPES: Readonly<{ [key: string]: string }> = Object.freeze({
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',

  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // Text
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.log': 'text/plain',

  // Code
  '.html': 'text/html',
  '.htm': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.ts': 'application/typescript',
  '.tsx': 'application/typescript',
  '.jsx': 'application/javascript',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',

  // Archives
  '.zip': 'application/zip',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',

  // Media
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.webm': 'video/webm',
});

const DEFAULT_MIME_TYPE = 'application/octet-stream';

function mimeFromFilename(filename: string | undefined): string | undefined {
  if (!filename) return undefined;
  const ext = path.extname(filename).toLowerCase();
  return MIME_TYPES[ext];
}

function extensionFromMime(mimeType: string): string {
  const match = Object.entries(MIME_TYPES).find(([, mime]) => mime === mimeType);
  return match?.[0] ?? '';
}

export interface AttachDataParams {
  cardId: string;
  data: string;
  name?: string;
  mimeType?: string;
}

export async function attachData(
  axiosInstance: AxiosInstance,
  { cardId, data, name, mimeType }: AttachDataParams
): Promise<TrelloAttachment> {
  let buffer: Buffer;
  let effectiveMimeType = mimeType;

  if (data.startsWith('data:')) {
    const matches = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new McpError(ErrorCode.InvalidRequest, 'Invalid data URL format');
    }
    effectiveMimeType = effectiveMimeType || matches[1];
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(data, 'base64');
  }

  effectiveMimeType = effectiveMimeType || mimeFromFilename(name) || DEFAULT_MIME_TYPE;

  const extension = extensionFromMime(effectiveMimeType);
  const fileName = name || `attachment-${Date.now()}${extension}`;
  const form = new FormData();
  form.append('file', buffer, { filename: fileName, contentType: effectiveMimeType });
  form.append('name', fileName);
  form.append('mimeType', effectiveMimeType);

  const response = await axiosInstance.post(`/cards/${cardId}/attachments`, form, {
    headers: { ...form.getHeaders() },
  });
  return response.data;
}

export interface AttachImageDataParams {
  cardId: string;
  imageData: string;
  name?: string;
  mimeType?: string;
}

export async function attachImageData(
  axiosInstance: AxiosInstance,
  { cardId, imageData, name, mimeType }: AttachImageDataParams
): Promise<TrelloAttachment> {
  return attachData(axiosInstance, {
    cardId,
    data: imageData,
    name: name || `screenshot-${Date.now()}.png`,
    mimeType: mimeType || 'image/png',
  });
}

export interface AttachFileParams {
  cardId: string;
  fileUrl: string;
  name?: string;
  mimeType?: string;
}

export async function attachFile(
  axiosInstance: AxiosInstance,
  { cardId, fileUrl, name, mimeType }: AttachFileParams
): Promise<TrelloAttachment> {
  if (fileUrl.startsWith('file://')) {
    return uploadLocalFile(axiosInstance, { cardId, fileUrl, name, mimeType });
  }
  return attachRemoteUrl(axiosInstance, { cardId, fileUrl, name, mimeType });
}

async function uploadLocalFile(
  axiosInstance: AxiosInstance,
  { cardId, fileUrl, name, mimeType }: AttachFileParams
): Promise<TrelloAttachment> {
  let localPath: string;
  try {
    localPath = fileURLToPath(fileUrl);
  } catch {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid file URL: ${fileUrl}`);
  }
  const effectiveMimeType =
    mimeType || mimeFromFilename(localPath) || DEFAULT_MIME_TYPE;

  try {
    await fs.access(localPath);
  } catch {
    throw new McpError(ErrorCode.InvalidRequest, `File not found: ${localPath}`);
  }

  const fileName = name || path.basename(localPath);
  const form = new FormData();
  form.append('file', createReadStream(localPath), {
    filename: fileName,
    contentType: effectiveMimeType,
  });
  form.append('name', fileName);
  form.append('mimeType', effectiveMimeType);

  const response = await axiosInstance.post(`/cards/${cardId}/attachments`, form, {
    headers: { ...form.getHeaders() },
  });
  return response.data;
}

async function attachRemoteUrl(
  axiosInstance: AxiosInstance,
  { cardId, fileUrl, name, mimeType }: AttachFileParams
): Promise<TrelloAttachment> {
  let remoteUrlPath: string;
  try {
    remoteUrlPath = new URL(fileUrl).pathname;
  } catch {
    throw new McpError(ErrorCode.InvalidRequest, `Invalid URL: ${fileUrl}`);
  }
  const effectiveMimeType =
    mimeType || mimeFromFilename(remoteUrlPath) || DEFAULT_MIME_TYPE;

  const response = await axiosInstance.post(`/cards/${cardId}/attachments`, {
    url: fileUrl,
    name: name || 'File Attachment',
    mimeType: effectiveMimeType,
  });
  return response.data;
}

export interface AttachImageParams {
  cardId: string;
  imageUrl: string;
  name?: string;
}

export async function attachImage(
  axiosInstance: AxiosInstance,
  { cardId, imageUrl, name }: AttachImageParams
): Promise<TrelloAttachment> {
  // attachFile auto-detects MIME type for images via the URL extension
  return attachFile(axiosInstance, {
    cardId,
    fileUrl: imageUrl,
    name: name || 'Image Attachment',
  });
}
