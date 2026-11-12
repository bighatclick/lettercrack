import { makeOnce, NAV_GUARD_MS } from '../nav';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

describe('makeOnce', () => {
  it('ignores the same action again inside the guard window', () => {
    let t = 1000;
    const once = makeOnce(() => t);
    const action = jest.fn();
    once('a', action);
    t += 50;
    once('a', action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('lets the same action through once the window has passed', () => {
    let t = 1000;
    const once = makeOnce(() => t);
    const action = jest.fn();
    once('a', action);
    t += NAV_GUARD_MS;
    once('a', action);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('lets a different action through at once', () => {
    const once = makeOnce(() => 0);
    const a = jest.fn();
    const b = jest.fn();
    once('a', a);
    once('b', b);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe('pushOnce', () => {
  it('pushes once for a double tap', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { router } = require('expo-router');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { pushOnce } = require('../nav');
    pushOnce('/stats');
    pushOnce('/stats');
    pushOnce({ pathname: '/solved', params: { key: 'daily:2027-01-10' } });
    expect(router.push).toHaveBeenCalledTimes(2);
    expect(router.push).toHaveBeenNthCalledWith(1, '/stats');
  });
});
