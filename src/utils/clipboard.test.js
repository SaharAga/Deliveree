import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from './clipboard';

describe('copyToClipboard Utility', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when text is invalid or empty', async () => {
    expect(await copyToClipboard('')).toBe(false);
    expect(await copyToClipboard(null)).toBe(false);
    expect(await copyToClipboard(undefined)).toBe(false);
  });

  it('successfully copies text using navigator.clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const result = await copyToClipboard('123456789IL');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('123456789IL');
  });

  it('falls back to document.execCommand when navigator.clipboard throws', async () => {
    const writeTextMock = vi.fn().mockRejectedValue(new Error('Permission denied'));
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: writeTextMock
      }
    });

    const mockTextarea = {
      value: '',
      setAttribute: vi.fn(),
      style: {},
      focus: vi.fn(),
      select: vi.fn()
    };

    const mockDocument = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      createElement: vi.fn().mockReturnValue(mockTextarea),
      execCommand: vi.fn().mockReturnValue(true)
    };
    vi.stubGlobal('document', mockDocument);

    const result = await copyToClipboard('FALLBACK_CODE');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('FALLBACK_CODE');
    expect(mockDocument.createElement).toHaveBeenCalledWith('textarea');
    expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockTextarea);
    expect(mockDocument.execCommand).toHaveBeenCalledWith('copy');
    expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockTextarea);
  });

  it('returns false if both modern clipboard and execCommand fail', async () => {
    vi.stubGlobal('navigator', {});
    const mockDocument = {
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn()
      },
      createElement: vi.fn().mockReturnValue({
        setAttribute: vi.fn(),
        style: {},
        focus: vi.fn(),
        select: vi.fn()
      }),
      execCommand: vi.fn().mockReturnValue(false)
    };
    vi.stubGlobal('document', mockDocument);

    const result = await copyToClipboard('TEST');
    expect(result).toBe(false);
  });
});
