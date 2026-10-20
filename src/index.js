import { readFileSync } from 'node:fs';
import { validateBank } from './engine.js';

export * from './engine.js';

export function loadBank(locale) {
  const url = new URL(`../data/questions.${locale}.json`, import.meta.url);
  return validateBank(JSON.parse(readFileSync(url, 'utf8')));
}
