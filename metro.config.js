/* eslint-env node */
// Expo's web target uses expo-sqlite's wa-sqlite build. Metro must treat .wasm as
// an asset, and the browser needs COOP/COEP headers to expose SharedArrayBuffer.
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("wasm");

const upstream = config.server?.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    return upstream ? upstream(middleware)(req, res, next) : middleware(req, res, next);
  };
};

module.exports = config;
