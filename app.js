import { score } from './src/engine.js';

const UI = {
  en: {
    title: 'Relationship Check',
    intro: 'A short, private self-reflection quiz about five parts of a relationship. It takes about 3 minutes. Answers stay in your browser and are never sent anywhere.',
    start: 'Start',
    question: (i, n) => `Question ${i} of ${n}`,
    back: 'Back',
    restart: 'Start over',
    result: 'Your results',
    overall: 'Overall',
    focus: 'Worth a conversation',
    note: 'This is a self-reflection tool, not a diagnosis or professional advice.',
    safetyTitle: 'If you do not feel safe',
    levels: { low: 'Needs attention', mid: 'Mixed', high: 'Strong' },
  },
  tr: {
    title: 'İlişki Kontrolü',
    intro: 'İlişkinin beş yönü hakkında kısa ve gizli bir kendini değerlendirme testi. Yaklaşık 3 dakika sürer. Cevaplarınız tarayıcınızda kalır, hiçbir yere gönderilmez.',
    start: 'Başla',
    question: (i, n) => `Soru ${i} / ${n}`,
    back: 'Geri',
    restart: 'Baştan başla',
    result: 'Sonuçların',
    overall: 'Genel',
    focus: 'Konuşmaya değer',
    note: 'Bu bir kendini değerlendirme aracıdır; tanı ya da profesyonel tavsiye değildir.',
    safetyTitle: 'Kendinizi güvende hissetmiyorsanız',
    levels: { low: 'Dikkat gerekiyor', mid: 'Karışık', high: 'Güçlü' },
  },
};

const root = document.getElementById('screen');
const footer = document.getElementById('safety-footer');
const titleEl = document.getElementById('title');
const langButtons = document.querySelectorAll('.lang button');

const state = { lang: null, bank: null, index: -1, answers: {} };

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  node.append(...children);
  return node;
}

function safetyBox(bank, t) {
  const list = el('ul', {}, ...bank.safety.resources.map((r) => el('li', {}, `${r.name}: ${r.contact}`)));
  return el('div', { class: 'safety-box', role: 'note' }, el('strong', {}, t.safetyTitle), el('p', {}, bank.safety.text), list);
}

async function setLang(lang) {
  state.lang = lang;
  state.bank = await (await fetch(`./data/questions.${lang}.json`)).json();
  state.index = -1;
  state.answers = {};
  document.documentElement.lang = lang;
  const t = UI[lang];
  document.title = t.title;
  titleEl.textContent = t.title;
  langButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  footer.replaceChildren(el('span', {}, t.note));
  render();
}

function render() {
  const t = UI[state.lang];
  const { bank } = state;
  if (state.index < 0) return renderIntro(t, bank);
  if (state.index >= bank.questions.length) return renderResult(t, bank);
  renderQuestion(t, bank);
}

function renderIntro(t, bank) {
  root.replaceChildren(
    el('p', {}, t.intro),
    el('button', { class: 'primary', type: 'button', onclick: () => { state.index = 0; render(); } }, t.start),
    safetyBox(bank, t),
  );
}

function renderQuestion(t, bank) {
  const q = bank.questions[state.index];
  const total = bank.questions.length;
  const pct = (state.index / total) * 100;
  const options = bank.scale.labels.map((label, i) => {
    const value = bank.scale.min + i;
    return el('button', {
      class: 'opt',
      type: 'button',
      'aria-pressed': String(state.answers[q.id] === value),
      onclick: () => { state.answers[q.id] = value; state.index += 1; render(); },
    }, label);
  });
  root.replaceChildren(
    el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': String(state.index) }, el('div', { style: `width:${pct}%` })),
    el('div', { class: 'muted' }, t.question(state.index + 1, total)),
    el('p', { class: 'question' }, q.text),
    el('div', { class: 'options' }, ...options),
    el('div', { class: 'nav' }, el('button', { class: 'link', type: 'button', onclick: () => { state.index -= 1; render(); } }, t.back)),
  );
  root.querySelector('.opt').focus({ preventScroll: true });
}

function renderResult(t, bank) {
  const result = score(bank, state.answers);
  const dims = Object.entries(result.dimensions).map(([key, d]) => {
    const info = bank.dimensions[key];
    const isFocus = result.focus.includes(key);
    return el('div', { class: 'dim' },
      el('div', { class: 'dim-head' },
        el('span', {}, info.label, isFocus ? el('span', { class: 'tag' }, t.focus) : ''),
        el('span', {}, `${d.score}% · ${t.levels[d.level]}`)),
      el('div', { class: `bar ${d.level}` }, el('div', { style: `width:${d.score}%` })),
      el('p', { class: 'muted' }, info[d.level]));
  });
  root.replaceChildren(
    el('h2', {}, t.result),
    el('p', {}, el('strong', {}, `${t.overall}: ${result.overall}%`)),
    ...dims,
    safetyBox(bank, t),
    el('div', { class: 'nav' },
      el('button', { class: 'primary', type: 'button', onclick: () => setLang(state.lang) }, t.restart)),
  );
  root.scrollIntoView({ block: 'start' });
}

langButtons.forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
setLang(navigator.language?.toLowerCase().startsWith('tr') ? 'tr' : 'en');
