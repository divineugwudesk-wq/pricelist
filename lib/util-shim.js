// Shim for the `util` module.
//
// The real `node:util` is preferred so that the server bundle keeps the full
// Node.js API (`util.types`, `util.promisify`, ...) that bundled dependencies
// rely on. The browser polyfill is kept as a fallback for build-time contexts
// that do not provide the Node.js built-ins.
let util;

try {
  util = require("node:util");
} catch {
  util = require("util/");
}

if (util.inspect && !util.inspect.custom) {
  util.inspect.custom = Symbol.for("nodejs.util.inspect.custom");
}

module.exports = util;
