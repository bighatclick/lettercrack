import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '../fx/Icon';
import { radius, space } from '../tokens';
import { Text } from './Text';

/** A non-interactive coloured pill, e.g. "Medium" or "13-day streak". */
export function Tag({ label, bg, fg, icon }: { label: string; bg: string; fg: string; icon?: IconName }) {
  return (
    <View style={[styles.tag, { backgroundColor: bg }]}>
      {icon ? <Icon name={icon} color={fg} size={14} strokeWidth={2.6} /> : null}
      <Text variant="caption" color={fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
});
