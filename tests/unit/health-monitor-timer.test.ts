import { describe, it, expect, vi, afterEach } from 'vitest';
import { TrelloHealthMonitor } from '../../src/health/health-monitor.js';

/**
 * The health monitor starts a background interval that prunes old performance
 * samples. Because the server runs over stdio, that timer must not keep the Node
 * event loop alive: when the client disconnects, stdin EOFs and there is no work
 * left, but a referenced timer keeps the process running forever and it ends up
 * reparented to init. See #92.
 */
describe('TrelloHealthMonitor background timer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('unrefs its interval so it cannot hold the event loop open', () => {
    const unref = vi.fn();
    const spy = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue({ unref, ref: vi.fn() } as unknown as ReturnType<typeof setInterval>);

    new TrelloHealthMonitor({} as never);

    expect(spy).toHaveBeenCalled();
    expect(unref).toHaveBeenCalled();
  });

  it('clears the interval when monitoring is stopped', () => {
    const handle = { unref: vi.fn(), ref: vi.fn() } as unknown as ReturnType<typeof setInterval>;
    vi.spyOn(globalThis, 'setInterval').mockReturnValue(handle);
    const clear = vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);

    const monitor = new TrelloHealthMonitor({} as never);
    monitor.stopPerformanceMonitoring();

    expect(clear).toHaveBeenCalledWith(handle);

    // Stopping twice must not clear a stale handle a second time.
    clear.mockClear();
    monitor.stopPerformanceMonitoring();
    expect(clear).not.toHaveBeenCalled();
  });
});
