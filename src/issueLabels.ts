import type { GateIssue, SectionId } from "./types.ts";

const SECTION_LABELS: Record<SectionId, string> = {
  funding: "Financiamiento",
  route: "Proveedor y ruta",
  capacity: "Capacidad y navegación",
  pricing: "Precio del episodio",
  endpoint: "Punto de cierre",
  continuity: "Riesgo residual y continuidad",
  confirmation: "Confirmación humana",
  case: "Integridad del caso",
};

const FIELD_LABELS: Record<string, string> = {
  case: "Integridad del expediente",
  questionnaireVersion: "Versión del cuestionario",
  dataClassification: "Clasificación de los datos",
  "funding.payer": "Comprador o financiador",
  "funding.fundingStatus": "Compromiso de financiamiento",
  "funding.fundedCohortSize": "Cohorte financiada",
  "route.provider": "Proveedor autorizado",
  "route.authorizedReceiver": "Receptor autorizado",
  "route.eligibilityConfirmed": "Elegibilidad confirmada",
  "route.documentsConfirmed": "Documentos de la ruta",
  "capacity.navigator": "Persona navegadora",
  "capacity.escalationOwner": "Responsable de escalamiento",
  "capacity.navigatorCaseloadLimit": "Límite de casos de navegación",
  "capacity.reservedSlots": "Capacidad reservada",
  "capacity.expectedReferrals": "Referencias esperadas",
  "capacity.currentNavigatorLoad": "Carga actual de navegación",
  "pricing.currency": "Moneda del acuerdo",
  "pricing.completeEpisodePrice": "Precio completo del episodio",
  "pricing.patientContribution": "Aportación del paciente",
  "pricing.includedComponents": "Componentes incluidos",
  "endpoint.diagnosticEndpoint": "Cierre diagnóstico",
  "endpoint.treatmentEndpoint": "Cierre de tratamiento",
  "endpoint.closureEvidence": "Evidencia de cierre",
  "endpoint.attendanceOnly": "Cierre basado solo en asistencia",
  "continuity.downstreamPlan": "Plan de atención posterior",
  "continuity.tailRiskGuarantor": "Garante de riesgo residual",
  "continuity.coverageRule": "Regla de cobertura",
  "continuity.escalationAction": "Acción de escalamiento",
  contradictions: "Discrepancia por revisar",
  humanConfirmed: "Confirmación humana final",
};

function evidenceLabel(field: string, section: SectionId) {
  const sectionLabel = SECTION_LABELS[section];
  if (field.endsWith(".evidence.source")) return `Fuente de evidencia - ${sectionLabel}`;
  if (field.endsWith(".evidence.verifier")) return `Persona verificadora - ${sectionLabel}`;
  if (field.endsWith(".evidence.verifiedAt")) return `Vigencia de la evidencia - ${sectionLabel}`;
  if (field.endsWith(".evidence")) return `Evidencia requerida - ${sectionLabel}`;
  return null;
}

export function getIssueLabel(issue: Pick<GateIssue, "field" | "section">) {
  return FIELD_LABELS[issue.field] ?? evidenceLabel(issue.field, issue.section) ?? SECTION_LABELS[issue.section];
}
