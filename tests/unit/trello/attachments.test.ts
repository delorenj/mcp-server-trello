import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import {
  attachData,
  attachImage,
  attachImageData,
  attachFile,
  MIME_TYPES,
} from '../../../src/trello/attachments.js';

vi.mock('fs/promises', async () => {
  const actual = await vi.importActual<typeof import('fs/promises')>('fs/promises');
  return { ...actual };
});

function createAxiosMock(): AxiosInstance {
  const post = vi.fn().mockResolvedValue({ data: { id: 'a1' } });
  const get = vi.fn();
  return { post, get } as unknown as AxiosInstance;
}

describe('attachments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MIME_TYPES', () => {
    it('should be frozen', () => {
      expect(Object.isFrozen(MIME_TYPES)).toBe(true);
    });

    it('should map common extensions', () => {
      expect(MIME_TYPES['.md']).toBe('text/markdown');
      expect(MIME_TYPES['.pdf']).toBe('application/pdf');
      expect(MIME_TYPES['.png']).toBe('image/png');
    });
  });

  describe('attachData', () => {
    it('uploads raw base64 with explicit name and mime type', async () => {
      const axiosInstance = createAxiosMock();

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: Buffer.from('hello').toString('base64'),
        name: 'notes.md',
        mimeType: 'text/markdown',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/cards/c1/attachments',
        expect.anything(),
        expect.objectContaining({ headers: expect.any(Object) })
      );
      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toContain('text/markdown');
      expect(form.getBuffer().toString()).toContain('notes.md');
    });

    it('extracts mime type and bytes from a data URL', async () => {
      const axiosInstance = createAxiosMock();
      const dataUrl = `data:application/pdf;base64,${Buffer.from('pdf').toString('base64')}`;

      await attachData(axiosInstance, { cardId: 'c1', data: dataUrl, name: 'r.pdf' });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toContain('application/pdf');
    });

    it('infers mime type from filename extension when omitted', async () => {
      const axiosInstance = createAxiosMock();

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: Buffer.from('# hi').toString('base64'),
        name: 'notes.md',
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toContain('text/markdown');
    });

    it('falls back to application/octet-stream when no hints exist', async () => {
      const axiosInstance = createAxiosMock();

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: Buffer.from('blob').toString('base64'),
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toContain('application/octet-stream');
    });

    it('lets explicit mimeType override one parsed from a data URL', async () => {
      const axiosInstance = createAxiosMock();
      const dataUrl = `data:application/octet-stream;base64,${Buffer.from('x').toString('base64')}`;

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: dataUrl,
        name: 'a.pdf',
        mimeType: 'application/pdf',
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const body = form.getBuffer().toString();
      expect(body).toContain('application/pdf');
      expect(body).not.toContain('application/octet-stream');
    });

    it('uses a generated filename when name is omitted', async () => {
      const axiosInstance = createAxiosMock();

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: Buffer.from('blob').toString('base64'),
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toMatch(/attachment-\d+/);
    });

    it('appends an inferred extension to the generated filename when mime type is known', async () => {
      const axiosInstance = createAxiosMock();
      const dataUrl = `data:application/pdf;base64,${Buffer.from('pdf').toString('base64')}`;

      await attachData(axiosInstance, { cardId: 'c1', data: dataUrl });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toMatch(/attachment-\d+\.pdf/);
    });

    it('omits the extension when mime type has no entry in MIME_TYPES', async () => {
      const axiosInstance = createAxiosMock();

      await attachData(axiosInstance, {
        cardId: 'c1',
        data: Buffer.from('blob').toString('base64'),
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(form.getBuffer().toString()).toMatch(/attachment-\d+(?!\.)/);
    });

    it('rejects a malformed data URL without uploading', async () => {
      const axiosInstance = createAxiosMock();

      await expect(
        attachData(axiosInstance, { cardId: 'c1', data: 'data:not-valid', name: 'x.bin' })
      ).rejects.toThrow(/Invalid data URL/);
      expect(axiosInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('attachImageData', () => {
    it('defaults to image/png and a screenshot filename', async () => {
      const axiosInstance = createAxiosMock();

      await attachImageData(axiosInstance, {
        cardId: 'c1',
        imageData: Buffer.from('png').toString('base64'),
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const body = form.getBuffer().toString();
      expect(body).toContain('image/png');
      expect(body).toMatch(/screenshot-\d+\.png/);
    });

    it('respects caller-supplied mime type and name', async () => {
      const axiosInstance = createAxiosMock();

      await attachImageData(axiosInstance, {
        cardId: 'c1',
        imageData: Buffer.from('jpg').toString('base64'),
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
      const body = form.getBuffer().toString();
      expect(body).toContain('image/jpeg');
      expect(body).toContain('photo.jpg');
    });
  });

  describe('attachFile', () => {
    it('attaches a remote URL with explicit mime type', async () => {
      const axiosInstance = createAxiosMock();

      await attachFile(axiosInstance, {
        cardId: 'c1',
        fileUrl: 'https://example.com/doc.pdf',
        name: 'doc.pdf',
        mimeType: 'application/pdf',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/cards/c1/attachments', {
        url: 'https://example.com/doc.pdf',
        name: 'doc.pdf',
        mimeType: 'application/pdf',
      });
    });

    it('infers mime type from a remote URL extension', async () => {
      const axiosInstance = createAxiosMock();

      await attachFile(axiosInstance, {
        cardId: 'c1',
        fileUrl: 'https://example.com/notes.md',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/cards/c1/attachments', {
        url: 'https://example.com/notes.md',
        name: 'File Attachment',
        mimeType: 'text/markdown',
      });
    });

    it('uploads a local file:// URL as multipart form data', async () => {
      const tmpFile = path.join(os.tmpdir(), `attachments-test-${Date.now()}.md`);
      await fs.writeFile(tmpFile, '# hello');
      try {
        const axiosInstance = createAxiosMock();

        await attachFile(axiosInstance, {
          cardId: 'c1',
          fileUrl: `file://${tmpFile}`,
        });

        expect(axiosInstance.post).toHaveBeenCalledWith(
          '/cards/c1/attachments',
          expect.anything(),
          expect.objectContaining({ headers: expect.any(Object) })
        );
        // Form contains a stream so getBuffer() is unavailable; assert on form fields directly.
        const form = (axiosInstance.post as ReturnType<typeof vi.fn>).mock.calls[0][1];
        const fields = (form as unknown as { _streams: unknown[] })._streams.join('\n');
        expect(fields).toContain('text/markdown');
        expect(fields).toContain(path.basename(tmpFile));
      } finally {
        await fs.unlink(tmpFile).catch(() => {});
      }
    });

    it('throws on a missing local file', async () => {
      const axiosInstance = createAxiosMock();
      const missing = path.join(os.tmpdir(), `does-not-exist-${Date.now()}.txt`);

      await expect(
        attachFile(axiosInstance, { cardId: 'c1', fileUrl: `file://${missing}` })
      ).rejects.toThrow(/File not found/);
      expect(axiosInstance.post).not.toHaveBeenCalled();
    });

    it('throws InvalidRequest on a malformed remote URL', async () => {
      const axiosInstance = createAxiosMock();

      await expect(
        attachFile(axiosInstance, { cardId: 'c1', fileUrl: 'not-a-url' })
      ).rejects.toThrow(/Invalid URL/);
      expect(axiosInstance.post).not.toHaveBeenCalled();
    });
  });

  describe('attachImage', () => {
    it('delegates to attachFile with a default name', async () => {
      const axiosInstance = createAxiosMock();

      await attachImage(axiosInstance, {
        cardId: 'c1',
        imageUrl: 'https://example.com/cat.png',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith('/cards/c1/attachments', {
        url: 'https://example.com/cat.png',
        name: 'Image Attachment',
        mimeType: 'image/png',
      });
    });

    it('respects a caller-supplied name', async () => {
      const axiosInstance = createAxiosMock();

      await attachImage(axiosInstance, {
        cardId: 'c1',
        imageUrl: 'https://example.com/cat.png',
        name: 'cat',
      });

      expect(axiosInstance.post).toHaveBeenCalledWith(
        '/cards/c1/attachments',
        expect.objectContaining({ name: 'cat' })
      );
    });
  });
});
