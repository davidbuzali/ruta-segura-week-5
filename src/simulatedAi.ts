import type { GateIssue, GateResult, SectionId } from "./types.ts";

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

const SECTION_OWNERS: Record<SectionId, string> = {
  funding: "Finanzas",
  route: "Operaciones clínicas",
  capacity: "Coordinación del piloto",
  pricing: "Compras",
  endpoint: "Dirección clínica",
  continuity: "Comité financiador",
  confirmation: "Responsable del piloto",
  case: "Responsable del piloto",
};

export interface SimulatedAiSummary {
  title: string;
  verifiedSections: string[];
  blockers: Array<Pick<GateIssue, "field" | "message" | "status">>;
  conflictNotice: string | null;
  nextAction: string;
  owner: string;
  disclaimer: string;
}

export function generateSimulatedAiSummary(result: GateResult): SimulatedAiSummary {
  const verifiedSections = Object.entries(result.sectionStatuses)
    .filter(([, status]) => status === "verified")
    .map(([section]) => SECTION_LABELS[section as SectionId]);
  const blockers = result.issues.map(({ field, message, status }) => ({ field, message, status }));
  const conflict = result.issues.find((issue) => issue.status === "contradictory");
  const firstIssue = result.issues[0];

  return {
    title:
      result.decision === "stop"
        ? `Se identificaron ${result.issues.length} condiciones que impiden iniciar.`
        : "Las condiciones estructuradas están completas para una simulación.",
    verifiedSections,
    blockers,
    conflictNotice: conflict
      ? `Posible contradicción para revisión humana: ${conflict.message}`
      : null,
    nextAction: firstIssue
      ? `Verificar y corregir ${firstIssue.field}; conservar evidencia antes de reevaluar.`
      : "Conservar el expediente sintético y documentar la confirmación humana.",
    owner: firstIssue ? SECTION_OWNERS[firstIssue.section] : "Responsable del piloto",
    disclaimer:
      "Salida simulada por IA. Resume datos estructurados; no verifica contratos, no diagnostica y no cambia la decisión de la compuerta.",
  };
}
