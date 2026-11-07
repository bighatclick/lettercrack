import { applyOrientationPolicy, isTabletSize } from '../orientation';

const mockLock = jest.fn(async (_lock?: unknown) => {});
const mockUnlock = jest.fn(async () => {});
jest.mock('expo-screen-orientation', () => ({
  lockAsync: (lock: unknown) => mockLock(lock),
  unlockAsync: () => mockUnlock(),
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP' },
}));

describe('orientation policy', () => {
  beforeEach(() => {
    mockLock.mockClear();
    mockUnlock.mockClear();
  });

  it('treats a short side of 600 dp or more as a tablet, in either orientation', () => {
    expect(isTabletSize(411, 914)).toBe(false); // Pixel 7
    expect(isTabletSize(1280, 800)).toBe(true); // Pixel Tablet, landscape
    expect(isTabletSize(800, 1280)).toBe(true);
    expect(isTabletSize(744, 1133)).toBe(true); // iPad mini
    expect(isTabletSize(599, 960)).toBe(false);
  });

  it('locks phones to portrait', async () => {
    await applyOrientationPolicy({ width: 411, height: 914, scale: 2.6, fontScale: 1 });
    expect(mockLock).toHaveBeenCalledWith('PORTRAIT_UP');
    expect(mockUnlock).not.toHaveBeenCalled();
  });

  it('lets tablets rotate, so they are never letterboxed', async () => {
    await applyOrientationPolicy({ width: 1280, height: 800, scale: 2, fontScale: 1 });
    expect(mockUnlock).toHaveBeenCalled();
    expect(mockLock).not.toHaveBeenCalled();
  });

  it('never throws if the native module fails', async () => {
    mockLock.mockRejectedValueOnce(new Error('no module'));
    await expect(applyOrientationPolicy({ width: 411, height: 914, scale: 2.6, fontScale: 1 })).resolves.toBeUndefined();
  });
});
