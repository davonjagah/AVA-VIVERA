const path = require("path");

module.exports = {
  mode: "production",
  entry: "./src/hubtel-sdk.js",
  output: {
    filename: "hubtel-sdk.bundle.js",
    path: path.resolve(__dirname, "public/js"),
    library: "HubtelCheckout",
    libraryTarget: "umd",
    globalObject: "this",
  },
  resolve: {
    fallback: {
      crypto: false,
      stream: false,
      util: false,
      buffer: false,
    },
  },
};
