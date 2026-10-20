// Reorders the "workerd" condition to the front of the generated Prisma
// client's `#main-entry-point` import map.
//
// Why this is needed
// ------------------
// Prisma generates two flavours of the client:
//
//   * `index.js` — the Node.js client. It loads the WASM query compiler from
//     disk with `fs.readFileSync`, which cannot work inside the Workers
//     runtime (there is no filesystem).
//   * `wasm.js` — the Workers client. It loads the compiler through
//     `import("#wasm-compiler-loader")`, which resolves to a WebAssembly
//     module import.
//
// Which flavour is used is decided by the `#main-entry-point` import map in
// `node_modules/.prisma/client/package.json`. Condition matching is *order
// sensitive*: the first key that is present in the active condition set wins.
// The generated map lists "node" before "workerd", and the OpenNext bundle is
// built with esbuild using `platform: "node"`, so the "node" condition is
// active as well and the Node.js client was picked — the Worker then failed
// with `no such file or directory, readAll '.../query_compiler_bg.wasm'`.
//
// Moving "workerd" to the front fixes the Workers bundle. Node.js is not
// affected: "workerd" is not part of Node's condition set, so Node still
// matches "node" and keeps using the Node.js client.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const clientDir = join(projectRoot, "node_modules", ".prisma", "client");
const manifestPath = join(clientDir, "package.json");

if (!existsSync(manifestPath)) {
  // Nothing to patch yet (the client has not been generated).
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entryPoint = manifest.imports?.["#main-entry-point"];

if (!entryPoint) {
  process.exit(0);
}

let changed = false;

for (const kind of ["require", "import"]) {
  const conditions = entryPoint[kind];
  if (!conditions || typeof conditions !== "object") continue;

  const keys = Object.keys(conditions);
  if (!keys.includes("workerd") || keys.indexOf("workerd") === 0) continue;

  const reordered = {};
  for (const key of keys) {
    if (key === "workerd") reordered[key] = conditions[key];
  }
  for (const key of keys) {
    if (key !== "workerd") reordered[key] = conditions[key];
  }

  entryPoint[kind] = reordered;
  changed = true;
}

if (changed) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("Patched Prisma client: 'workerd' condition moved to the front.");
}
