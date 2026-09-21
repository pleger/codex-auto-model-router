---
name: model-router
description: Recommend a cost-conscious Codex model and reasoning effort for a coding task, or route a bounded coding subtask when the user asks. Use for explicit $model-router requests and model-choice questions; avoid invoking for ordinary coding tasks that do not need a routing decision.
---

# Model router

Use the repository's `codex-auto` recommendation engine as the source of the scoring policy and model registry. Put a chat task in a temporary UTF-8 text file outside the repository using a safe file-writing tool, then run `codex-auto recommend --json --prompt-file <file>` and remove the temporary file. For a task already stored in a text file, use that path. When working in this repository before installation, use `node bin/codex-auto.js` instead. Never interpolate untrusted task text into a shell command.

Read the JSON dimensions, detected signals, selected model, reasoning effort, alternatives, and any `constrained` flag. Explain the recommendation briefly in terms of ambiguity, reasoning, dependencies, verification, and risk. File count alone is not a reason to choose a stronger model. Treat the reported confidence as signal coverage, not probability of success, and API price estimates as comparisons rather than Codex credit costs.

If the CLI is unavailable, apply the same cheapest-adequate principle qualitatively and disclose that the recommendation was not produced by the configured engine. Do not reproduce fixed scores or price tables in this Skill.

A running Codex agent cannot change its own model. When the user wants work delegated and a bounded independent subtask justifies a subagent, use a supported model/effort choice only if available in the current environment; otherwise provide the recommendation for the next run. Do not spawn agents solely to perform routing. Escalate based on objective validation or new evidence, and respect user model and budget limits.
