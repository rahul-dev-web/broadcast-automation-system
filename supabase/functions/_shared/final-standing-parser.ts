export interface OcrTextBox {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number | null;
}

export interface ExpectedOcrTeam {
  teamNumber: number;
  teamName: string;
}

export interface ParsedStandingRow {
  teamNumber: number;
  teamName: string;
  placement: number | null;
  kills: number | null;
  confidence: number | null;
  rawText: string;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function similarity(a: string, b: string) {
  const left = normalize(a).toLowerCase().replace(/[^a-z0-9]/g, "");
  const right = normalize(b).toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function levenshtein(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length];
}

export function parseFinalStandingBoxes(
  boxes: OcrTextBox[],
  expectedTeams: ExpectedOcrTeam[],
): ParsedStandingRow[] {
  const sorted = [...boxes]
    .map((box) => ({ ...box, text: normalize(box.text) }))
    .filter((box) => box.text)
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const usedTeams = new Set<number>();
  const rows: ParsedStandingRow[] = [];

  for (const team of expectedTeams) {
    let bestIndex = -1;
    let bestScore = 0;

    sorted.forEach((box, index) => {
      if (usedTeams.has(index)) return;
      const score = similarity(box.text, team.teamName);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex < 0 || bestScore < 0.55) continue;

    const anchor = sorted[bestIndex];
    const rowBoxes = sorted.filter(
      (box, index) =>
        index === bestIndex ||
        Math.abs(box.y - anchor.y) <= Math.max(anchor.height * 1.6, 18),
    );

    const numbers = rowBoxes
      .flatMap((box) => (box.text.match(/\d+/g) ?? []).map(Number))
      .filter((value) => Number.isFinite(value));

    const placement =
      numbers.find((value) => value >= 1 && value <= 12) ?? null;
    const killsCandidates = numbers.filter((value) => value >= 0 && value <= 99);
    const kills =
      killsCandidates.length > 1
        ? killsCandidates[killsCandidates.length - 1]
        : null;

    rows.push({
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      placement,
      kills,
      confidence: Math.round(bestScore * 100) / 100,
      rawText: rowBoxes.map((box) => box.text).join(" | "),
    });

    usedTeams.add(bestIndex);
  }

  return rows.sort(
    (a, b) => (a.placement ?? 99) - (b.placement ?? 99),
  );
}
