# Codex Auto Recommendation Router: Transparent and Configurable

Automatically recommend a sensible Codex model, reasoning effort, and planning token budget before you start a coding task.

The strongest model can be useful for a difficult investigation, but many changes are clear and routine. Codex Auto Model Router reads your task description and recommends a model and reasoning effort, with a short explanation of why it chose them.

The project is at its first usable milestone. **`recommend` only gives advice. It does not start Codex, run commands, read your repository, or change files.**

## Start here

You need Node.js 20 or newer. Install the command-line tool:

```bash
npm install -g codex-auto-model-router
codex-auto recommend \
  "Investigate why this test fails only when the entire suite runs"
```

Or run the current GitHub source directly:

```bash
git clone https://github.com/pleger/codex-auto-model-router.git
cd codex-auto-model-router
npm install
node bin/codex-auto.js recommend "Investigate why this test fails only when the entire suite runs"
```

You should see a recommendation similar to this:

```text
Recommended: GPT-5.6 Sol / high
Confidence: 69% (heuristic signal coverage)
Score: 7 raw; 8/12 weighted

Complexity:
  ambiguity      2
  scope          0
  reasoning      2
  dependencies   1
  verification   2
  risk           0

Why:
  - The cause or correct fix needs investigation.
  - Reproduction or iterative validation may be needed.

Cheaper candidate: GPT-5.6 Terra / high (not assessed as equally adequate)
Stronger candidate: GPT-6 Astra / high

Suggested token budget: 32,000 total tokens
Likely planning range: 20,000–45,000 total tokens
Planning estimate for input, output, and reasoning when the provider reports them. It is not an enforced Codex limit or a prediction of billed credits.

Illustrative API token cost: $0.0800 (2026-09-20)
OpenAI API standard token rates; comparison proxy, not Codex subscription credits
Token estimate assumes equal usage across models; effort can change token use. No calibrated success probability or Codex credit estimate is claimed.
```

Every recommendation is local and advisory. The tool does not start Codex, inspect your repository, run commands, send your prompt anywhere, or change files.

For a shorter command while working from a clone, run `npm link` once. You can omit `recommend`: `codex-auto "Fix a typo"` has the same safe behavior.

## Examples

```bash
# A widespread but mechanical change can still suit Luna.
codex-auto recommend "Rename symbols across 100 files"

# JSON output for a script, editor tool, or experiment.
codex-auto recommend --json "Add validation to the controller and service"

# Keep a longer or multiline task in a UTF-8 plain-text file.
codex-auto recommend --prompt-file task.txt

# Keep recommendations at or below a model you choose.
codex-auto recommend --max-model gpt-5.6-sol \
  "Investigate an intermittent race condition across multiple services"
```

When a model cap is lower than the router's inferred tier, the JSON result includes `"constrained": true` and the explanation says why. `run` is reserved for a later milestone and currently returns an error rather than executing a task.

Use either a quoted task or `--prompt-file`, not both. The file may contain a multiline prompt. `--json` and `--max-model` work with either input form.

## How it chooses

The router looks for clues in the task text and scores six dimensions: ambiguity, scope, reasoning, dependencies, verification, and risk. It then applies a few qualitative rules and chooses a supported reasoning effort separately from the model.

For example, a rename across many files can stay on Luna because the work is mechanical. An uncertain failure that needs reproduction and investigation can move toward Sol or Astra. File count alone does not make a task intellectually difficult.

The initial registry covers GPT-5.6 Luna, Terra, and Sol, plus GPT-6 Astra. Model IDs, enabled status, reasoning levels, prices, and policy thresholds live in [config/default.json](config/default.json), so they can be updated without editing the routing engine. To try your own settings, copy that file and pass the **complete** JSON file with `--config path/to/router.json`.

## Configure it for your team

Start with a complete copy of the shipped policy, then use it for a recommendation:

```bash
cp config/default.json router.json
codex-auto recommend --config router.json "Review this production database migration"
```

The router validates the configuration before it evaluates a task. A custom file replaces the default; it is not a partial override.

### `pricing`: document the cost comparison

The top-level `pricing` object supplies the currency, unit, date, explanation, and source URLs shown alongside the illustrative API-cost estimate. It does not change the selected model. Update `as_of`, `basis`, and `sources` when you refresh prices.

Each model also has a `pricing` object:

```json
"pricing": { "input": 2, "cached_input": 0.2, "output": 12 }
```

These values use the top-level unit, currently USD per one million tokens. They affect only the comparison estimate. They are not Codex subscription-credit prices.

### `dimensions`: tune what makes a task difficult

The task-text heuristic scores six dimensions, each from zero to its `max`. `weight` decides how much that score contributes to the model tier:

| Dimension | Meaning | Default weighting choice |
| --- | --- | --- |
| `ambiguity` | Unknown cause, requirement, or fix | Standard weight |
| `scope` | Work across files, layers, or systems | Half weight: broad mechanical work should stay inexpensive |
| `reasoning` | Diagnostic, architectural, or algorithmic work | Higher weight |
| `dependencies` | Interacting services, APIs, or components | Standard weight |
| `verification` | Reproduction, testing, and iterative validation | Standard weight |
| `risk` | Security, data, or production impact | Standard weight |

For example, raise the importance of risky changes:

```json
"risk": { "weight": 2, "max": 2 }
```

Keep `max` at `2` with the current heuristic. Raising a `weight` moves matching tasks to higher capability tiers more readily.

You can also add, remove, or rename factors without changing JavaScript. A factor needs a `weight`, a `max`, and optional task-text `signals`. Each signal is a case-insensitive JavaScript regular-expression string, its score when it matches, and an explanation included in the recommendation. For example, add a compliance factor:

```json
"compliance": {
  "weight": 3,
  "max": 2,
  "signals": [
    {
      "pattern": "\\b(HIPAA|GDPR|audit trail|regulated health data)\\b",
      "score": 2,
      "reason": "Regulatory compliance needs careful handling."
    }
  ]
}
```

With this configuration, a task mentioning `HIPAA` receives a compliance score of 2 and the custom explanation. A higher weight makes that signal contribute more to the recommended tier. Configuration validation rejects invalid regular expressions, scores outside `1` through the factor's `max`, and malformed factor definitions.

### `policy`: set escalation and planning rules

`tier_thresholds` maps the weighted score to capability tiers. The default `[2.5, 5.5, 9]` means Luna below 2.5, Terra from 2.5 to below 5.5, Sol from 5.5 to below 9, and Astra at 9 or above. Lower a threshold to escalate sooner; raise it to favour lower tiers.

`max_model` sets a persistent ceiling. Use `null` for no ceiling, or an exact model ID such as `"gpt-5.6-sol"`. The one-off `--max-model` flag takes precedence over this setting.

`allow_astra_automatic` controls whether a task may automatically reach Astra. It defaults to `false`, so even a tier-4 task is limited to Sol unless you set it to `true`:

```json
"allow_astra_automatic": true
```

`estimated_tokens` is the fixed hypothetical input, cached-input, and output mix used to calculate the illustrative API-cost comparison. It does not set a limit or affect routing.

`token_budget` controls the planning suggestion. `base_total_by_capability` supplies a starting total for each tier; `effort_multipliers` adjusts it for the chosen reasoning effort; and `likely_range` creates the displayed lower and upper range. With the defaults, Sol at `high` is `20,000 × 1.6 = 32,000` total tokens, with a 20,000–45,000 planning range. This is guidance, not a Codex limit.

### `models`: define the selectable catalog

Each item in `models` describes one router option:

```json
{
  "id": "gpt-5.6-terra",
  "name": "GPT-5.6 Terra",
  "capability": 2,
  "enabled": true,
  "reasoning": ["none", "low", "medium", "high", "xhigh", "max"],
  "pricing": { "input": 2, "cached_input": 0.2, "output": 12 },
  "context_tokens": 1050000
}
```

- `id` is unique and is the model identifier used by the policy.
- `name` is the label in the recommendation.
- `capability` is the tier used for routing and must have a matching base token budget.
- `enabled` determines whether the router may select the model.
- `reasoning` limits the effort levels the router may recommend.
- `pricing` provides the comparison-rate assumptions.
- `context_tokens` records context-window metadata for future context-aware routing; the current heuristic does not use it.

### Reading the cost, confidence, and token budget fields

- **Confidence** describes how many explicit task signals the heuristic recognized. It is not a measured probability that the selected model will solve the task.
- **Suggested token budget** is a configurable planning target and range for the selected model and effort. It includes input, output, and reasoning tokens when the provider reports them. It is not an enforced limit, a prediction of billed credits, or a claim about the exact number of tokens Codex will use.
- **Estimated cost** uses a sample token mix and dated [OpenAI API token prices](https://developers.openai.com/api/docs/models). It is a comparison aid, not a quote for your task or an estimate of Codex subscription credits. Different models and reasoning levels may use different numbers of tokens.
- **Cheaper and stronger candidates** are options to consider. Their presence does not mean they are equally likely to succeed.

These limits are intentional: the project needs benchmark results before it can make evidence-based claims about success rates or cost per successful task.

## Related tools and where this project differs

Model selection for coding agents is an active area, and this project builds alongside existing work:

- [GitHub Copilot Auto model selection](https://docs.github.com/en/copilot/concepts/models/auto-model-selection) is a mature integrated feature that routes tasks using task optimization together with service health and availability signals.
- [Saadfk/codex-model-router](https://github.com/Saadfk/codex-model-router/blob/main/docs/codex_model_router.md) can classify a prompt, select a Codex model and effort, and dispatch work. It includes a local heuristic-only fallback.
- [gitguffaw/codex-router](https://github.com/gitguffaw/codex-router/blob/codex-router-main/README.md) reads the installed Codex model catalog and provides commands for selecting models, reasoning effort, and service tier.
- [tkellogg/model-selection](https://github.com/tkellogg/model-selection/blob/main/SKILL.md) ranks available models using benchmark, price, speed, and task-fit data across supported coding runtimes.

Codex Auto Model Router is a narrower proof of concept. It is deliberately local, deterministic, and recommendation-only: it does not classify the prompt with a remote model, dispatch a coding task, or change an active Codex chat. Its intended contribution is an inspectable policy that teams can version and edit: task-signal weights, tier thresholds, enabled models, model ceilings, price assumptions, and token-budget rules. The `AGENTS.md` template and `model-router` Skill reuse that visible policy in Codex-native workflows.

This is not evidence that its recommendations are better than those of other tools. Benchmarking against representative tasks, objective checks, repeated runs, latency, and token use is required before making that claim.

## Use it with Codex

The router also provides reusable guidance for Codex-native workflows:

- Copy the [AGENTS.md template](templates/AGENTS.md) into your project or Codex home for persistent routing guidance. See the [installation notes](docs/agents.md).
- Use the repository's [model-router Skill](.agents/skills/model-router/SKILL.md) to ask Codex for the same recommendation policy. Its [guide](docs/skills.md) explains setup and limits.

Both integrations reuse the CLI policy when it is available. They can recommend a model for a new task; they cannot change the model of a chat already in progress.

## Current status and roadmap

| Mode | Status | Purpose |
| --- | --- | --- |
| CLI recommendation | Available | Explain a model and reasoning choice without executing the task |
| CLI execution | Planned | Run `codex exec` with dry run, validation, and spending controls |
| `AGENTS.md` template | Available | Give Codex persistent routing guidance |
| `model-router` Skill | Available | Reuse the same policy in Codex-native workflows |

Other planned work includes lightweight repository context, bounded validation-based escalation, local-only history, and benchmark tasks. The [implementation plan](docs/implementation-plan.md) explains the architecture and records the Codex behavior checked for this project, including JetBrains support and current integration limits.

## Contributing

Feedback and benchmark tasks are especially useful at this stage. A helpful task example includes its description, the model you expected, the reason, and an objective way to check the result. Please avoid including private prompts, source code, or repository details you cannot share.

The project is looking for contributors who can help with routing benchmarks, Codex workflow research, CLI and editor integrations, documentation, and real-world feedback. Start with [CONTRIBUTING.md](CONTRIBUTING.md), open an issue, or share a reproducible task example.

To work on the router:

```bash
npm test
npm run check
```

The CLI is in [bin/codex-auto.js](bin/codex-auto.js), routing logic is in [src/router.js](src/router.js), and tests are in [tests/router.test.js](tests/router.test.js). Recommendations run locally without an API key or network request. No task text is uploaded by this command.

This project is released under the [MIT License](LICENSE). Find the package on [npm](https://www.npmjs.com/package/codex-auto-model-router). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance, [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations, and [SECURITY.md](SECURITY.md) for private vulnerability reports.
