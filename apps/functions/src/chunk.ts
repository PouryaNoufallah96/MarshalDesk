const CHARS_PER_TOKEN = 3.5;
const TARGET_TOKENS = 800;
const OVERLAP_TOKENS = 100;
const TARGET_CHARS = Math.round(TARGET_TOKENS * CHARS_PER_TOKEN);
const OVERLAP_CHARS = Math.round(OVERLAP_TOKENS * CHARS_PER_TOKEN);
/** The heading prefix never eats more than this share of a chunk. */
const MAX_PREFIX_CHARS = 300;

export type TextChunk = { content: string; tokenCount: number };

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

type Section = { path: string[]; body: string };

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/** Splits Markdown-style text at headings, tracking each section's heading path. */
function splitSections(text: string): Section[] {
  const sections: Section[] = [];
  const stack: { level: number; title: string }[] = [];
  let lines: string[] = [];

  const flush = () => {
    const body = lines.join("\n").trim();
    if (body) sections.push({ path: stack.map((h) => h.title), body });
    lines = [];
  };

  for (const line of text.split("\n")) {
    const match = HEADING.exec(line);
    const level = match?.[1]?.length;
    const title = match?.[2]?.trim();
    if (level === undefined || !title) {
      lines.push(line);
      continue;
    }
    flush();
    while (stack.length > 0 && (stack.at(-1)?.level ?? 0) >= level) stack.pop();
    stack.push({ level, title });
  }
  flush();
  return sections;
}

function hardSplit(text: string, max: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const space = rest.lastIndexOf(" ", max);
    const cut = space > max / 2 ? space : max;
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

const SENTENCE_END = /(?<=[.!?。！？])\s+/;

type Unit = { text: string; paragraph: number };

/** Paragraphs, then sentences, then hard splits, each unit at most `max` chars. */
function splitUnits(body: string, max: number): Unit[] {
  const units: Unit[] = [];
  body.split(/\n{2,}/).forEach((block, paragraph) => {
    const trimmed = block.trim();
    if (!trimmed) return;
    if (trimmed.length <= max) {
      units.push({ text: trimmed, paragraph });
      return;
    }
    for (const sentence of trimmed.split(SENTENCE_END)) {
      const s = sentence.trim();
      if (!s) continue;
      for (const text of s.length <= max ? [s] : hardSplit(s, max)) {
        units.push({ text, paragraph });
      }
    }
  });
  return units;
}

function joinUnits(units: readonly Unit[]): string {
  return units
    .map((unit, i) =>
      i === 0
        ? unit.text
        : `${units[i - 1]?.paragraph === unit.paragraph ? " " : "\n\n"}${unit.text}`,
    )
    .join("");
}

/** Trailing units of a chunk that fit in the overlap budget, never the whole chunk. */
function overlapTail(units: readonly Unit[]): Unit[] {
  const tail: Unit[] = [];
  let size = 0;
  for (let i = units.length - 1; i > 0; i--) {
    const unit = units[i];
    if (!unit || size + unit.text.length > OVERLAP_CHARS) break;
    tail.unshift(unit);
    size += unit.text.length + 2;
  }
  return tail;
}

function packSection(section: Section): string[] {
  const prefix =
    section.path.length > 0
      ? `${section.path.join(" > ").slice(0, MAX_PREFIX_CHARS)}\n\n`
      : "";
  const budget = TARGET_CHARS - prefix.length;
  const units = splitUnits(section.body, budget);
  const chunks: string[] = [];
  let current: Unit[] = [];
  let size = 0;
  let fresh = 0;

  const emit = () => {
    if (fresh > 0) chunks.push(prefix + joinUnits(current));
  };

  for (const unit of units) {
    if (current.length > 0 && size + unit.text.length + 2 > budget) {
      emit();
      current = overlapTail(current);
      size = current.reduce((sum, u) => sum + u.text.length + 2, 0);
      fresh = 0;
      if (size + unit.text.length + 2 > budget) {
        current = [];
        size = 0;
      }
    }
    current.push(unit);
    size += unit.text.length + 2;
    fresh++;
  }
  emit();
  return chunks;
}

/**
 * Splits text into ~800-token chunks with ~100 tokens of overlap, by headings,
 * then paragraphs, then sentences. Each chunk starts with its heading path.
 */
export function chunkText(text: string): TextChunk[] {
  return splitSections(text)
    .flatMap(packSection)
    .map((content) => content.trim())
    .filter((content) => content.length > 0)
    .map((content) => ({ content, tokenCount: estimateTokens(content) }));
}
