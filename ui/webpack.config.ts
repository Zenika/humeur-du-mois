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
        AUTH0_CONFIG:
          process.env.HUMEUR_DU_MOIS_UI_AUTH0_CONFIG ||
          JSON.stringify({
            domain: "zenika.eu.auth0.com",
            client_id: "j5xIoOh3R9Jov6wtKQm2BAHUSkrYpttY",
            audience: "https://zenika.eu.auth0.com/userinfo",
            scope: "openid email",
            connection: "google-oauth2"
          }),
        FIREBASE_CONFIG:
          process.env.HUMEUR_DU_MOIS_UI_FIREBASE_CONFIG ||
          JSON.stringify({
            apiKey: "AIzaSyDEcSPU1xW0ReLEvEQoiTH-a003XFsAueQ",
            authDomain: "humeur-du-mois-2018.firebaseapp.com",
            databaseURL: "https://humeur-du-mois-2018.firebaseio.com",
            projectId: "humeur-du-mois-2018",
            storageBucket: "humeur-du-mois-2018.appspot.com",
            messagingSenderId: "613593816673",
            appId: "1:613593816673:web:908fcded3c60516fef5420"
          })
      }
    })
  ]
});
