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
  /** "Did you know?" line from the Library content, when there is one. */
  fact?: string;
  work: string;
  year: number;
};

/** Shown after every solve (CG-R06): who said it, when they lived, and where the line comes from. */
export function AuthorCard({ author, dates, bio, fact, work, year }: AuthorCardProps) {
  const { t } = useTranslation();
  const { hues, hue } = useTheme();
  return (
    <Card style={styles.card} accessible accessibilityLabel={`${t('solved.about')}. ${author}, ${dates}. ${bio ?? ''} ${fact ? `${t('solved.didYouKnow')} ${fact}` : ''} ${t('solved.source', { work, year })}`}>
      <View style={styles.rules}>
        {hues.slice(0, 4).map((h) => (
          <View key={h.name} style={[styles.rule, { backgroundColor: h.solid }]} />
        ))}
      </View>
      <Text variant="caption" color="inkMuted">
        {t('solved.about')}
      </Text>
      <Text variant="title">{author}</Text>
      <Text variant="caption" color="inkMuted">
        {dates}
      </Text>
      {bio ? <Text>{bio}</Text> : null}
      {fact ? (
        <View style={[styles.fact, { backgroundColor: hue(1).tint }]} testID="author-fact">
          <Text variant="label" color={hue(1).deep}>
            {t('solved.didYouKnow')}
          </Text>
          <Text color={hue(1).deep}>{fact}</Text>
        </View>
      ) : null}
      <Text variant="caption" color="inkMuted" style={styles.source}>
        {t('solved.source', { work, year })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.xs },
  rules: { flexDirection: 'row', gap: 4, marginBottom: space.sm },
  rule: { width: 18, height: 5, borderRadius: 3 },
  source: { fontStyle: 'italic', marginTop: space.sm },
  fact: { borderRadius: 14, padding: space.md, gap: 2, marginTop: space.sm },
});
