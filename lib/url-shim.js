// Shim for the `url` module that safely handles undefined input.
// Needed because NextAuth v4's oauth library calls url.parse(undefined)
// during module initialization when no OAuth provider is configured.
// This project only uses CredentialsProvider, so this code path is never
// reached at runtime; it only prevents crashes during build-time page-data
// collection.
const url = require("url/");
const origParse = url.parse;
url.parse = function (urlString, ...args) {
  if (urlString === undefined || urlString === null) return {};
  return origParse.call(this, urlString, ...args);
};
module.exports = url;
