import { describe, expect, it } from "vitest";
import { matchesKeyword, normalizeCommentText } from "./keyword-matching";

describe("normalizeCommentText", () => {
  it("remove acentos", () => {
    expect(normalizeCommentText("Já Quero!")).toBe("ja quero!");
  });

  it("remove emojis mantendo o texto", () => {
    expect(normalizeCommentText("quero 😍🔥 isso")).toBe("quero isso");
  });

  it("normaliza espaços e caixa", () => {
    expect(normalizeCommentText("  QUERO   o   LINK  ")).toBe("quero o link");
  });
});

describe("matchesKeyword", () => {
  it("modo contém: bate quando o termo aparece em qualquer parte do comentário", () => {
    expect(matchesKeyword("gente eu QUERO muito isso", "quero", "contem")).toBe(true);
    expect(matchesKeyword("adorei o vídeo", "quero", "contem")).toBe(false);
  });

  it("modo exato: só bate quando o comentário inteiro é o termo", () => {
    expect(matchesKeyword("quero", "quero", "exato")).toBe(true);
    expect(matchesKeyword("eu quero", "quero", "exato")).toBe(false);
  });

  it("ignora acento e emoji dos dois lados na comparação", () => {
    expect(matchesKeyword("EU QUERO 😍", "Quero", "contem")).toBe(true);
    expect(matchesKeyword("já quero", "Já Quero", "exato")).toBe(true);
  });

  it("nunca bate com termo vazio", () => {
    expect(matchesKeyword("qualquer coisa", "   ", "contem")).toBe(false);
  });
});
