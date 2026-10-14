// Normalizes raw lyric lines ({ time, endTime?, text, words? }) into lines
// with word-level timings so every synced line can render a karaoke fill.
// Lines without real word timings get estimated ones (marked `estimated`).

// Slowest plausible singing pace; only limits the fill when a long
// instrumental gap follows the line, otherwise the line's own span is used
const MAX_MS_PER_CHAR = 220;
const MIN_FILL_MS = 700;
// The last word usually ends a little before the next line starts
const LINE_END_GAP_MS = 200;
const LINE_TAIL_MS = 4000;

function estimateWords(text, start, end) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const chars = text.replace(/\s+/g, '').length;
  const available = Math.max(end - start - LINE_END_GAP_MS, 300);
  const fillMs = Math.min(available, Math.max(MIN_FILL_MS, chars * MAX_MS_PER_CHAR));
  const weights = tokens.map((t) => t.length + 1);
  const total = weights.reduce((a, b) => a + b, 0);

  let cursor = start;
  return tokens.map((token, i) => {
    const dur = (fillMs * weights[i]) / total;
    const word = {
      text: token,
      start: cursor,
      end: cursor + dur,
      spaceAfter: i < tokens.length - 1,
    };
    cursor += dur;
    return word;
  });
}

export function buildLyricLines(raw) {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { lines: [], synced: false };
  }

  const synced = raw.some((l) => l.time > 0);
  const source = synced ? [...raw].sort((a, b) => a.time - b.time) : raw;
  const lines = [];

  source.forEach((line, i) => {
    const text = (line.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return;

    if (!synced) {
      lines.push({ key: `p${i}`, time: 0, endTime: 0, text, words: null });
      return;
    }

    // Empty LRC lines are kept by the parser so they can end the line before them
    const next = source.slice(i + 1).find((n) => n.time > line.time);
    const nextStart = next ? next.time : line.time + LINE_TAIL_MS;

    let words;
    let estimated = false;
    if (Array.isArray(line.words) && line.words.length > 0) {
      words = line.words.map((w, wi) => ({
        text: w.text,
        start: w.startTime ?? w.start,
        end: w.endTime ?? w.end,
        spaceAfter: w.spaceAfter ?? wi < line.words.length - 1,
      }));
    } else {
      const end = line.endTime && line.endTime > line.time ? line.endTime : nextStart;
      words = estimateWords(text, line.time, end);
      estimated = true;
    }

    const lastWordEnd = words[words.length - 1].end;
    lines.push({
      key: `l${i}`,
      time: line.time,
      endTime: Math.max(line.endTime || 0, lastWordEnd),
      text,
      words,
      estimated,
    });
  });

  return { lines, synced };
}
