import assert from "node:assert/strict";
import test from "node:test";
import { createBlockedSyntheticCase, createCompleteSyntheticCase } from "../src/fixtures.ts";
import { evaluateGate } from "../src/gate.ts";
import { generateSimulatedAiSummary } from "../src/simulatedAi.ts";

const NOW = new Date("2026-09-10T18:00:00.000Z");

test("the simulated AI preserves exact blocker field identifiers", () => {
  const result = evaluateGate(createBlockedSyntheticCase(NOW), NOW);
  const summary = generateSimulatedAiSummary(result);
  assert.deepEqual(
    summary.blockers.map((blocker) => blocker.field),
    result.issues.map((issue) => issue.field),
  );
});

test("the simulated AI surfaces contradictions for human review", () => {
  const result = evaluateGate(createBlockedSyntheticCase(NOW), NOW);
  const summary = generateSimulatedAiSummary(result);
  assert.match(summary.conflictNotice ?? "", /revisión humana/i);
  assert.match(summary.disclaimer, /no cambia la decisión/i);
});

test("the simulated AI cannot convert a STOP result into readiness", () => {
  const result = evaluateGate(createBlockedSyntheticCase(NOW), NOW);
  const originalDecision = result.decision;
  generateSimulatedAiSummary(result);
  assert.equal(result.decision, originalDecision);
  assert.equal(result.decision, "stop");
});

test("a ready summary remains limited to synthetic simulation", () => {
  const result = evaluateGate(createCompleteSyntheticCase(NOW), NOW);
  const summary = generateSimulatedAiSummary(result);
  assert.equal(result.decision, "ready_for_simulation");
  assert.match(summary.title, /simulación/i);
  assert.match(summary.disclaimer, /no diagnostica/i);
});
