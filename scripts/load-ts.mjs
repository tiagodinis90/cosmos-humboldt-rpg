/**
 * Test helper: transpiles a TypeScript module from src/ (and every relative
 * module it imports) into a temporary directory, then imports it. Unlike the
 * previous data: URL approach, this lets pure modules import each other.
 */
import ts from 'typescript';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'cosmos-tests-'));
const emitted = new Map();

function resolveSource(fromDir, specifier) {
  const base = resolve(fromDir, specifier);
  for (const candidate of [base, base + '.ts', join(base, 'index.ts')]) {
    if (candidate.endsWith('.ts') && existsSync(candidate)) return candidate;
  }
  throw new Error('Cannot resolve ' + specifier + ' from ' + fromDir);
}

function emit(file) {
  if (emitted.has(file)) return emitted.get(file);
  const target = join(out, relative(root, file)).replace(/\.ts$/, '.mjs');
  emitted.set(file, target);
  const result = ts.transpileModule(readFileSync(file, 'utf8'), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    throw new Error(file + ': ' + errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
  }
  const code = result.outputText.replace(
    /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\2/g,
    (_match, prefix, quote, specifier) => {
      const dependency = emit(resolveSource(dirname(file), specifier));
      let path = relative(dirname(target), dependency).split('\\').join('/');
      if (!path.startsWith('.')) path = './' + path;
      return prefix + quote + path + quote;
    },
  );
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, code);
  return target;
}

/** Import a TypeScript module by its path relative to the repository root. */
export async function load(path) {
  return import(pathToFileURL(emit(resolve(root, path))).href);
}
