// Shim for the `process` module.
//
// On Cloudflare Workers the Worker bindings live on the real Node.js
// `process` object — it is exposed as `globalThis.process` under the
// `nodejs_compat` flag, and it is the very object OpenNext populates before
// every request (`populateProcessEnv`). The browser polyfill must therefore
// only be used when no real process object is available; otherwise
// `process.env.DATABASE_URL` and friends would always read as undefined in
// the server bundle.
//
// The `node:` scheme is deliberately avoided here: webpack cannot parse it
// when compiling the edge (middleware) bundle.
const globalProcess = typeof globalThis !== "undefined" ? globalThis.process : undefined;

const proc = globalProcess && globalProcess.env ? globalProcess : require("process/browser");

if (!proc.versions) proc.versions = {};
if (!proc.versions.node) proc.versions.node = "22";
if (!proc.release) proc.release = {};
if (!proc.config) proc.config = {};

module.exports = proc;
