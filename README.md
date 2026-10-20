# relationship-check

Zero-dependency quiz engine for a bilingual (EN/TR) relationship check-in.

- 5 dimensions: communication, trust, conflict handling, closeness, shared future
- 20 Likert questions (1–5), 4 per dimension, one reverse-scored item each
- Per-dimension score 0–100 and level (`low` < 40 ≤ `mid` < 70 ≤ `high`), overall score, and `focus` (weakest dimension(s))
- Partial answers are allowed; unanswered dimensions score `null`

```js
import { loadBank, score } from './src/index.js';

const bank = loadBank('tr'); // or 'en'
const result = score(bank, { 'comm-1': 5, 'trust-1': 2 /* ... */ });
// result.dimensions.trust -> { score, level, answered, total }
// bank.dimensions.trust[result.dimensions.trust.level] -> advice text
```

```bash
npm test
```

## Question bank format

`data/questions.<locale>.json` holds `scale`, `dimensions` (label plus `low`/`mid`/`high` advice) and `questions` (`id`, `dimension`, `text`, optional `reverse`, optional `weight`). Ids, dimensions, `reverse` and `weight` must match across locales; a test enforces this.

## Status

Draft question wording and advice texts. Have them reviewed before showing to real users. This is a self-reflection tool, not a clinical assessment.
