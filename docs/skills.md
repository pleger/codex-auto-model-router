# Model-router Skill

The repository includes [`.agents/skills/model-router/SKILL.md`](../.agents/skills/model-router/SKILL.md). Codex discovers repository skills from `.agents/skills` and can select this one by description or through an explicit `$model-router` mention. See [official Skill guidance](https://learn.chatgpt.com/docs/build-skills).

The Skill calls the same `codex-auto recommend --json` engine used at the terminal. It contains only interpretation and delegation guidance, so model prices and score thresholds stay in one configuration source. Install the CLI through npm once published, or call `node bin/codex-auto.js` while working in this repository.

Example: `$model-router Recommend a model for investigating this flaky integration test.` The Skill returns advice in the current chat. It does not change that chat's model; any delegated work needs a separate supported agent and a task that benefits from delegation.
