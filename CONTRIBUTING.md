# Contributing

Thanks for helping improve the router. Issues that include a concrete task prompt, expected routing decision, and an objective way to assess the result are especially useful. Remove private code and identifying details before sharing examples.

For code changes, use Node.js 20 or newer and run:

```bash
npm test
npm run check
```

Keep the recommendation path free of Codex execution and network calls. Update tests when behavior changes, and keep prices and model metadata in `config/default.json` with a source and date. Document any new heuristic as a rule that people can inspect and challenge. Open an issue before a large redesign so the tradeoffs can be discussed.
