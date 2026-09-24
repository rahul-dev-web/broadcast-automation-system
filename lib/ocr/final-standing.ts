import type { OcrProposedResult } from "@/lib/types/tournament";

export interface VisionTextAnnotation {
  description?: string;
  boundingPoly?: {
    vertices?: Array<{ x?: number; y?: number }>;
  };
}

export interface VisionResponse {
  textAnnotations?: VisionTextAnnotation[];
  fullTextAnnotation?: { text?: string };
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractNumbers(value: string) {
  return (value.match(/\d+/g) ?? []).map(Number);
}

export function parseFinalStandingText(
  rawText: string,
  expectedTeamNames: string[],
): OcrProposedResult[] {
  const lines = rawText.split(/\r?\n/).map(normalizeLine).filter(Boolean);
  const results: OcrProposedResult[] = [];

  for (const line of lines) {
    const numbers = extractNumbers(line);
    const teamName = expectedTeamNames.find((name) =>
      line.toLowerCase().includes(name.toLowerCase()),
    );

    if (!teamName) continue;

    const placement = numbers.find((value) => value >= 1 && value <= 12) ?? null;
    const kills = numbers.length > 1 ? numbers[numbers.length - 1] : null;

    results.push({
      teamNumber: expectedTeamNames.indexOf(teamName) + 1,
      teamName,
      kills,
      placement,
      rawText: line,
    });
  }

  return results;
}

export function getVisionRawText(response: VisionResponse) {
  return (
    response.fullTextAnnotation?.text ??
    response.textAnnotations?.[0]?.description ??
    ""
  );
}
