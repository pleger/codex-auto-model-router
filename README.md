# Codex Auto Model Router

**Pick a sensible Codex model before you start a coding task.**

The strongest model can be useful for a difficult investigation, but many changes are clear and routine. Codex Auto Model Router reads your task description and recommends a model and reasoning effort, with a short explanation of why it chose them.

The project is at its first usable milestone. **`recommend` only gives advice. It does not start Codex, run commands, read your repository, or change files.**

## Try it in a minute

You need Node.js 20 or newer. From this repository:

```bash
npm install
node bin/codex-auto.js recommend \
  "Investigate why this test fails only when the entire suite runs"
```

You should see a recommendation like this:

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
```

For a shorter command while working locally, run `npm link` once and use `codex-auto recommend "Your task"`. You can omit `recommend`: `codex-auto "Fix a typo"` has the same safe, advice-only behavior.

## Examples

```bash
# A widespread but mechanical change can still suit Luna.
codex-auto recommend "Rename symbols across 100 files"

# JSON output for a script, editor tool, or experiment.
codex-auto recommend --json "Add validation to the controller and service"

# Keep a longer task in a UTF-8 plain text file.
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

### Reading the cost and confidence fields

- **Confidence** describes how many explicit task signals the heuristic recognized. It is not a measured probability that the selected model will solve the task.
- **Estimated cost** uses a sample token mix and dated [OpenAI API token prices](https://developers.openai.com/api/docs/models). It is a comparison aid, not a quote for your task or an estimate of Codex subscription credits. Different models and reasoning levels may use different numbers of tokens.
- **Cheaper and stronger candidates** are options to consider. Their presence does not mean they are equally likely to succeed.

These limits are intentional: the project needs benchmark results before it can make evidence-based claims about success rates or cost per successful task.

## Current status and roadmap

| Mode | Status | Purpose |
| --- | --- | --- |
| CLI recommendation | Available | Explain a model and reasoning choice without executing the task |
| CLI execution | Planned | Run `codex exec` with dry run, validation, and spending controls |
| `AGENTS.md` template | Available | Give Codex persistent routing guidance |
| `model-router` Skill | Available | Reuse the same policy in Codex-native workflows |

Copy the [AGENTS.md template](templates/AGENTS.md) into your project or Codex home, and see the [installation notes](docs/agents.md). The [model-router Skill](.agents/skills/model-router/SKILL.md) is discoverable from this repository; its [guide](docs/skills.md) explains invocation and limits. Both use the CLI's configured policy when it is available. They cannot change the model of a running chat.

Other planned work includes lightweight repository context, bounded validation-based escalation, local-only history, and benchmark tasks. The [implementation plan](docs/implementation-plan.md) explains the architecture and records the Codex behavior checked for this project, including JetBrains support and current integration limits.

## Contributing

Feedback and benchmark tasks are especially useful at this stage. A helpful task example includes its description, the model you expected, the reason, and an objective way to check the result. Please avoid including private prompts, source code, or repository details you cannot share.

To work on the router:

```bash
npm test
npm run check
```

The CLI is in [bin/codex-auto.js](bin/codex-auto.js), routing logic is in [src/router.js](src/router.js), and tests are in [tests/router.test.js](tests/router.test.js). Recommendations run locally without an API key or network request. No task text is uploaded by this command.

This project is released under the [MIT License](LICENSE). See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance and [SECURITY.md](SECURITY.md) for private vulnerability reports.
