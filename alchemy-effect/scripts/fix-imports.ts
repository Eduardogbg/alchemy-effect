#!/usr/bin/env bun
/**
 * Post-build script to add .js extensions to relative imports in lib/*.js files.
 * This is needed for ESM compatibility in Node.js.
 */

import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { join, dirname } from "node:path";

const LIB_DIR = join(import.meta.dirname, "..", "lib");

// Regex to match relative imports without extensions
// Matches: from "./something" or from "../something" or from "../../something"
const IMPORT_REGEX = /from\s+["'](\.[^"']+)["']/g;

async function processFile(filePath: string): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  const newContent = content.replace(IMPORT_REGEX, (match, importPath) => {
    // Skip if already has .js extension
    if (importPath.endsWith(".js")) {
      return match;
    }
    // Skip if it's importing a .ts file directly (shouldn't happen in lib/)
    if (importPath.endsWith(".ts")) {
      return match.replace(".ts", ".js");
    }
    // Add .js extension
    return match.replace(importPath, `${importPath}.js`);
  });

  if (content !== newContent) {
    await writeFile(filePath, newContent);
    console.log(`Fixed imports in: ${filePath}`);
  }
}

async function* walkDir(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      yield fullPath;
    }
  }
}

async function main() {
  console.log("Fixing relative imports in lib/...");

  let count = 0;
  for await (const file of walkDir(LIB_DIR)) {
    await processFile(file);
    count++;
  }

  console.log(`Processed ${count} files.`);
}

main().catch(console.error);
