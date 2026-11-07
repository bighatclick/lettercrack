// Reanimated runs on the UI thread in the app. Its bundled Jest mock needs native pieces that
// aren't available here, so tests use this small stand-in covering the parts the app uses.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');

  const strip = ({ entering, exiting, layout, ...rest }) => rest;
  const wrap = (Comp) =>
    React.forwardRef((props, ref) => React.createElement(Comp, { ...strip(props), ref }));

  // Layout animation builders: every chained call returns the same builder.
  const builder = () => {
    const b = new Proxy(function () {}, { get: () => () => b, apply: () => b });
    return b;
  };
  const value = (v) => (typeof v === 'object' && v !== null && 'toValue' in v ? v.toValue : v);
  const anim = (toValue) => toValue;

  const Animated = {
    View: wrap(RN.View),
    Text: wrap(RN.Text),
    ScrollView: wrap(RN.ScrollView),
    Image: wrap(RN.Image),
    createAnimatedComponent: wrap,
  };

  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (init) =>
      React.useRef({
        value: init,
        set(v) {
          this.value = v;
        },
        get() {
          return this.value;
        },
      }).current,
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    cancelAnimation: () => {},
    withTiming: anim,
    withSpring: anim,
    withDelay: (_d, a) => a,
    withRepeat: (a) => a,
    withSequence: (...a) => value(a[a.length - 1]),
    Easing: new Proxy({}, { get: () => (x) => (typeof x === 'function' ? x : (t) => t) }),
    FadeInDown: builder(),
    FadeInUp: builder(),
    FadeIn: builder(),
    ZoomIn: builder(),
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  };
});
