import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '../primitives/Card';
import { Text } from '../primitives/Text';
import { useTheme } from '../theme';
import { space } from '../tokens';

export type AuthorCardProps = {
  author: string;
  dates: string;
  bio: string | undefined;
  work: string;
  year: number;
};

/** Shown after every solve (CG-R06): who said it, when they lived, and where the line comes from. */
export function AuthorCard({ author, dates, bio, work, year }: AuthorCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card style={styles.card} accessible accessibilityLabel={`${t('solved.about')}. ${author}, ${dates}. ${bio ?? ''} ${t('solved.source', { work, year })}`}>
      <View style={[styles.rule, { backgroundColor: colors.accent }]} />
      <Text variant="caption" color="inkMuted">
        {t('solved.about')}
      </Text>
      <Text variant="title">{author}</Text>
      <Text variant="caption" color="inkMuted">
        {dates}
      </Text>
      {bio ? <Text>{bio}</Text> : null}
      <Text variant="caption" color="inkMuted" style={styles.source}>
        {t('solved.source', { work, year })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
  rule: { width: 32, height: 3, borderRadius: 2, marginBottom: space.sm },
  source: { fontStyle: 'italic', marginTop: space.sm },
});
