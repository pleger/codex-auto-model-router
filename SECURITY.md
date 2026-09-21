# Security

Please do not open a public issue for a vulnerability that could expose private prompts, source code, credentials, or execute unintended commands. Use GitHub's private vulnerability reporting for this repository when available, or contact the maintainer through a private channel listed on the GitHub profile.

The current `recommend` command reads local task text and configuration, and does not call Codex or make network requests. Future execution features should remain opt-in, bounded, and tested against unintended command execution.
