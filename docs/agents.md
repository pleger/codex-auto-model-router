# Persistent routing instructions

Copy [`templates/AGENTS.md`](../templates/AGENTS.md) into the root of a project to give Codex routing guidance there. For a personal default across projects, copy it to `~/.codex/AGENTS.md` (or `$CODEX_HOME/AGENTS.md` if you use a custom Codex home). Review and adapt the text to the project's own requirements before use.

Codex reads global and project instructions at session startup. Files closer to the working directory take precedence. See the [official AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md) for discovery and override details.

The template asks an agent to use `codex-auto recommend --json` when a routing decision helps. Install the CLI first or keep the qualitative fallback. The template cannot switch the model of a running agent; current Codex supports separate custom agents for delegated work, as described in the [subagents guide](https://learn.chatgpt.com/docs/agent-configuration/subagents).
