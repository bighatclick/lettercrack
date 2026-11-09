import { render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ImperativeRoutingQueueBridge } from 'expo-router/build/global-state/routingQueueContext';

// D10: when Android recreates the activity (e.g. a font size change), the new navigation root binds
// the global router before the old root unmounts. Unpatched expo-router then unbinds it, and every
// later router.push throws "The imperative router is unavailable…" and crashes the release build.
// patches/expo-router+*.patch keeps the newer binding. This test fails if the patch isn't applied.
describe('imperative router across a root remount', () => {
  const quiet = jest.spyOn(console, 'error').mockImplementation(() => {});
  afterAll(() => quiet.mockRestore());

  it('stays bound to the new root after the old one unmounts', async () => {
    const oldEnqueue = jest.fn();
    const newEnqueue = jest.fn();
    const setMode = jest.fn();
    const view = await render(<ImperativeRoutingQueueBridge key="old" enqueue={oldEnqueue} setTransitionMode={setMode} />);
    await view.rerender(
      <>
        <ImperativeRoutingQueueBridge key="old" enqueue={oldEnqueue} setTransitionMode={setMode} />
        <ImperativeRoutingQueueBridge key="new" enqueue={newEnqueue} setTransitionMode={setMode} />
      </>,
    );
    await view.rerender(<ImperativeRoutingQueueBridge key="new" enqueue={newEnqueue} setTransitionMode={setMode} />);

    expect(() => router.push('/stats')).not.toThrow();
    expect(newEnqueue).toHaveBeenCalled();
    expect(oldEnqueue).not.toHaveBeenCalled();

    // The last root going away still unbinds, as upstream intends.
    await view.unmount();
    expect(() => router.push('/stats')).toThrow(/unavailable before the first render/);
  });
});
