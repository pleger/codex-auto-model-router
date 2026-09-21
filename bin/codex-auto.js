#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { recommend, validateConfig, formatRecommendation } from '../src/router.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const usage = `Usage: codex-auto [recommend] [--json] [--config FILE] [--max-model ID] TASK
       codex-auto [recommend] [--json] [--config FILE] [--max-model ID] --prompt-file FILE

Recommend is the only command in this MVP. It never runs Codex.
Configuration defaults to config/default.json. Pass --config for a complete custom JSON file.
`;

export function parseArgs(args) {
  const options = { json: false, config: resolve(root, 'config/default.json'), maxModel: null, promptFile: null };
  const words = [...args];
  if (words[0] === 'recommend') words.shift();
  else if (words[0] && !words[0].startsWith('-') && ['run', 'help'].includes(words[0])) {
    if (words[0] === 'help') return { help: true };
    throw new Error('run is planned but unavailable in the recommend-only MVP');
  }
  const task = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === '--help' || word === '-h') return { help: true };
    if (word === '--json') options.json = true;
    else if (word === '--config' || word === '--max-model' || word === '--prompt-file') {
      if (!words[i + 1]) throw new Error(`${word} requires a value`);
      options[word === '--config' ? 'config' : word === '--max-model' ? 'maxModel' : 'promptFile'] = words[++i];
    } else if (word.startsWith('-')) throw new Error(`Unknown option: ${word}`);
    else task.push(word);
  }
  if (options.promptFile && task.length) throw new Error('Use either a task argument or --prompt-file, not both');
  if (!options.promptFile && !task.length) throw new Error('A task or --prompt-file is required');
  return { ...options, task: task.join(' ') };
}

export function main(args = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  try {
    const options = parseArgs(args);
    if (options.help) { io.stdout.write(usage); return 0; }
    const config = JSON.parse(readFileSync(resolve(options.config), 'utf8'));
    validateConfig(config);
    const task = options.promptFile
      ? new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(resolve(options.promptFile)))
      : options.task;
    const result = recommend(task, config, { maxModel: options.maxModel });
    io.stdout.write(options.json ? `${JSON.stringify(result, null, 2)}\n` : formatRecommendation(result));
    return 0;
  } catch (error) {
    io.stderr.write(`codex-auto: ${error.message}\n`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main();
