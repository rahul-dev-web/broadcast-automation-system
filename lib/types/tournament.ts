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

export type BroadcastStage =
  | "SETUP"
  | "AUTOMATION_STARTED"
  | "ROSTER_1"
  | "ROSTER_2"
  | "ROOM"
  | "MATCH_LIVE"
  | "MATCH_REVIEW"
  | "MATCH_VERIFIED"
  | "MATCH_PT"
  | "OVERALL"
  | "THANK_YOU"
  | "CLOSED";

export interface MatchTeamResult {
  teamId: string;
  teamNumber: number;
  teamName: string;
  teamPrefix: string;
  kills: number;
  placement: number | null;
  killPoints: number;
  positionPoints: number;
  totalPoints: number;
  eliminationStatus: "ALIVE" | "ELIMINATED";
}

export interface OcrProposedResult {
  teamNumber: number;
  teamName: string;
  kills: number | null;
  placement: number | null;
  confidence?: number | null;
  rawText?: string;
}
