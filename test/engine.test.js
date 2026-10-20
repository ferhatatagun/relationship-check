import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBank, validateBank, score, checkParity } from '../src/index.js';

const en = loadBank('en');
const tr = loadBank('tr');

const miniBank = (questions) => ({
  safety: { text: 's', resources: [{ name: 'n', contact: 'c' }] },
  scale: { min: 1, max: 5 },
  dimensions: { a: { label: 'A' }, b: { label: 'B' } },
  questions,
});

const answerAll = (bank, fn) => Object.fromEntries(bank.questions.map((q) => [q.id, fn(q)]));

test('both shipped banks pass validation', () => {
  assert.equal(en.questions.length, 20);
  assert.equal(tr.questions.length, 20);
});

test('rejects duplicate question ids', () => {
  const bank = miniBank([
    { id: 'x', dimension: 'a', text: 't' },
    { id: 'x', dimension: 'b', text: 't' },
  ]);
  assert.throws(() => validateBank(bank), /duplicate question id/);
});

test('rejects unknown dimension and empty dimension', () => {
  assert.throws(
    () => validateBank(miniBank([{ id: 'x', dimension: 'zzz', text: 't' }])),
    /unknown dimension/,
  );
  assert.throws(
    () => validateBank(miniBank([{ id: 'x', dimension: 'a', text: 't' }])),
    /dimension b has no questions/,
  );
});

test('best possible answers score 100 and high everywhere', () => {
  const answers = answerAll(en, (q) => (q.reverse ? 1 : 5));
  const result = score(en, answers);
  assert.equal(result.overall, 100);
  assert.equal(result.complete, true);
  for (const d of Object.values(result.dimensions)) {
    assert.equal(d.score, 100);
    assert.equal(d.level, 'high');
  }
});

test('worst possible answers score 0 and low everywhere', () => {
  const answers = answerAll(en, (q) => (q.reverse ? 5 : 1));
  const result = score(en, answers);
  assert.equal(result.overall, 0);
  for (const d of Object.values(result.dimensions)) assert.equal(d.level, 'low');
});

test('reverse items invert the scale', () => {
  const bank = miniBank([
    { id: 'p', dimension: 'a', text: 't' },
    { id: 'r', dimension: 'b', text: 't', reverse: true },
  ]);
  const result = score(bank, { p: 5, r: 5 });
  assert.equal(result.dimensions.a.score, 100);
  assert.equal(result.dimensions.b.score, 0);
});

test('weights change the dimension score', () => {
  const bank = {
    scale: { min: 1, max: 5 },
    safety: { text: 's', resources: [{ name: 'n', contact: 'c' }] },
    dimensions: { a: { label: 'A' } },
    questions: [
      { id: 'heavy', dimension: 'a', text: 't', weight: 3 },
      { id: 'light', dimension: 'a', text: 't' },
    ],
  };
  // heavy=5 (100%), light=1 (0%) -> 3/4 = 75
  assert.equal(score(bank, { heavy: 5, light: 1 }).dimensions.a.score, 75);
});

test('rejects unknown ids and out-of-range answers', () => {
  assert.throws(() => score(en, { nope: 3 }), /unknown question id/);
  assert.throws(() => score(en, { 'comm-1': 6 }), /integer in 1\.\.5/);
  assert.throws(() => score(en, { 'comm-1': 2.5 }), /integer in 1\.\.5/);
});

test('partial answers: unanswered dimension is null, focus is the weakest answered one', () => {
  const result = score(en, { 'comm-1': 5, 'trust-1': 1 });
  assert.equal(result.complete, false);
  assert.equal(result.answeredCount, 2);
  assert.equal(result.dimensions.conflict.score, null);
  assert.equal(result.dimensions.conflict.level, null);
  assert.deepEqual(result.focus, ['trust']);
  assert.equal(result.overall, 50);
});

test('EN and TR banks are structurally identical', () => {
  assert.deepEqual(checkParity(en, tr), []);
  for (const key of Object.keys(en.dimensions)) {
    for (const lvl of ['label', 'low', 'mid', 'high']) {
      assert.ok(tr.dimensions[key][lvl], `tr.${key}.${lvl} missing`);
    }
  }
});

test('banks without a safety notice are rejected', () => {
  const { safety, ...rest } = en;
  assert.throws(() => validateBank(rest), /bank\.safety/);
  assert.throws(() => validateBank({ ...en, safety: { text: 's', resources: [] } }), /bank\.safety/);
});

test('every result carries the bank safety notice, even with no answers', () => {
  for (const bank of [en, tr]) {
    const result = score(bank, {});
    assert.equal(result.safety, bank.safety);
    assert.ok(result.safety.resources.length > 0);
  }
});
