export type PresentationMode = "PER_MATCH" | "OVERALL_ONLY" | "CUSTOM";

export interface PlayerDraft {
  slotNumber: number;
  displayName: string;
  inGameName: string;
  isSubstitute: boolean;
}

export interface TeamDraft {
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  logoUrl: string;
  players: PlayerDraft[];
}

export interface TournamentDraft {
  name: string;
  totalMatches: number;
  presentationMode: PresentationMode;
  customMatches: number[];
  teams: TeamDraft[];
}

export type MatchStatus = "PENDING" | "LIVE" | "REVIEW" | "VERIFIED";

export type InputMode = "MANUAL" | "OCR";
