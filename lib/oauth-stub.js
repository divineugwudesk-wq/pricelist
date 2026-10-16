// Stub for the `oauth` module used by next-auth/core.
// This project only uses the CredentialsProvider, so OAuth-specific code
// is never exercised at runtime. The stub prevents the oauth library's
// module initialization from failing during OpenNext page-data collection.
module.exports = {};
