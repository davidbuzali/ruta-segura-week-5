import { QUESTIONNAIRE_VERSION, REQUIRED_EPISODE_COMPONENTS, type PilotCase } from "./types.ts";

function timestampHoursAgo(now: Date, hours: number) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export function createCompleteSyntheticCase(now = new Date()): PilotCase {
  const verifiedAt = timestampHoursAgo(now, 2);

  return {
    id: "SYN-CDMX-001",
    name: "Piloto retina - Red Centro",
    dataClassification: "synthetic",
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    funding: {
      payer: "Fondo Público Demostración",
      fundingStatus: "committed",
      fundedCohortSize: 12,
      evidence: { source: "Convenio sintético FP-01", verifier: "Mariana Torres (inventada)", verifiedAt },
    },
    route: {
      provider: "Clínica Receptora Centro (inventada)",
      authorizedReceiver: true,
      eligibilityConfirmed: true,
      documentsConfirmed: true,
      evidence: { source: "Carta sintética CR-04", verifier: "Elena Ruiz (inventada)", verifiedAt },
    },
    capacity: {
      navigator: "Luis Hernández (inventado)",
      navigatorCaseloadLimit: 20,
      currentNavigatorLoad: 4,
      reservedSlots: 12,
      expectedReferrals: 12,
      escalationOwner: "Coordinación Clínica (inventada)",
      evidence: { source: "Reserva sintética RC-12", verifier: "Ana López (inventada)", verifiedAt },
    },
    pricing: {
      currency: "MXN",
      completeEpisodePrice: 18500,
      includedComponents: [...REQUIRED_EPISODE_COMPONENTS],
      patientContribution: 0,
      evidence: { source: "Cotización sintética CE-18", verifier: "Carlos Mora (inventado)", verifiedAt },
    },
    endpoint: {
      diagnosticEndpoint: "Diagnóstico confirmado por especialista",
      treatmentEndpoint: "Tratamiento indicado completado y plan de monitoreo documentado",
      closureEvidence: "Constancia clínica sintética firmada",
      attendanceOnly: false,
      evidence: { source: "Protocolo sintético PC-07", verifier: "Dra. Sofía Cruz (inventada)", verifiedAt },
    },
    continuity: {
      downstreamPlan: "Monitoreo y tratamiento adicional según protocolo sintético",
      tailRiskGuarantor: "Fondo de contingencia demostración",
      coverageRule: "Cubre el episodio y eventos previstos por el protocolo sintético",
      escalationAction: "Pausar nuevas altas y convocar al comité financiador",
      evidence: { source: "Anexo sintético AR-03", verifier: "Mariana Torres (inventada)", verifiedAt },
    },
    contradictions: [],
    humanConfirmed: true,
  };
}

export function createBlockedSyntheticCase(now = new Date()): PilotCase {
  const pilot = createCompleteSyntheticCase(now);
  pilot.id = "SYN-CDMX-STOP-001";
  pilot.name = "Piloto retina - Configuración incompleta";
  pilot.funding.fundingStatus = "pending";
  pilot.capacity.reservedSlots = 6;
  pilot.endpoint.attendanceOnly = true;
  pilot.continuity.tailRiskGuarantor = "";
  pilot.route.evidence.verifiedAt = timestampHoursAgo(now, 80);
  pilot.contradictions = [
    "La cotización del proveedor indica 8 espacios, pero el formulario registra 6.",
  ];
  pilot.humanConfirmed = false;
  return pilot;
}
