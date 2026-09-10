export const QUESTIONNAIRE_VERSION = "1.0" as const;
export const MAX_SHORT_TEXT_LENGTH = 120;
export const MAX_NOTE_LENGTH = 240;

export const REQUIRED_EPISODE_COMPONENTS = [
  "diagnostic_confirmation",
  "specialist_review",
  "indicated_treatment",
  "clinical_monitoring",
] as const;

export type EpisodeComponent = (typeof REQUIRED_EPISODE_COMPONENTS)[number];
export type SectionId =
  | "funding"
  | "route"
  | "capacity"
  | "pricing"
  | "endpoint"
  | "continuity"
  | "confirmation"
  | "case";

export type SectionStatus =
  | "verified"
  | "missing"
  | "invalid"
  | "stale"
  | "contradictory";

export interface EvidenceRecord {
  source: string;
  verifier: string;
  verifiedAt: string;
}

export interface FundingSection {
  payer: string;
  fundingStatus: "committed" | "pending" | "absent";
  fundedCohortSize: number;
  evidence: EvidenceRecord;
}

export interface RouteSection {
  provider: string;
  authorizedReceiver: boolean;
  eligibilityConfirmed: boolean;
  documentsConfirmed: boolean;
  evidence: EvidenceRecord;
}

export interface CapacitySection {
  navigator: string;
  navigatorCaseloadLimit: number;
  currentNavigatorLoad: number;
  reservedSlots: number;
  expectedReferrals: number;
  escalationOwner: string;
  evidence: EvidenceRecord;
}

export interface PricingSection {
  currency: "MXN";
  completeEpisodePrice: number;
  includedComponents: EpisodeComponent[];
  patientContribution: number;
  evidence: EvidenceRecord;
}

export interface EndpointSection {
  diagnosticEndpoint: string;
  treatmentEndpoint: string;
  closureEvidence: string;
  attendanceOnly: boolean;
  evidence: EvidenceRecord;
}

export interface ContinuitySection {
  downstreamPlan: string;
  tailRiskGuarantor: string;
  coverageRule: string;
  escalationAction: string;
  evidence: EvidenceRecord;
}

export interface PilotCase {
  id: string;
  name: string;
  dataClassification: "synthetic";
  questionnaireVersion: typeof QUESTIONNAIRE_VERSION;
  funding: FundingSection;
  route: RouteSection;
  capacity: CapacitySection;
  pricing: PricingSection;
  endpoint: EndpointSection;
  continuity: ContinuitySection;
  contradictions: string[];
  humanConfirmed: boolean;
}

export interface GateIssue {
  code: string;
  section: SectionId;
  field: string;
  status: Exclude<SectionStatus, "verified">;
  message: string;
}

export interface GateResult {
  decision: "stop" | "ready_for_simulation";
  issues: GateIssue[];
  sectionStatuses: Record<SectionId, SectionStatus>;
  evaluatedAt: string;
  warning: string;
}
