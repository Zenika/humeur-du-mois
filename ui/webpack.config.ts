import path from "path";
import HtmlWebpackPlugin from "html-webpack-plugin";
import ScriptExtHtmlWebpackPlugin from "script-ext-html-webpack-plugin";
import webpack from "webpack";

const production = process.env.NODE_ENV === "production";

module.exports = {
  mode: "development",
  entry: {
    main: "./src/index.ts"
  },
  module: {
    rules: [{ test: /\.ts/, use: "ts-loader" }]
  },
  resolve: { extensions: [".ts"] },
  externals: {
    "auth0-js": "auth0",
    "firebase/app": "firebase"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html"
    }),
    new ScriptExtHtmlWebpackPlugin({
      defer: "main.js"
    }),
    new webpack.DefinePlugin({
      __ENV__: {
        API_BASE_URL: JSON.stringify(
          production
            ? "https://us-central1-humeur-du-mois-2018.cloudfunctions.net"
            : "http://localhost:5001/humeur-du-mois-2018/us-central1"
        ),
        AUTH0_CONFIG: JSON.stringify({
          domain: "zenika.eu.auth0.com",
          clientID: "j5xIoOh3R9Jov6wtKQm2BAHUSkrYpttY",
          responseType: "token id_token",
          audience: "https://zenika.eu.auth0.com/userinfo",
          scope: "openid email"
        })
      }
    })
  ]
};
