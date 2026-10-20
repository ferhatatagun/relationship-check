# relationship-check

Zero-dependency quiz engine for a bilingual (EN/TR) relationship check-in.

- 5 dimensions: communication, trust, conflict handling, closeness, shared future
- 20 Likert questions (1–5), 4 per dimension, one reverse-scored item each
- Per-dimension score 0–100 and level (`low` < 40 ≤ `mid` < 70 ≤ `high`), overall score, and `focus` (weakest dimension(s))
- Partial answers are allowed; unanswered dimensions score `null`
- Every bank carries a `safety` notice (domestic-violence warning plus helplines) that `score()` returns with every result; show it on the results screen always

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

Live: https://ferhatatagun.github.io/relationship-check/

## Web UI

Static page (`index.html`, `app.js`, `style.css`) that imports the engine directly; no build step. Run locally with `python3 -m http.server` and open http://localhost:8000. Answers never leave the browser.

## Question bank format

`data/questions.<locale>.json` holds `scale`, `dimensions` (label plus `low`/`mid`/`high` advice) and `questions` (`id`, `dimension`, `text`, optional `reverse`, optional `weight`). Ids, dimensions, `reverse` and `weight` must match across locales; a test enforces this.

## Safety notice

Questions such as checking a partner's phone or feeling afraid to raise topics can touch on controlling or abusive dynamics. `bank.safety` holds localized text and helplines (TR: 112, ALO 183, 155, KADES; EN: 112, US and UK hotlines). Display it with every result, not only for low scores, and verify the numbers for any region you ship to.

## References

The five dimensions are informed by Gottman & Levenson (2000), Gottman et al. (1998), Rempel, Holmes & Zanna (1985) and Sternberg (1986); full citations with DOIs are on the live page. The questions themselves are original and not a validated instrument.

## Status

Draft question wording and advice texts. Have them reviewed before showing to real users. This is a self-reflection tool, not a clinical assessment.
