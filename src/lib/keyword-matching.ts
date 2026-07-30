import type { MatchMode } from "@prisma/client";

// Remove acentos e emojis, normaliza espaços e caixa — usado tanto no texto
// do comentário quanto no termo cadastrado, para os dois lados da comparação.
export function normalizeCommentText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesKeyword(commentText: string, termo: string, matchMode: MatchMode): boolean {
  const normalizedComment = normalizeCommentText(commentText);
  const normalizedTermo = normalizeCommentText(termo);
  if (!normalizedTermo) return false;

  if (matchMode === "exato") {
    return normalizedComment === normalizedTermo;
  }
  return normalizedComment.includes(normalizedTermo);
}
