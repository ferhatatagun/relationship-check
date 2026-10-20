export const LEVELS = { lowBelow: 40, midBelow: 70 };

function fail(message) {
  throw new Error(message);
}

export function validateBank(bank) {
  const { scale, dimensions, questions, safety } = bank ?? {};
  if (!safety?.text || !Array.isArray(safety.resources) || safety.resources.length === 0) {
    fail('bank.safety needs text and at least one resource');
  }
  if (!scale || !Number.isInteger(scale.min) || !Number.isInteger(scale.max) || scale.min >= scale.max) {
    fail('bank.scale must have integer min < max');
  }
  if (!dimensions || Object.keys(dimensions).length === 0) fail('bank.dimensions is empty');
  if (!Array.isArray(questions) || questions.length === 0) fail('bank.questions is empty');

  const seen = new Set();
  const used = new Set();
  for (const q of questions) {
    if (!q.id || !q.text) fail(`question needs id and text: ${JSON.stringify(q)}`);
    if (seen.has(q.id)) fail(`duplicate question id: ${q.id}`);
    seen.add(q.id);
    if (!(q.dimension in dimensions)) fail(`question ${q.id} has unknown dimension: ${q.dimension}`);
    used.add(q.dimension);
    if (q.weight !== undefined && !(q.weight > 0)) fail(`question ${q.id} has invalid weight`);
  }
  for (const key of Object.keys(dimensions)) {
    if (!used.has(key)) fail(`dimension ${key} has no questions`);
  }
  return bank;
}

export function levelFor(score) {
  if (score < LEVELS.lowBelow) return 'low';
  if (score < LEVELS.midBelow) return 'mid';
  return 'high';
}

export function score(bank, answers) {
  validateBank(bank);
  const { min, max } = bank.scale;
  const byId = new Map(bank.questions.map((q) => [q.id, q]));

  for (const [id, value] of Object.entries(answers)) {
    if (!byId.has(id)) fail(`unknown question id: ${id}`);
    if (!Number.isInteger(value) || value < min || value > max) {
      fail(`answer for ${id} must be an integer in ${min}..${max}, got ${value}`);
    }
  }

  const acc = Object.fromEntries(
    Object.keys(bank.dimensions).map((key) => [key, { sum: 0, weight: 0, answered: 0, total: 0 }]),
  );
  for (const q of bank.questions) {
    const d = acc[q.dimension];
    d.total += 1;
    if (!(q.id in answers)) continue;
    const w = q.weight ?? 1;
    let unit = (answers[q.id] - min) / (max - min);
    if (q.reverse) unit = 1 - unit;
    d.sum += unit * w;
    d.weight += w;
    d.answered += 1;
  }

  const dimensions = {};
  let overallSum = 0;
  let overallCount = 0;
  for (const [key, d] of Object.entries(acc)) {
    const pct = d.weight > 0 ? Math.round((d.sum / d.weight) * 100) : null;
    dimensions[key] = {
      score: pct,
      level: pct === null ? null : levelFor(pct),
      answered: d.answered,
      total: d.total,
    };
    if (pct !== null) {
      overallSum += pct;
      overallCount += 1;
    }
  }

  const overall = overallCount > 0 ? Math.round(overallSum / overallCount) : null;
  const scored = Object.entries(dimensions).filter(([, d]) => d.score !== null);
  const lowest = scored.length ? Math.min(...scored.map(([, d]) => d.score)) : null;
  const focus = scored.filter(([, d]) => d.score === lowest).map(([key]) => key);

  return {
    dimensions,
    overall,
    focus,
    safety: bank.safety,
    answeredCount: Object.keys(answers).length,
    complete: Object.keys(answers).length === bank.questions.length,
  };
}

export function checkParity(a, b) {
  const problems = [];
  const qa = new Map(a.questions.map((q) => [q.id, q]));
  const qb = new Map(b.questions.map((q) => [q.id, q]));
  for (const id of qa.keys()) if (!qb.has(id)) problems.push(`missing in second bank: ${id}`);
  for (const id of qb.keys()) if (!qa.has(id)) problems.push(`missing in first bank: ${id}`);
  for (const [id, q] of qa) {
    const o = qb.get(id);
    if (!o) continue;
    if (q.dimension !== o.dimension) problems.push(`${id}: dimension differs`);
    if (Boolean(q.reverse) !== Boolean(o.reverse)) problems.push(`${id}: reverse differs`);
    if ((q.weight ?? 1) !== (o.weight ?? 1)) problems.push(`${id}: weight differs`);
  }
  const da = Object.keys(a.dimensions).sort().join();
  const db = Object.keys(b.dimensions).sort().join();
  if (da !== db) problems.push('dimension keys differ');
  if (a.scale.min !== b.scale.min || a.scale.max !== b.scale.max) problems.push('scale differs');
  return problems;
}
