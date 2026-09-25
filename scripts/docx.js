// Reads multiple-choice questions out of a .docx file with no dependencies.
//
// Expected layout (as in the Word files this site is built from):
//   Question text paragraph
//   A.<tab>option text
//   B.<tab>option text
//   ...
// The correct option is the one whose option text is bold.

const fs = require('fs');
const zlib = require('zlib');

function readZipEntry(buf, name) {
  // Find the End Of Central Directory record.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid .docx (zip) file');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const entryName = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (entryName === name) {
      const lNameLen = buf.readUInt16LE(localOffset + 26);
      const lExtraLen = buf.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const data = buf.subarray(start, start + compSize);
      return method === 0 ? data : zlib.inflateRawSync(data);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`${name} not found in .docx`);
}

function decode(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&');
}

function isBold(rPr) {
  const m = rPr.match(/<w:b(?:\s+w:val="([^"]*)")?\s*\/>/);
  return !!m && !['0', 'false', 'off'].includes(m[1]);
}

// Returns [{ text, bold }] runs for each paragraph.
function paragraphs(xml) {
  const body = xml.match(/<w:body>([\s\S]*)<\/w:body>/)[1];
  return (body.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).map((p) =>
    (p.match(/<w:r[ >][\s\S]*?<\/w:r>/g) || []).map((r) => {
      const rPr = (r.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/) || [, ''])[1];
      const text = (r.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || [])
        .map((t) => decode(t.replace(/<[^>]+>/g, '')))
        .join('');
      return { text, bold: isBold(rPr) };
    }),
  );
}

const OPTION = /^\s*([A-Z])[.)]\s*/;

function parseDocx(file) {
  const xml = readZipEntry(fs.readFileSync(file), 'word/document.xml').toString('utf8');
  const questions = [];
  const problems = [];
  let current = null;

  for (const runs of paragraphs(xml)) {
    const text = runs.map((r) => r.text).join('').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const m = text.match(OPTION);
    if (m && current) {
      // Bold on the option text itself (not just on the "A." label) marks the answer.
      let seen = '';
      let bold = false;
      for (const r of runs) {
        seen += r.text;
        const partOfLabel = /^\s*[A-Z]?[.)]?\s*$/.test(seen);
        if (!partOfLabel && r.bold && r.text.replace(OPTION, '').trim()) bold = true;
      }
      current.options.push({ letter: m[1], text: text.replace(OPTION, '').trim(), correct: bold });
    } else {
      current = { question: text, options: [] };
      questions.push(current);
    }
  }

  for (const [i, q] of questions.entries()) {
    const n = q.options.filter((o) => o.correct).length;
    if (q.options.length < 2) problems.push(`question ${i + 1} has ${q.options.length} options: "${q.question}"`);
    else if (n !== 1) problems.push(`question ${i + 1} has ${n} bold answers: "${q.question}"`);
  }
  return { questions, problems };
}

module.exports = { parseDocx };
