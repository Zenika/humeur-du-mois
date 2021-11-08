import HtmlWebpackPlugin from "html-webpack-plugin";
import MiniCssExtractPlugin from "mini-css-extract-plugin";
import webpack from "webpack";

export default (): webpack.Configuration => ({
  mode: "development",
  entry: {
    main: "./src/index.ts"
  },
  module: {
    rules: [
      { test: /\.ts/, use: "ts-loader" },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      }
    ]
  },
  resolve: { extensions: [".js", ".ts"] },
  externals: {
    "firebase/app": "firebase"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      scriptLoading: "defer"
    }),
    new MiniCssExtractPlugin({
      filename: "[name].css"
    }),
    new webpack.DefinePlugin({
      __ENV__: {
        AUTH0_CONFIG: JSON.stringify({
          domain: "zenika.eu.auth0.com",
          client_id: "j5xIoOh3R9Jov6wtKQm2BAHUSkrYpttY",
          audience: "https://zenika.eu.auth0.com/userinfo",
          scope: "openid email"
        })
      }
    })
  ]
});
