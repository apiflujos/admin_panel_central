#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const repoRoot = process.cwd();
const tsconfigPath = path.join(repoRoot, "tsconfig.json");
const entryPoints = [
  path.join(repoRoot, "src", "scripts", "db-migrate.ts"),
  path.join(repoRoot, "apps", "workers", "src", "bootstrap.ts"),
];

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) {
    return message;
  }
  const position = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  const relativePath = path.relative(repoRoot, diagnostic.file.fileName);
  return `${relativePath}(${position.line + 1},${position.character + 1}): ${message}`;
}

const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
if (configFile.error) {
  console.error(formatDiagnostic(configFile.error));
  process.exit(1);
}

const parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, repoRoot);
const fileNames = entryPoints.filter((filePath) => fs.existsSync(filePath));

if (!fileNames.length) {
  console.error("No TypeScript entrypoints found.");
  process.exit(1);
}

const program = ts.createProgram({
  rootNames: fileNames,
  options: parsedConfig.options,
});

const emitResult = program.emit();
const diagnostics = ts
  .getPreEmitDiagnostics(program)
  .concat(emitResult.diagnostics);

if (diagnostics.length) {
  diagnostics.forEach((diagnostic) => {
    console.error(formatDiagnostic(diagnostic));
  });
  process.exit(1);
}

process.exit(0);
