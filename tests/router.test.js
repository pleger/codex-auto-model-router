import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recommend, validateConfig } from '../src/router.js';
import { main, parseArgs } from '../bin/codex-auto.js';

const base = JSON.parse(readFileSync(new URL('../config/default.json', import.meta.url)));
const clone = () => structuredClone(base);

test('large mechanical change stays on Luna', () => {
  const result = recommend('Rename symbols across 100 files', clone());
  assert.equal(result.recommended_model, 'gpt-5.6-luna');
  assert.equal(result.task_complexity.dimensions.scope, 1);
  assert.equal(result.task_complexity.dimensions.reasoning, 0);
  assert.deepEqual(result.token_budget, {
    suggested_total: 4000,
    likely_minimum: 3000,
    likely_maximum: 6000,
    unit: 'total tokens',
    note: 'Planning estimate for input, output, and reasoning when the provider reports them. It is not an enforced Codex limit or a prediction of billed credits.'
  });
});

test('ordinary implementation uses Terra', () => {
  assert.equal(recommend('Implement a feature with validation and tests in the controller and service', clone()).recommended_model, 'gpt-5.6-terra');
});

test('flaky full suite investigation uses Sol', () => {
  const result = recommend('Investigate why this test fails only when the entire suite runs', clone());
  assert.equal(result.recommended_model, 'gpt-5.6-sol');
  assert.equal(result.task_complexity.dimensions.verification, 2);
  assert.equal(result.token_budget.suggested_total, 32000);
  assert.equal(result.token_budget.likely_maximum, 45000);
});

test('intermittent interacting race investigation uses Astra', () => {
  const result = recommend('Investigate an intermittent race condition across multiple services with unknown root cause and repeated experiments', clone());
  assert.equal(result.recommended_model, 'gpt-6-astra');
  assert.ok(result.explanation.some(x => x.includes('Astra')));
});

test('disabled model is never selected and cap is respected', () => {
  const config = clone();
  config.models.find(m => m.id === 'gpt-6-astra').enabled = false;
  let result = recommend('Investigate an intermittent race condition across multiple services with repeated experiments', config);
  assert.equal(result.recommended_model, 'gpt-5.6-sol');
  assert.equal(result.constrained, true);
  result = recommend('Investigate an intermittent race condition across multiple services with repeated experiments', clone(), { maxModel: 'gpt-5.6-terra' });
  assert.equal(result.recommended_model, 'gpt-5.6-terra');
  assert.equal(result.constrained, true);
});

test('custom model can be selected without engine changes', () => {
  const config = clone();
  config.models.push({ id: 'local-cheap', name: 'Local Cheap', capability: 1, enabled: true, reasoning: ['low'], pricing: { input: 0, cached_input: 0, output: 0 } });
  const result = recommend('Fix a typo', config);
  assert.equal(result.recommended_model, 'local-cheap');
  assert.equal(result.reasoning_effort, 'low');
});

test('malformed registry and policy are rejected', () => {
  const config = clone();
  config.models[0].pricing.output = -1;
  assert.throws(() => validateConfig(config), /bad pricing/);
  const other = clone();
  other.policy.tier_thresholds = [4, 2, 9];
  assert.throws(() => validateConfig(other), /tier_thresholds/);
  const missingBudget = clone();
  delete missingBudget.policy.token_budget;
  assert.throws(() => validateConfig(missingBudget), /token_budget/);
});

test('CLI parse and recommend JSON do not execute Codex', () => {
  assert.deepEqual(parseArgs(['recommend', '--json', 'Fix', 'a typo']).task, 'Fix a typo');
  const stdout = []; const stderr = [];
  assert.equal(main(['recommend', '--json', 'Fix a typo'], { stdout: { write: x => stdout.push(x) }, stderr: { write: x => stderr.push(x) } }), 0);
  assert.equal(JSON.parse(stdout.join('')).recommended_model, 'gpt-5.6-luna');
  assert.equal(stderr.length, 0);
  assert.equal(main(['run', 'Do work'], { stdout: { write: x => stdout.push(x) }, stderr: { write: x => stderr.push(x) } }), 2);
  assert.match(stderr.at(-1), /unavailable/);
});

test('CLI reads a plain text prompt file without executing it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'codex-auto-'));
  try {
    const path = join(dir, 'task.txt');
    writeFileSync(path, 'Rename symbols across 100 files\n');
    const stdout = []; const stderr = [];
    assert.equal(main(['recommend', '--json', '--prompt-file', path], { stdout: { write: x => stdout.push(x) }, stderr: { write: x => stderr.push(x) } }), 0);
    assert.equal(JSON.parse(stdout.join('')).recommended_model, 'gpt-5.6-luna');
    assert.equal(stderr.length, 0);
    assert.throws(() => parseArgs(['--prompt-file', path, 'extra task']), /either a task argument/);
    writeFileSync(path, ' \n');
    assert.equal(main(['--prompt-file', path], { stdout: { write: x => stdout.push(x) }, stderr: { write: x => stderr.push(x) } }), 2);
    assert.match(stderr.at(-1), /nonempty task/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
