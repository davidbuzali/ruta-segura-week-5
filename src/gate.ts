import {
  MAX_SHORT_TEXT_LENGTH,
  QUESTIONNAIRE_VERSION,
  REQUIRED_EPISODE_COMPONENTS,
  type EvidenceRecord,
  type GateIssue,
  type GateResult,
  type PilotCase,
  type SectionId,
  type SectionStatus,
} from "./types.ts";

const MAX_EVIDENCE_AGE_HOURS = 72;
const HOUR_IN_MS = 60 * 60 * 1000;

const STATUS_PRIORITY: Record<SectionStatus, number> = {
  verified: 0,
  missing: 1,
  stale: 2,
  invalid: 3,
  contradictory: 4,
};

const ALL_SECTIONS: SectionId[] = [
  "funding",
  "route",
  "capacity",
  "pricing",
  "endpoint",
  "continuity",
  "confirmation",
  "case",
];

const STOP_WARNING =
  "No inicie el piloto. Corrija y verifique todas las condiciones antes de continuar.";
const READY_WARNING =
  "Esta validación permite probar el flujo con datos sintéticos. No autoriza tamizaje ni atención de pacientes reales.";

function addIssue(
  issues: GateIssue[],
  section: SectionId,
  field: string,
  status: GateIssue["status"],
  code: string,
  message: string,
) {
  issues.push({ code, section, field, status, message });
}

function validateText(
  issues: GateIssue[],
  section: SectionId,
  field: string,
  value: unknown,
  label: string,
) {
  if (typeof value !== "string" || value.trim().length === 0) {
    addIssue(issues, section, field, "missing", "required", `Falta ${label}.`);
    return;
  }

  if (value.trim().length > MAX_SHORT_TEXT_LENGTH) {
    addIssue(
      issues,
      section,
      field,
      "invalid",
      "text_too_long",
      `${label} excede ${MAX_SHORT_TEXT_LENGTH} caracteres.`,
    );
  }
}

function validatePositiveNumber(
  issues: GateIssue[],
  section: SectionId,
  field: string,
  value: unknown,
  label: string,
  integer = false,
) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    addIssue(issues, section, field, "invalid", "positive_number", `${label} debe ser mayor que cero.`);
    return;
  }

  if (integer && !Number.isInteger(value)) {
    addIssue(issues, section, field, "invalid", "whole_number", `${label} debe ser un número entero.`);
  }
}

function validateEvidence(
  issues: GateIssue[],
  section: SectionId,
  evidence: unknown,
  nowMs: number,
) {
  if (!evidence || typeof evidence !== "object") {
    addIssue(issues, section, `${section}.evidence`, "missing", "evidence_required", "Falta evidencia verificable.");
    return;
  }

  const record = evidence as Partial<EvidenceRecord>;
  validateText(issues, section, `${section}.evidence.source`, record.source, "la fuente de evidencia");
  validateText(issues, section, `${section}.evidence.verifier`, record.verifier, "la persona verificadora");

  if (typeof record.verifiedAt !== "string" || record.verifiedAt.trim().length === 0) {
    addIssue(
      issues,
      section,
      `${section}.evidence.verifiedAt`,
      "missing",
      "verification_time_required",
      "Falta la fecha de verificación.",
    );
    return;
  }

  const verifiedMs = Date.parse(record.verifiedAt);
  if (!Number.isFinite(verifiedMs)) {
    addIssue(
      issues,
      section,
      `${section}.evidence.verifiedAt`,
      "invalid",
      "verification_time_invalid",
      "La fecha de verificación no es válida.",
    );
    return;
  }

  if (verifiedMs > nowMs) {
    addIssue(
      issues,
      section,
      `${section}.evidence.verifiedAt`,
      "invalid",
      "verification_time_future",
      "La fecha de verificación no puede estar en el futuro.",
    );
    return;
  }

  if ((nowMs - verifiedMs) / HOUR_IN_MS > MAX_EVIDENCE_AGE_HOURS) {
    addIssue(
      issues,
      section,
      `${section}.evidence.verifiedAt`,
      "stale",
      "verification_stale",
      "La verificación tiene más de 72 horas.",
    );
  }
}

function getSectionStatuses(issues: GateIssue[]): Record<SectionId, SectionStatus> {
  const statuses = Object.fromEntries(ALL_SECTIONS.map((section) => [section, "verified"])) as Record<
    SectionId,
    SectionStatus
  >;

  for (const issue of issues) {
    if (STATUS_PRIORITY[issue.status] > STATUS_PRIORITY[statuses[issue.section]]) {
      statuses[issue.section] = issue.status;
    }
  }

  return statuses;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function evaluateGate(input: unknown, now = new Date()): GateResult {
  const issues: GateIssue[] = [];
  const evaluatedAt = now.toISOString();

  if (!isRecord(input)) {
    addIssue(issues, "case", "case", "invalid", "case_invalid", "El caso no tiene una estructura válida.");
    return {
      decision: "stop",
      issues,
      sectionStatuses: getSectionStatuses(issues),
      evaluatedAt,
      warning: STOP_WARNING,
    };
  }

  const pilot = input as unknown as PilotCase;
  const nowMs = now.getTime();

  if (pilot.questionnaireVersion !== QUESTIONNAIRE_VERSION) {
    addIssue(issues, "case", "questionnaireVersion", "invalid", "version_unknown", "La versión del cuestionario no es válida.");
  }
  if (pilot.dataClassification !== "synthetic") {
    addIssue(issues, "case", "dataClassification", "invalid", "non_synthetic_data", "Este build acepta únicamente datos sintéticos.");
  }

  const funding = isRecord(pilot.funding) ? pilot.funding : ({} as PilotCase["funding"]);
  validateText(issues, "funding", "funding.payer", funding.payer, "el comprador o financiador");
  if (funding.fundingStatus !== "committed") {
    addIssue(issues, "funding", "funding.fundingStatus", "missing", "funding_not_committed", "El financiamiento no está comprometido.");
  }
  validatePositiveNumber(issues, "funding", "funding.fundedCohortSize", funding.fundedCohortSize, "La cohorte financiada", true);
  validateEvidence(issues, "funding", funding.evidence, nowMs);

  const route = isRecord(pilot.route) ? pilot.route : ({} as PilotCase["route"]);
  validateText(issues, "route", "route.provider", route.provider, "el proveedor autorizado");
  if (route.authorizedReceiver !== true) {
    addIssue(issues, "route", "route.authorizedReceiver", "missing", "receiver_not_authorized", "El receptor no está autorizado.");
  }
  if (route.eligibilityConfirmed !== true) {
    addIssue(issues, "route", "route.eligibilityConfirmed", "missing", "eligibility_unconfirmed", "Falta confirmar elegibilidad.");
  }
  if (route.documentsConfirmed !== true) {
    addIssue(issues, "route", "route.documentsConfirmed", "missing", "documents_unconfirmed", "Falta confirmar los documentos requeridos.");
  }
  validateEvidence(issues, "route", route.evidence, nowMs);

  const capacity = isRecord(pilot.capacity) ? pilot.capacity : ({} as PilotCase["capacity"]);
  validateText(issues, "capacity", "capacity.navigator", capacity.navigator, "la persona navegadora financiada");
  validateText(issues, "capacity", "capacity.escalationOwner", capacity.escalationOwner, "la persona responsable de escalamiento");
  validatePositiveNumber(issues, "capacity", "capacity.navigatorCaseloadLimit", capacity.navigatorCaseloadLimit, "El límite de casos", true);
  validatePositiveNumber(issues, "capacity", "capacity.reservedSlots", capacity.reservedSlots, "Los espacios reservados", true);
  validatePositiveNumber(issues, "capacity", "capacity.expectedReferrals", capacity.expectedReferrals, "Las referencias esperadas", true);
  if (typeof capacity.currentNavigatorLoad !== "number" || !Number.isInteger(capacity.currentNavigatorLoad) || capacity.currentNavigatorLoad < 0) {
    addIssue(issues, "capacity", "capacity.currentNavigatorLoad", "invalid", "current_load_invalid", "La carga actual debe ser un entero igual o mayor que cero.");
  }
  if (
    Number.isFinite(capacity.reservedSlots) &&
    Number.isFinite(capacity.expectedReferrals) &&
    capacity.reservedSlots < capacity.expectedReferrals
  ) {
    addIssue(issues, "capacity", "capacity.reservedSlots", "invalid", "reserved_capacity_insufficient", "La capacidad reservada es menor que las referencias esperadas.");
  }
  if (
    Number.isFinite(capacity.navigatorCaseloadLimit) &&
    Number.isFinite(capacity.currentNavigatorLoad) &&
    Number.isFinite(capacity.expectedReferrals) &&
    capacity.currentNavigatorLoad + capacity.expectedReferrals > capacity.navigatorCaseloadLimit
  ) {
    addIssue(issues, "capacity", "capacity.navigatorCaseloadLimit", "invalid", "navigator_capacity_exceeded", "La cohorte excedería el límite de la persona navegadora.");
  }
  validateEvidence(issues, "capacity", capacity.evidence, nowMs);

  const pricing = isRecord(pilot.pricing) ? pilot.pricing : ({} as PilotCase["pricing"]);
  if (pricing.currency !== "MXN") {
    addIssue(issues, "pricing", "pricing.currency", "invalid", "currency_invalid", "La moneda debe ser MXN.");
  }
  validatePositiveNumber(issues, "pricing", "pricing.completeEpisodePrice", pricing.completeEpisodePrice, "El precio completo del episodio");
  if (pricing.patientContribution !== 0) {
    addIssue(issues, "pricing", "pricing.patientContribution", "invalid", "patient_cost_not_zero", "La aportación del paciente debe ser MXN 0.");
  }
  const included = Array.isArray(pricing.includedComponents) ? pricing.includedComponents : [];
  const missingComponents = REQUIRED_EPISODE_COMPONENTS.filter((component) => !included.includes(component));
  if (missingComponents.length > 0) {
    addIssue(issues, "pricing", "pricing.includedComponents", "missing", "episode_components_missing", `Faltan componentes del episodio: ${missingComponents.join(", ")}.`);
  }
  validateEvidence(issues, "pricing", pricing.evidence, nowMs);

  const endpoint = isRecord(pilot.endpoint) ? pilot.endpoint : ({} as PilotCase["endpoint"]);
  validateText(issues, "endpoint", "endpoint.diagnosticEndpoint", endpoint.diagnosticEndpoint, "el punto de cierre diagnóstico");
  validateText(issues, "endpoint", "endpoint.treatmentEndpoint", endpoint.treatmentEndpoint, "el punto de cierre de tratamiento");
  validateText(issues, "endpoint", "endpoint.closureEvidence", endpoint.closureEvidence, "la evidencia de cierre");
  if (endpoint.attendanceOnly !== false) {
    addIssue(issues, "endpoint", "endpoint.attendanceOnly", "invalid", "attendance_not_closure", "Asistir a una cita no demuestra tratamiento completado.");
  }
  validateEvidence(issues, "endpoint", endpoint.evidence, nowMs);

  const continuity = isRecord(pilot.continuity) ? pilot.continuity : ({} as PilotCase["continuity"]);
  validateText(issues, "continuity", "continuity.downstreamPlan", continuity.downstreamPlan, "el plan de atención posterior");
  validateText(issues, "continuity", "continuity.tailRiskGuarantor", continuity.tailRiskGuarantor, "el garante de riesgo residual");
  validateText(issues, "continuity", "continuity.coverageRule", continuity.coverageRule, "la regla de cobertura");
  validateText(issues, "continuity", "continuity.escalationAction", continuity.escalationAction, "la acción de escalamiento");
  validateEvidence(issues, "continuity", continuity.evidence, nowMs);

  if (!Array.isArray(pilot.contradictions)) {
    addIssue(issues, "case", "contradictions", "invalid", "contradictions_invalid", "La lista de contradicciones no es válida.");
  } else {
    for (const contradiction of pilot.contradictions) {
      if (typeof contradiction === "string" && contradiction.trim()) {
        addIssue(issues, "case", "contradictions", "contradictory", "structured_contradiction", contradiction.trim());
      }
    }
  }

  if (pilot.humanConfirmed !== true) {
    addIssue(issues, "confirmation", "humanConfirmed", "missing", "human_confirmation_required", "Falta la confirmación humana final.");
  }

  const decision = issues.length === 0 ? "ready_for_simulation" : "stop";
  return {
    decision,
    issues,
    sectionStatuses: getSectionStatuses(issues),
    evaluatedAt,
    warning: decision === "ready_for_simulation" ? READY_WARNING : STOP_WARNING,
  };
}
