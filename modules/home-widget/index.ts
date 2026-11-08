import { requireOptionalNativeModule } from 'expo';

export type HomeWidgetModule = { setData(json: string): boolean };

/** Android only. Null on iOS, web, Expo Go and in tests: the widget is then simply not updated. */
export const HomeWidget = requireOptionalNativeModule<HomeWidgetModule>('HomeWidget');
