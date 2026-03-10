const DATE_PATTERN = /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/;
const TIME_PATTERN = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;
const KEYWORD_PATTERN = /\b(ora|time|orario|emesso|data\s*ora)\b/i;
const NOISY_CONTEXT_PATTERN =
  /\b(auth|cod(?:ice)?|rif(?:erimento)?|trans(?:azione)?|ticket|lotto|id|num(?:ero)?|operazione)\b/i;

function normalizeTime(hoursRaw, minutesRaw) {
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23) return null;
  if (minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function extractReceiptTime(rawText) {
  if (!rawText || typeof rawText !== "string") {
    console.log("[receipt-time] OCR text: <empty>");
    console.log("[receipt-time] candidates: []");
    console.log("[receipt-time] selected: null");
    return null;
  }

  const normalizedText = rawText.replace(/\r/g, "");
  const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);
  const dateLineIndex = lines.findIndex((line) => DATE_PATTERN.test(line));
  const candidates = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    TIME_PATTERN.lastIndex = 0;
    let match = TIME_PATTERN.exec(line);
    while (match) {
      const before = line.slice(0, match.index);
      const after = line.slice(match.index + match[0].length);
      const looksLikeDateFragment =
        /\b\d{1,2}[/.-]$/.test(before) ||
        /^[/.-]\d{2,4}\b/.test(after);
      if (looksLikeDateFragment) {
        match = TIME_PATTERN.exec(line);
        continue;
      }

      const normalized = normalizeTime(match[1], match[2]);
      if (normalized) {
        let score = 0;
        if (KEYWORD_PATTERN.test(line)) score += 5;
        if (DATE_PATTERN.test(line)) score += 4;
        if (i <= 5) score += 2;
        if (dateLineIndex >= 0) {
          const dist = Math.abs(i - dateLineIndex);
          if (dist === 0) score += 4;
          else if (dist === 1) score += 2;
          else if (dist >= 4) score -= 1;
        }
        if (NOISY_CONTEXT_PATTERN.test(line)) score -= 3;

        candidates.push({
          value: normalized,
          score,
          lineIndex: i,
          line,
          indexInLine: match.index
        });
      }
      match = TIME_PATTERN.exec(line);
    }
  }

  const compactLogText = normalizedText.slice(0, 1000);
  console.log("[receipt-time] OCR text:", compactLogText);
  console.log("[receipt-time] candidates:", candidates.map((c) => ({
    value: c.value,
    score: c.score,
    lineIndex: c.lineIndex,
    line: c.line
  })));

  if (candidates.length === 0) {
    console.log("[receipt-time] selected: null");
    return null;
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (dateLineIndex >= 0) {
      const aDist = Math.abs(a.lineIndex - dateLineIndex);
      const bDist = Math.abs(b.lineIndex - dateLineIndex);
      if (aDist !== bDist) return aDist - bDist;
    }
    if (a.lineIndex !== b.lineIndex) return a.lineIndex - b.lineIndex;
    return a.indexInLine - b.indexInLine;
  });

  const selected = candidates[0].value || null;
  console.log("[receipt-time] selected:", selected);
  return selected;
}

module.exports = {
  extractReceiptTime,
  normalizeTime
};
