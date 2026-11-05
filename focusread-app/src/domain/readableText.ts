// Limpieza de presentación del texto de una dosis. NO reescribe ni inventa contenido: quita marcas de la fuente
// (citas [1], [editar]), une líneas partidas a mano, ordena espacios y reconoce listas para poder mostrarlas como tales.
// El texto guardado no se toca; esto se aplica solo al mostrarlo o leerlo en voz alta. Es idempotente.

const SENTENCE_END = /[.!?…:;"”»)\]]$/;
// Elemento de lista: "1. ", "2) ", "- ", "• ", "– ", "* "...
const LIST_ITEM = /^(?:(\d{1,2})[.)]|[-*•–·▪●◦])\s+(\S.*)$/;
const CITATION = /\[\s*(?:\d{1,3}|[a-z]|nota\s*\d+|editar|cita requerida|aclaración requerida|¿cuál\?|fuente\?)\s*\]/gi;

export interface ListLine {
  marker: string; // "1." o "•"
  text: string;
}

// Interpreta una línea ya limpia como elemento de lista (para el lector).
export function parseListLine(line: string): ListLine | null {
  const m = /^(\d{1,2}\.|•)\s+(\S.*)$/.exec(line);
  return m ? { marker: m[1], text: m[2] } : null;
}

function tidyInline(s: string): string {
  return s
    .replace(CITATION, '')
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([,;:.!?])(?!\.)/g, '$1')
    .replace(/([,;])(?=\p{L})/gu, '$1 ')
    .trim();
}

export function cleanForReading(raw: string): string {
  const text = raw.replace(/\r\n?/g, '\n').replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2');
  const blocks: string[][] = []; // cada bloque: líneas (párrafo = 1 línea; lista = N líneas)
  let paragraph: string | null = null;
  let list: string[] = [];
  let lastWasItem = false;

  const flushParagraph = () => {
    if (paragraph) blocks.push([paragraph]);
    paragraph = null;
  };
  const flushList = () => {
    if (list.length) blocks.push(list);
    list = [];
  };

  for (const rawLine of text.split('\n')) {
    const line = tidyInline(rawLine);
    if (!line) {
      flushParagraph();
      flushList();
      lastWasItem = false;
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item) {
      flushParagraph();
      list.push(`${item[1] ? `${item[1]}.` : '•'} ${item[2]}`);
      lastWasItem = true;
      continue;
    }
    if (lastWasItem && /^\p{Ll}/u.test(line)) {
      list[list.length - 1] = `${list[list.length - 1]} ${line}`; // continuación del elemento anterior
      continue;
    }
    flushList();
    lastWasItem = false;
    if (paragraph && !SENTENCE_END.test(paragraph) && (/^\p{Ll}/u.test(line) || paragraph.length >= 50)) {
      paragraph = `${paragraph} ${line}`; // línea partida a mano
    } else {
      flushParagraph();
      paragraph = line;
    }
  }
  flushParagraph();
  flushList();
  return blocks.map((b) => b.join('\n')).join('\n\n');
}

// Texto para la voz: sin viñetas y con pausa al final de cada elemento de lista.
export function toSpeech(cleaned: string): string {
  return cleaned
    .split('\n')
    .map((line) => {
      const item = parseListLine(line);
      if (!item) return line;
      return SENTENCE_END.test(item.text) ? item.text : `${item.text}.`;
    })
    .join('\n');
}
