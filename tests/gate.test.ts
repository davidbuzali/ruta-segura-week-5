import assert from "node:assert/strict";
import test from "node:test";
import { createCompleteSyntheticCase } from "../src/fixtures.ts";
import { evaluateGate } from "../src/gate.ts";
import { REQUIRED_EPISODE_COMPONENTS } from "../src/types.ts";

const NOW = new Date("2026-09-10T18:00:00.000Z");

function issueFields(result: ReturnType<typeof evaluateGate>) {
  return result.issues.map((issue) => issue.field);
}

test("a complete, confirmed synthetic case is ready only for simulation", () => {
  const result = evaluateGate(createCompleteSyntheticCase(NOW), NOW);
  assert.equal(result.decision, "ready_for_simulation");
  assert.equal(result.issues.length, 0);
  assert.match(result.warning, /datos sintéticos/i);
  assert.match(result.warning, /No autoriza/i);
});

test("human confirmation is required even when the structure is complete", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.humanConfirmed = false;
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(issueFields(result).includes("humanConfirmed"));
});

test("a missing payer fails closed and identifies the exact field", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.funding.payer = "";
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(issueFields(result).includes("funding.payer"));
});

test("evidence exactly 72 hours old is valid and older evidence is stale", () => {
  const atBoundary = createCompleteSyntheticCase(NOW);
  atBoundary.route.evidence.verifiedAt = new Date(NOW.getTime() - 72 * 60 * 60 * 1000).toISOString();
  assert.equal(evaluateGate(atBoundary, NOW).decision, "ready_for_simulation");

  const beyondBoundary = createCompleteSyntheticCase(NOW);
  beyondBoundary.route.evidence.verifiedAt = new Date(NOW.getTime() - 72 * 60 * 60 * 1000 - 1).toISOString();
  const result = evaluateGate(beyondBoundary, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "verification_stale"));
});

test("future evidence timestamps are invalid", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.funding.evidence.verifiedAt = new Date(NOW.getTime() + 1).toISOString();
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "verification_time_future"));
});

test("non-positive operational values stop the pilot", async (t) => {
  const mutations: Array<[string, (pilot: ReturnType<typeof createCompleteSyntheticCase>) => void]> = [
    ["funded cohort", (pilot) => { pilot.funding.fundedCohortSize = 0; }],
    ["navigator limit", (pilot) => { pilot.capacity.navigatorCaseloadLimit = -1; }],
    ["reserved capacity", (pilot) => { pilot.capacity.reservedSlots = 0; }],
    ["episode price", (pilot) => { pilot.pricing.completeEpisodePrice = -100; }],
  ];

  for (const [name, mutate] of mutations) {
    await t.test(name, () => {
      const pilot = createCompleteSyntheticCase(NOW);
      mutate(pilot);
      assert.equal(evaluateGate(pilot, NOW).decision, "stop");
    });
  }
});

test("capacity must cover expected referrals and navigator load", () => {
  const slots = createCompleteSyntheticCase(NOW);
  slots.capacity.reservedSlots = slots.capacity.expectedReferrals - 1;
  assert.ok(evaluateGate(slots, NOW).issues.some((issue) => issue.code === "reserved_capacity_insufficient"));

  const navigator = createCompleteSyntheticCase(NOW);
  navigator.capacity.currentNavigatorLoad = 15;
  navigator.capacity.expectedReferrals = 6;
  assert.ok(evaluateGate(navigator, NOW).issues.some((issue) => issue.code === "navigator_capacity_exceeded"));
});

test("the patient contribution must remain zero", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.pricing.patientContribution = 1;
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "patient_cost_not_zero"));
});

test("all complete-episode components are required", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.pricing.includedComponents = REQUIRED_EPISODE_COMPONENTS.slice(0, -1);
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "episode_components_missing"));
});

test("attendance alone never counts as treatment closure", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.endpoint.attendanceOnly = true;
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "attendance_not_closure"));
});

test("downstream care and tail-risk commitments are required", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.continuity.tailRiskGuarantor = "";
  pilot.continuity.escalationAction = "";
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(issueFields(result).includes("continuity.tailRiskGuarantor"));
  assert.ok(issueFields(result).includes("continuity.escalationAction"));
});

test("structured contradictions block readiness", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.contradictions = ["La capacidad cotizada no coincide con la capacidad registrada."];
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.equal(result.sectionStatuses.case, "contradictory");
});

test("malformed or unknown data fails closed", () => {
  assert.equal(evaluateGate(null, NOW).decision, "stop");
  assert.equal(evaluateGate({}, NOW).decision, "stop");
  assert.equal(evaluateGate({ dataClassification: "real" }, NOW).decision, "stop");
});

test("bounded fields reject overlong values", () => {
  const pilot = createCompleteSyntheticCase(NOW);
  pilot.funding.payer = "x".repeat(121);
  const result = evaluateGate(pilot, NOW);
  assert.equal(result.decision, "stop");
  assert.ok(result.issues.some((issue) => issue.code === "text_too_long"));
});
