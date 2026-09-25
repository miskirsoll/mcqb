// Builds the static site into ./public from every .docx file in ./questions.
//
// Question IDs are assigned in order: files are read alphabetically by name,
// and questions keep their order inside each file. To keep existing IDs
// stable, only ever ADD new files with a name that sorts after the old ones
// (e.g. 002-..., 003-...), and never delete or reorder questions in old files.

const fs = require('fs');
const path = require('path');
const https = require('https');
const { parseDocx } = require('./docx');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public');
const config = require(path.join(ROOT, 'site.config.json'));

// siteUrl in site.config.json is the public address used in canonical links,
// the sitemap and IndexNow. SITE_URL (env) overrides it, e.g. for local testing.
const SITE_URL = (
  process.env.SITE_URL ||
  config.siteUrl ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:3000'
).replace(/\/+$/, '');

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.–-]+\S*$/, '') + '…' : s);

// Bing/Google show ~60 characters of a title and ~155 of a description;
// Bing Webmaster Tools flags anything longer (or a description under ~25).
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 155;
const lengthWarnings = [];
function checkLengths(page, title, description) {
  if (title.length > TITLE_MAX) lengthWarnings.push(`${page}: title is ${title.length} characters`);
  if (description.length < DESC_MIN || description.length > DESC_MAX) {
    lengthWarnings.push(`${page}: description is ${description.length} characters`);
  }
}
const pad = (n) => String(n).padStart(config.idDigits, '0');
const write = (rel, content) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

// ---------- load questions ----------
const files = fs.readdirSync(path.join(ROOT, 'questions'))
  .filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
  .sort();

const questions = [];
let problems = 0;
for (const f of files) {
  const { questions: qs, problems: probs } = parseDocx(path.join(ROOT, 'questions', f));
  for (const p of probs) console.warn(`WARNING ${f}: ${p}`);
  problems += probs.length;
  for (const q of qs) {
    const num = pad(questions.length + 1);
    questions.push({ ...q, num, id: config.idPrefix + num, source: f });
  }
}
console.log(`Loaded ${questions.length} questions from ${files.length} file(s)${problems ? `, ${problems} warning(s)` : ''}`);

// ---------- templates ----------
const verification = [
  process.env.GOOGLE_SITE_VERIFICATION &&
    `<meta name="google-site-verification" content="${esc(process.env.GOOGLE_SITE_VERIFICATION)}">`,
  process.env.BING_SITE_VERIFICATION && `<meta name="msvalidate.01" content="${esc(process.env.BING_SITE_VERIFICATION)}">`,
].filter(Boolean).join('\n  ');

function layout({ title, description, canonical, body, jsonLd, noindex }) {
  if (!noindex) checkLengths(canonical, title, description);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${canonical}">${noindex ? '\n  <meta name="robots" content="noindex">' : ''}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${esc(config.siteName)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${canonical}">
  ${verification}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;600;700&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  ${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
  <header class="site-header"><div class="wrap"><a class="brand" href="/">${esc(config.siteName)}</a></div></header>
  <main class="wrap">
${body}
  </main>
  <footer class="site-footer"><div class="wrap">${esc(config.siteName)} · ${questions.length} questions</div></footer>
</body>
</html>
`;
}

function questionPage(q, i) {
  const url = `${SITE_URL}/q/${q.num}`;
  const correct = q.options.find((o) => o.correct);
  const prev = questions[i - 1];
  const next = questions[i + 1];
  const optionsText = q.options.map((o) => `${o.letter}. ${o.text}`).join(' ');
  const body = `
    <nav class="crumbs"><a href="/">${esc(config.siteName)}</a> › ${esc(q.id)}</nav>
    <article class="card">
      <p class="qid">${esc(q.id)}</p>
      <h1 class="question">${esc(q.question)}</h1>
      <ol class="options">
${q.options.map((o) => `        <li class="option${o.correct ? ' correct' : ''}"><span class="letter">${esc(o.letter)}</span><span class="text">${esc(o.text)}</span>${o.correct ? '<span class="badge">Answer</span>' : ''}</li>`).join('\n')}
      </ol>
      ${correct ? `<p class="answer"><strong>Answer:</strong> ${esc(correct.letter)}. ${esc(correct.text)}</p>` : ''}
    </article>
    <nav class="pager">
      ${prev ? `<a href="/q/${prev.num}" rel="prev">← ${esc(prev.id)}</a>` : '<span></span>'}
      ${next ? `<a href="/q/${next.num}" rel="next">${esc(next.id)} →</a>` : '<span></span>'}
    </nav>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: q.id,
    url,
    isPartOf: { '@type': 'WebSite', name: config.siteName, url: SITE_URL + '/' },
    hasPart: {
      '@type': 'Question',
      name: q.id,
      identifier: q.id,
      text: q.question,
      eduQuestionType: 'Multiple choice',
      ...(correct && { acceptedAnswer: { '@type': 'Answer', text: `${correct.letter}. ${correct.text}` } }),
      suggestedAnswer: q.options.filter((o) => !o.correct).map((o) => ({ '@type': 'Answer', text: `${o.letter}. ${o.text}` })),
    },
  };
  return layout({
    title: truncate(`${q.id} – ${q.question}`, TITLE_MAX),
    description: truncate(`${q.id}: ${q.question} ${optionsText}`, DESC_MAX),
    canonical: url,
    body,
    jsonLd,
  });
}

function homePage() {
  const items = questions.map((q) =>
    `        <li data-s="${esc((q.id + ' ' + q.num + ' ' + q.question).toLowerCase())}"><a href="/q/${q.num}"><span class="qid">${esc(q.id)}</span> ${esc(q.question)}</a></li>`,
  ).join('\n');
  const body = `
    <section class="hero">
      <h1>${esc(config.siteName)}</h1>
      <p>${esc(config.description)}</p>
      <input id="search" type="search" placeholder="Search by ID (e.g. ${esc(questions[0] ? questions[0].id : config.idPrefix + pad(1))}) or by words" autocomplete="off" aria-label="Search questions">
      <p id="count" class="muted">${questions.length} questions</p>
    </section>
    <ol id="list" class="qlist">
${items}
    </ol>
    <script>
      (function () {
        var input = document.getElementById('search');
        var items = Array.prototype.slice.call(document.querySelectorAll('#list li'));
        var count = document.getElementById('count');
        function run() {
          var v = input.value.trim().toLowerCase();
          var shown = 0;
          items.forEach(function (li) {
            var ok = !v || li.getAttribute('data-s').indexOf(v) !== -1;
            li.hidden = !ok;
            if (ok) shown++;
          });
          count.textContent = shown + ' of ${questions.length} questions';
        }
        input.addEventListener('input', run);
        input.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          var first = items.filter(function (li) { return !li.hidden; })[0];
          if (first) location.href = first.querySelector('a').href;
        });
      })();
    </script>`;
  return layout({
    title: truncate(`${config.siteName} – ${config.title}`, TITLE_MAX),
    description: truncate(`${config.description} ${questions.length} questions, each with its own ID (${config.idPrefix}${pad(1)}, ${config.idPrefix}${pad(2)}, …).`, DESC_MAX),
    canonical: `${SITE_URL}/`,
    body,
    jsonLd: { '@context': 'https://schema.org', '@type': 'WebSite', name: config.siteName, url: SITE_URL + '/' },
  });
}

// ---------- write output ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'static'), OUT, { recursive: true });

write('index.html', homePage());
questions.forEach((q, i) => write(`q/${q.num}.html`, questionPage(q, i)));
write('404.html', layout({
  title: `Not found | ${config.siteName}`,
  description: 'Page not found',
  canonical: `${SITE_URL}/`,
  body: `<section class="hero"><h1>Page not found</h1><p><a href="/">Back to all questions</a></p></section>`,
  noindex: true,
}));
for (const w of lengthWarnings) console.warn(`WARNING ${w}`);

const today = new Date().toISOString().slice(0, 10);
const urls = [`${SITE_URL}/`, ...questions.map((q) => `${SITE_URL}/q/${q.num}`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
write(`${config.indexNowKey}.txt`, config.indexNowKey);
console.log(`Wrote ${urls.length} pages to public/ for ${SITE_URL}`);

// ---------- IndexNow (Bing, Yandex, Seznam, Naver…) ----------
// Only on real production deploys, so previews and local builds don't ping.
if (process.env.VERCEL_ENV === 'production' && !SITE_URL.startsWith('http://localhost')) {
  const payload = JSON.stringify({
    host: new URL(SITE_URL).host,
    key: config.indexNowKey,
    keyLocation: `${SITE_URL}/${config.indexNowKey}.txt`,
    urlList: urls,
  });
  const req = https.request('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(payload) },
    timeout: 15000,
  }, (res) => {
    console.log(`IndexNow: submitted ${urls.length} URLs, response ${res.statusCode}`);
    res.resume();
  });
  req.on('error', (e) => console.warn(`IndexNow: failed (${e.message}) – the site still deployed fine`));
  req.on('timeout', () => req.destroy(new Error('timeout')));
  req.end(payload);
}
