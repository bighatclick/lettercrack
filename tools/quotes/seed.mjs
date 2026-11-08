#!/usr/bin/env node
/**
 * Builds assets/quotes.seed.json: a small DEV-ONLY quote set so the UI can be built before the
 * real pipeline (Phase 2) produces assets/quotes.v1.json. Not editorially reviewed; it is replaced
 * by the real DB and must never be the content of a store build.
 *
 * Seed IDs live in 90001+ so they can never collide with real, permanent quote IDs.
 * Every line is from a public-domain work published before 1929 by an author who died before 1956.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const extras = JSON.parse(readFileSync(join(root, 'tools', 'quotes', 'author-extras.json'), 'utf8'));

const authors = {
  'Benjamin Franklin': { dates: '1706–1790', bio: 'American printer, writer, scientist and statesman.' },
  'William Shakespeare': { dates: '1564–1616', bio: 'English playwright and poet.' },
  'Henry David Thoreau': { dates: '1817–1862', bio: 'American essayist who lived for two years beside Walden Pond.' },
  'Ralph Waldo Emerson': { dates: '1803–1882', bio: 'American essayist, lecturer and poet.' },
  'Jane Austen': { dates: '1775–1817', bio: 'English novelist of manners, money and courtship.' },
  'Charles Dickens': { dates: '1812–1870', bio: 'English novelist of Victorian London.' },
  'John Keats': { dates: '1795–1821', bio: 'English Romantic poet.' },
  'Alfred, Lord Tennyson': { dates: '1809–1892', bio: 'Poet Laureate for most of Queen Victoria’s reign.' },
  'Mark Twain': { dates: '1835–1910', bio: 'American humorist and author of Huckleberry Finn.' },
  'Oscar Wilde': { dates: '1854–1900', bio: 'Irish playwright, poet and wit.' },
  'Emily Dickinson': { dates: '1830–1886', bio: 'American poet, published mostly after her death.' },
  'Ella Wheeler Wilcox': { dates: '1850–1919', bio: 'American poet and newspaper columnist.' },
  'Edward Bulwer-Lytton': { dates: '1803–1873', bio: 'English novelist and playwright.' },
  'Henry Wadsworth Longfellow': { dates: '1807–1882', bio: 'American poet of Hiawatha and Paul Revere’s Ride.' },
  'Alexander Pope': { dates: '1688–1744', bio: 'English poet and satirist.' },
  'Robert Louis Stevenson': { dates: '1850–1894', bio: 'Scottish author of Treasure Island.' },
  'Lewis Carroll': { dates: '1832–1898', bio: 'English writer and mathematician, author of the Alice books.' },
  'Jerome K. Jerome': { dates: '1859–1927', bio: 'English humorist and playwright.' },
};

// [text, author, work, workYear]
const lines = [
  ['Well done is better than well said.', 'Benjamin Franklin', "Poor Richard's Almanack", 1737],
  ['He that can have patience can have what he will.', 'Benjamin Franklin', "Poor Richard's Almanack", 1736],
  ['Neither a borrower nor a lender be; for loan oft loses both itself and friend.', 'William Shakespeare', 'Hamlet', 1603],
  ['This above all: to thine own self be true.', 'William Shakespeare', 'Hamlet', 1603],
  ["All the world's a stage, and all the men and women merely players.", 'William Shakespeare', 'As You Like It', 1623],
  ["Some are born great, some achieve greatness, and some have greatness thrust upon 'em.", 'William Shakespeare', 'Twelfth Night', 1623],
  ['Our life is frittered away by detail. Simplify, simplify.', 'Henry David Thoreau', 'Walden', 1854],
  ['I went to the woods because I wished to live deliberately.', 'Henry David Thoreau', 'Walden', 1854],
  ['Rather than love, than money, than fame, give me truth.', 'Henry David Thoreau', 'Walden', 1854],
  ['Trust thyself: every heart vibrates to that iron string.', 'Ralph Waldo Emerson', 'Self-Reliance (Essays: First Series)', 1841],
  ['Self-trust is the first secret of success.', 'Ralph Waldo Emerson', 'Society and Solitude', 1870],
  ['It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.', 'Jane Austen', 'Pride and Prejudice', 1813],
  ['It was the best of times, it was the worst of times.', 'Charles Dickens', 'A Tale of Two Cities', 1859],
  ['Annual income twenty pounds, annual expenditure nineteen nineteen and six, result happiness.', 'Charles Dickens', 'David Copperfield', 1850],
  ['A thing of beauty is a joy for ever.', 'John Keats', 'Endymion', 1818],
  ["'Tis better to have loved and lost than never to have loved at all.", 'Alfred, Lord Tennyson', 'In Memoriam A.H.H.', 1850],
  ['Courage is resistance to fear, mastery of fear—not absence of fear.', 'Mark Twain', "Pudd'nhead Wilson", 1894],
  ["Truth is stranger than Fiction, but it is because Fiction is obliged to stick to possibilities; Truth isn't.", 'Mark Twain', 'Following the Equator', 1897],
  ['We are all in the gutter, but some of us are looking at the stars.', 'Oscar Wilde', "Lady Windermere's Fan", 1893],
  ['Experience is the name every one gives to their mistakes.', 'Oscar Wilde', "Lady Windermere's Fan", 1893],
  ['I can resist everything except temptation.', 'Oscar Wilde', "Lady Windermere's Fan", 1893],
  ['Hope is the thing with feathers that perches in the soul.', 'Emily Dickinson', 'Poems, Second Series', 1891],
  ['Laugh, and the world laughs with you; weep, and you weep alone.', 'Ella Wheeler Wilcox', 'Solitude (Poems of Passion)', 1883],
  ['Beneath the rule of men entirely great, the pen is mightier than the sword.', 'Edward Bulwer-Lytton', 'Richelieu', 1839],
  ['Let us, then, be up and doing, with a heart for any fate.', 'Henry Wadsworth Longfellow', 'A Psalm of Life', 1838],
  ['To err is human, to forgive divine.', 'Alexander Pope', 'An Essay on Criticism', 1711],
  ['A little learning is a dangerous thing.', 'Alexander Pope', 'An Essay on Criticism', 1711],
  ['To travel hopefully is a better thing than to arrive.', 'Robert Louis Stevenson', 'Virginibus Puerisque', 1881],
  ['Now, here, you see, it takes all the running you can do, to keep in the same place.', 'Lewis Carroll', 'Through the Looking-Glass', 1871],
  ['I like work: it fascinates me. I can sit and look at it for hours.', 'Jerome K. Jerome', 'Three Men in a Boat', 1889],
];

const difficultyFor = (len) => (len <= 80 ? 'easy' : len <= 100 ? 'medium' : len <= 130 ? 'hard' : 'expert');

const quotes = lines.map(([text, author, work, workYear], i) => {
  const a = authors[author];
  if (!a) throw new Error(`no author entry for ${author}`);
  return {
    id: 90001 + i,
    text,
    author,
    authorDates: a.dates,
    work,
    workYear,
    sourceCollection: 'Original text (dev seed, pending editorial review)',
    sourceEdition: `First published ${workYear}`,
    topics: [],
    difficulty: difficultyFor(text.length),
  };
});

const db = {
  version: 'seed',
  note: 'DEV SEED ONLY. Replaced by assets/quotes.v1.json from the Phase 2 pipeline.',
  authors: Object.fromEntries(
    Object.entries(authors).map(([name, a]) => [name, { dates: a.dates, bio: a.bio, set: extras[name]?.set, fact: extras[name]?.fact }]),
  ),
  // First 10 IDs are reserved for dailies; the rest form the level pool.
  dailyOrder: quotes.slice(0, 10).map((q) => q.id).reverse(),
  quotes,
};

writeFileSync(join(root, 'assets', 'quotes.seed.json'), JSON.stringify(db, null, 2) + '\n');
console.log(`wrote assets/quotes.seed.json (${quotes.length} quotes)`);
