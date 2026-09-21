# Implementation plan and verified Codex baseline

Checked 2026-09-20 against official OpenAI documentation and local `codex-cli 0.155.0-alpha.9.2 --help`. The workspace was empty and was not a Git repository when work began.

## Current product facts

| Question | Verified finding |
| --- | --- |
| Model IDs | `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`, `gpt-6-astra`. `gpt-5.6` is a Sol alias. |
| Reasoning | Luna, Terra, Sol: `none`, `low`, `medium`, `high`, `xhigh`, `max`. Astra: `low`, `medium`, `high`, `xhigh`, `max`. Availability in a particular account still needs checking at execution time. |
| Noninteractive CLI | `codex exec [OPTIONS] [PROMPT]`; `-m/--model` selects a model. `-c 'model_reasoning_effort="high"'` uses the documented config key through the documented override syntax. Local help confirms both flags. |
| AGENTS.md | Codex loads global and project instructions at startup, with closer project files taking precedence. A running agent cannot switch its own model mid-turn. |
| Skills | A skill directory contains `SKILL.md` with YAML `name` and `description`. Explicit `$skill-name` and description-based implicit invocation are supported; repository skills live under `.agents/skills`. |
| Custom agents | Local Codex accepts `.codex/agents/*.toml` with `name`, `description`, `developer_instructions`, and optional `model` and `model_reasoning_effort`. Subagents consume additional tokens. |
| JetBrains | JetBrains IDEs offer their own Codex integration through AI Chat. Repository instructions and discoverable skills can guide its agent; this project cannot silently intercept the IDE model selector. The terminal CLI is a separate entry point. |

Sources: [Codex models](https://developers.openai.com/es-419/docs/models), [API model catalog](https://developers.openai.com/api/docs/models), [noninteractive mode](https://developers.openai.com/es-419/docs/non-interactive-mode), [AGENTS.md](https://developers.openai.com/es-419/docs/agent-configuration/agents-md), [building skills](https://developers.openai.com/es-419/docs/build-skills), [subagents](https://developers.openai.com/es-419/docs/agent-configuration/subagents), [IDE](https://developers.openai.com/es-419/docs/codex/ide).

## Important corrections to the brief

- API dollar rates do not establish Codex subscription credits. The current registry is explicitly an API token comparison proxy, with a date and source. Actual cost per successful task requires measured usage and success data.
- A heuristic confidence score is evidence coverage, not calibrated `P(success)`. The latter needs benchmark outcomes.
- Codex model and effort availability can depend on client and account. The registry is updateable and execution should preflight availability or handle a rejected model.
- Persistent instructions and a skill can recommend delegation, but they cannot reroute the current agent itself. Optional custom agents are a later integration, used only for bounded delegated work.
- The JetBrains chat integration does not expose a documented interception hook for a third-party router. Do not claim automatic in-chat routing.

## Architecture

`bin/codex-auto.js` parses requests and formats output. `src/router.js` is pure routing logic: signal detection, six-dimension scoring, qualitative rules, model/effort choice, and illustrative cost. `config/default.json` is the versioned model registry and policy. Tests exercise the public functions and CLI. Later modules can add `adapters/repository`, `adapters/codex-cli`, validation, escalation, and local history without coupling the core to Codex execution.

## CLI and configuration contract

MVP: `codex-auto [recommend] [--json] [--config FILE] [--max-model ID] TASK`. The default verb recommends. `run` fails explicitly until execution is implemented. A custom config is a complete JSON document, not an implicit partial merge. The registry lists ID, name, capability rank, enablement, supported efforts, pricing, and context; policy lists weighted tier thresholds, a model cap, and a token mix for comparison. The six dimension weights are configurable. A model cap is reported as constrained when it blocks the inferred tier.

Routing starts with bounded, transparent task-text signals. It calculates raw and weighted scores; scope has half weight. Qualitative floors cover complex high-risk reasoning, unknown causes with interacting systems and iterative verification, and failed prior attempts. Mechanical work stays inexpensive even when widespread. It chooses the lowest adequate capability tier among enabled models, then a supported effort. Alternatives use illustrative API token costs. Task-specific probability of success is deliberately absent until calibrated.

## Milestones

1. **Recommend-only MVP (implemented):** deterministic scorer, versioned registry, explainable human and JSON output, limits, tests, no Codex process or task execution.
2. Add optional lightweight repository context and benchmark fixtures. Keep repository size out of the capability score.
3. Add `run` adapter using verified `codex exec`, dry run, model and spend guardrails, and explicit validation commands.
4. Add opt-in bounded escalation driven by validation failures, attempt/time/budget limits, and local-only privacy-preserving history.
5. **Codex-native guidance (implemented):** short `AGENTS.md` template and `model-router` skill consuming the CLI's JSON recommendation. Optional custom agents and client-level validation remain future work.
6. Expand benchmark repositories and release process. Contribution and security docs, npm packaging, and the MIT license are present. Add hosted CI when repository credentials allow workflow publishing.

## Verification strategy

Use unit tests for dimensions, qualitative overrides, disabled models, caps, custom registry entries, malformed config, and no-execution invariants. Add fixture-based accuracy calibration before claiming success probabilities. Execution tests in later milestones should stub the Codex process and validation commands; live model tests should be optional and separately budgeted.
