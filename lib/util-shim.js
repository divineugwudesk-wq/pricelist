// Shim for the `util` module that includes `inspect.custom` symbol.
// Needed because Next.js's edge runtime accesses `util.inspect.custom`
// during configuration collection, and the browser `util` polyfill may
// not include it.
const util = require("util/");
if (util.inspect && !util.inspect.custom) {
  util.inspect.custom = Symbol.for("nodejs.util.inspect.custom");
}
module.exports = util;
