// Shim for the `process` module that includes `versions.node` and other
// properties expected by Next.js/OpenNext during build-time configuration
// collection on Cloudflare Workers.
const process = require("process/browser");
if (!process.versions) process.versions = {};
if (!process.versions.node) process.versions.node = "22";
if (!process.release) process.release = {};
if (!process.config) process.config = {};
module.exports = process;
