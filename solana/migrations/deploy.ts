// Anchor deploy migration. Runs after `anchor deploy`.
// For the World Cup engine there is no global state to initialize — markets are
// created per-fixture by the backend keeper via `init_market` — so this is a
// no-op placeholder that keeps `anchor migrate` happy.

const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);
  // Add one-time setup here if the program ever gains global config state.
};
