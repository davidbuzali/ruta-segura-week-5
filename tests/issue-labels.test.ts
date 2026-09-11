import assert from "node:assert/strict";
import test from "node:test";
import { getIssueLabel } from "../src/issueLabels.ts";

test("operator-facing issue labels replace field paths", () => {
  assert.equal(getIssueLabel({ section: "funding", field: "funding.fundingStatus" }), "Compromiso de financiamiento");
  assert.equal(getIssueLabel({ section: "capacity", field: "capacity.reservedSlots" }), "Capacidad reservada");
  assert.equal(getIssueLabel({ section: "continuity", field: "continuity.tailRiskGuarantor" }), "Garante de riesgo residual");
});

test("evidence paths receive contextual labels", () => {
  assert.equal(getIssueLabel({ section: "route", field: "route.evidence.verifiedAt" }), "Vigencia de la evidencia - Proveedor y ruta");
});
