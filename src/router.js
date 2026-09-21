const EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra'];
const DIMENSIONS = ['ambiguity', 'scope', 'reasoning', 'dependencies', 'verification', 'risk'];
const patterns = [
  { id: 'mechanical', re: /\b(rename|reformat|format|typo|spelling|documentation|docstring|comment|repetitive|mechanical|straightforward|precisely specified)\b/i, text: 'Transformation appears explicit or mechanical.' },
  { id: 'feature', re: /\b(implement|add|create|feature|endpoint|validation|interface|controller|service|repository)\b/i, text: 'Implementation choices are likely.' },
  { id: 'debug', re: /\b(debug|investigate|root cause|why|flaky|intermittent|mysterious|unknown|fails? only)\b/i, text: 'The cause or correct fix needs investigation.' },
  { id: 'complex_reasoning', re: /\b(architecture|architectural|algorithm|performance|memory leak|deadlock|race condition|concurrency|distributed)\b/i, text: 'Diagnostic or architectural reasoning is likely.' },
  { id: 'interacting', re: /\b(across (several|multiple)|multiple (systems|services|modules)|cross.component|distributed|external (service|system|api))\b/i, text: 'Several interacting components are implicated.' },
  { id: 'iterative', re: /\b(intermittent|flaky|reproduc|benchmark|hypothes|experiment|only when|entire suite|under load)\b/i, text: 'Reproduction or iterative validation may be needed.' },
  { id: 'high_risk', re: /\b(security|vulnerabilit|authentication|authorization|data loss|data integrity|migration|production.critical|payments?|race condition|concurrency)\b/i, text: 'The change could have high impact if wrong.' },
  { id: 'multi_file', re: /\b(multi.file|multiple files|several files|across files|across layers|system.wide|100 files)\b/i, text: 'The task spans several files or layers.' },
  { id: 'failed_attempt', re: /\b(previous (attempt|model) failed|sol failed|terra failed|already tried)\b/i, text: 'A lower-cost attempt is reported to have failed.' }
];

function assert(condition, message) { if (!condition) throw new Error(`Invalid configuration: ${message}`); }

export function validateConfig(config) {
  assert(config && typeof config === 'object', 'root must be an object');
  assert(config.schema_version === 1, 'schema_version must be 1');
  assert(config.dimensions && typeof config.dimensions === 'object', 'dimensions are required');
  for (const key of DIMENSIONS) {
    const d = config.dimensions[key];
    assert(d && Number.isFinite(d.weight) && d.weight >= 0 && Number.isInteger(d.max) && d.max >= 1, `bad dimension ${key}`);
  }
  assert(config.policy && Array.isArray(config.policy.tier_thresholds) && config.policy.tier_thresholds.length === 3, 'three tier_thresholds are required');
  const thresholds = config.policy.tier_thresholds;
  assert(thresholds.every(Number.isFinite) && thresholds[0] < thresholds[1] && thresholds[1] < thresholds[2], 'tier_thresholds must increase');
  assert(Array.isArray(config.models) && config.models.length > 0, 'models are required');
  const ids = new Set();
  for (const model of config.models) {
    assert(typeof model.id === 'string' && model.id && !ids.has(model.id), 'model IDs must be unique nonempty strings');
    ids.add(model.id);
    assert(typeof model.name === 'string' && Number.isInteger(model.capability) && model.capability > 0, `bad model ${model.id}`);
    assert(typeof model.enabled === 'boolean', `enabled must be boolean for ${model.id}`);
    assert(Array.isArray(model.reasoning) && model.reasoning.length && model.reasoning.every(x => EFFORTS.includes(x)), `bad reasoning for ${model.id}`);
    assert(model.pricing && ['input', 'cached_input', 'output'].every(x => Number.isFinite(model.pricing[x]) && model.pricing[x] >= 0), `bad pricing for ${model.id}`);
  }
  if (config.policy.max_model !== null && config.policy.max_model !== undefined) assert(ids.has(config.policy.max_model), 'unknown max_model');
  assert(typeof config.policy.allow_astra_automatic === 'boolean', 'allow_astra_automatic must be boolean');
  assert(config.pricing && typeof config.pricing.as_of === 'string' && Array.isArray(config.pricing.sources), 'pricing provenance required');
  const tokens = config.policy.estimated_tokens;
  assert(tokens && ['input', 'cached_input', 'output'].every(x => Number.isFinite(tokens[x]) && tokens[x] >= 0), 'bad estimated_tokens');
  const budget = config.policy.token_budget;
  assert(budget && budget.base_total_by_capability && budget.effort_multipliers && budget.likely_range, 'token_budget is required');
  for (const [capability, value] of Object.entries(budget.base_total_by_capability)) assert(Number.isInteger(+capability) && Number.isFinite(value) && value > 0, 'bad token_budget base_total_by_capability');
  for (const [effort, value] of Object.entries(budget.effort_multipliers)) assert(EFFORTS.includes(effort) && Number.isFinite(value) && value > 0, 'bad token_budget effort_multipliers');
  assert(Number.isFinite(budget.likely_range.lower_multiplier) && Number.isFinite(budget.likely_range.upper_multiplier) && budget.likely_range.lower_multiplier > 0 && budget.likely_range.lower_multiplier < budget.likely_range.upper_multiplier, 'bad token_budget likely_range');
  return config;
}

export function analyze(task, config) {
  if (typeof task !== 'string' || !task.trim()) throw new Error('A nonempty task is required');
  const signals = patterns.filter(p => p.re.test(task)).map(({ id, text }) => ({ id, text }));
  const has = id => signals.some(s => s.id === id);
  const score = {
    ambiguity: has('debug') ? 2 : has('feature') ? 1 : 0,
    scope: /\b(across layers|system.wide|multiple modules|multiple systems)\b/i.test(task) ? 2 : has('multi_file') || has('interacting') ? 1 : 0,
    reasoning: has('complex_reasoning') || has('debug') ? 2 : has('feature') ? 1 : 0,
    dependencies: has('interacting') || /\b(distributed|concurrency|race condition)\b/i.test(task) ? 2 : /\b(api|library|controller|service|repository|entire suite)\b/i.test(task) ? 1 : 0,
    verification: has('iterative') ? 2 : /\b(test|build|lint|typecheck|verify|validation)\b/i.test(task) || has('feature') || has('debug') ? 1 : 0,
    risk: has('high_risk') ? 2 : /\b(regression|breaking|database|deploy)\b/i.test(task) ? 1 : 0
  };
  for (const key of DIMENSIONS) score[key] = Math.min(score[key], config.dimensions[key].max);
  const raw = DIMENSIONS.reduce((sum, key) => sum + score[key], 0);
  const weighted = DIMENSIONS.reduce((sum, key) => sum + score[key] * config.dimensions[key].weight, 0);
  const maximum = DIMENSIONS.reduce((sum, key) => sum + config.dimensions[key].max * config.dimensions[key].weight, 0);
  const confidence = Math.min(0.9, Math.round((signals.length ? 0.55 + Math.min(signals.length, 5) * 0.07 : 0.35) * 100) / 100);
  return { dimensions: score, raw, weighted, maximum, confidence, signals, signal_ids: signals.map(s => s.id) };
}

function estimateCost(model, tokens) {
  return +(model.pricing.input * tokens.input / 1e6 + model.pricing.cached_input * tokens.cached_input / 1e6 + model.pricing.output * tokens.output / 1e6).toFixed(6);
}

function chooseEffort(model, analysis) {
  const desired = analysis.dimensions.reasoning === 2 || analysis.dimensions.verification === 2 ? 'high' : analysis.weighted >= 2.5 ? 'medium' : 'low';
  const supported = model.reasoning.filter(e => EFFORTS.indexOf(e) >= EFFORTS.indexOf('low'));
  if (!supported.length) return model.reasoning[0];
  return supported.find(e => EFFORTS.indexOf(e) >= EFFORTS.indexOf(desired)) ?? supported.at(-1);
}

function roundTokenCount(value) {
  return Math.ceil(value / 1000) * 1000;
}

function suggestTokenBudget(model, effort, config) {
  const budget = config.policy.token_budget;
  const base = budget.base_total_by_capability[String(model.capability)];
  if (!base) throw new Error(`Invalid configuration: no token budget for capability ${model.capability}`);
  const target = roundTokenCount(base * budget.effort_multipliers[effort]);
  return {
    suggested_total: target,
    likely_minimum: roundTokenCount(target * budget.likely_range.lower_multiplier),
    likely_maximum: roundTokenCount(target * budget.likely_range.upper_multiplier),
    unit: budget.unit,
    note: budget.note
  };
}

export function recommend(task, config, options = {}) {
  validateConfig(config);
  const analysis = analyze(task, config);
  const models = config.models.filter(m => m.enabled).sort((a, b) => a.capability - b.capability || estimateCost(a, config.policy.estimated_tokens) - estimateCost(b, config.policy.estimated_tokens));
  if (!models.length) throw new Error('No enabled models');
  const capId = options.maxModel ?? config.policy.max_model;
  const cap = capId == null ? Infinity : config.models.find(m => m.id === capId)?.capability;
  if (cap === undefined) throw new Error(`Unknown max model: ${capId}`);
  const allowed = models.filter(m => m.capability <= cap);
  if (!allowed.length) throw new Error('No enabled models within max-model cap');
  const thresholds = config.policy.tier_thresholds;
  let tier = analysis.weighted < thresholds[0] ? 1 : analysis.weighted < thresholds[1] ? 2 : analysis.weighted < thresholds[2] ? 3 : 4;
  const reasons = analysis.signals.map(s => s.text);
  const ids = analysis.signal_ids;
  if (ids.includes('mechanical') && analysis.dimensions.ambiguity === 0 && analysis.dimensions.reasoning === 0 && analysis.dimensions.risk === 0) {
    tier = Math.min(tier, 2);
    reasons.push('Mechanical scope alone does not require a stronger model.');
  }
  if (ids.includes('high_risk') && ids.includes('complex_reasoning')) { tier = Math.max(tier, 3); reasons.push('High-impact technical reasoning sets a Sol floor.'); }
  if (ids.includes('debug') && ids.includes('interacting') && ids.includes('iterative')) { tier = Math.max(tier, 4); reasons.push('Unknown cause, interacting systems, and iterative validation suggest Astra.'); }
  if (ids.includes('failed_attempt')) { tier = Math.max(tier, 4); reasons.push('A reported failed lower-tier attempt supports escalation.'); }
  if (tier === 4 && !config.policy.allow_astra_automatic) {
    tier = 3;
    reasons.push('Automatic Astra recommendations are disabled by policy.');
  }
  if (!reasons.length) reasons.push('Few specific task signals were detected; this is a low-confidence starting point.');
  const selected = allowed.find(m => m.capability >= tier) ?? allowed.at(-1);
  const constrained = selected.capability < tier;
  if (constrained) reasons.push(`Model cap limits the recommendation below the inferred capability tier ${tier}.`);
  const tokens = config.policy.estimated_tokens;
  const ranked = allowed.map(m => ({ model: m.id, name: m.name, reasoning_effort: chooseEffort(m, analysis), estimated_api_cost_usd: estimateCost(m, tokens) }));
  const selectedCost = estimateCost(selected, tokens);
  const effort = chooseEffort(selected, analysis);
  return {
    schema_version: 1,
    backend: 'heuristic',
    task_complexity: analysis,
    inferred_capability_tier: tier,
    recommended_model: selected.id,
    recommended_name: selected.name,
    reasoning_effort: effort,
    constrained,
    cheaper_candidate: ranked.filter(x => x.estimated_api_cost_usd < selectedCost).at(-1) ?? null,
    stronger_candidate: ranked.find(x => config.models.find(m => m.id === x.model).capability > selected.capability) ?? null,
    alternatives: ranked,
    token_budget: suggestTokenBudget(selected, effort, config),
    explanation: reasons,
    cost: { ...config.pricing, estimated_api_cost_usd: selectedCost, assumed_tokens: tokens, note: 'Token estimate assumes equal usage across models; effort can change token use. No calibrated success probability or Codex credit estimate is claimed.' }
  };
}

export function formatRecommendation(result) {
  const lines = [
    `Recommended: ${result.recommended_name} / ${result.reasoning_effort}`,
    `Confidence: ${Math.round(result.task_complexity.confidence * 100)}% (heuristic signal coverage)`,
    `Score: ${result.task_complexity.raw} raw; ${result.task_complexity.weighted}/${result.task_complexity.maximum} weighted`,
    '', 'Complexity:'
  ];
  for (const [key, value] of Object.entries(result.task_complexity.dimensions)) lines.push(`  ${key.padEnd(14)} ${value}`);
  lines.push('', 'Why:');
  for (const reason of result.explanation) lines.push(`  - ${reason}`);
  if (result.cheaper_candidate) lines.push('', `Cheaper candidate: ${result.cheaper_candidate.name} / ${result.cheaper_candidate.reasoning_effort} (not assessed as equally adequate)`);
  if (result.stronger_candidate) lines.push(`Stronger candidate: ${result.stronger_candidate.name} / ${result.stronger_candidate.reasoning_effort}`);
  lines.push('', `Suggested token budget: ${result.token_budget.suggested_total.toLocaleString()} ${result.token_budget.unit}`, `Likely planning range: ${result.token_budget.likely_minimum.toLocaleString()}–${result.token_budget.likely_maximum.toLocaleString()} ${result.token_budget.unit}`, result.token_budget.note, '', `Illustrative API token cost: $${result.cost.estimated_api_cost_usd.toFixed(4)} (${result.cost.as_of})`, result.cost.basis, result.cost.note);
  return `${lines.join('\n')}\n`;
}
