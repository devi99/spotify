import HtmlWebpackPlugin from "html-webpack-plugin";

const Dotenv = require('dotenv-webpack');
const path = require('path');
const ENV = process.argv.find((arg) => arg.includes('production')) ? 'production' : process.argv.find((arg) => arg.includes('test')) ? 'test' : 'dev';

module.exports = {
  target: 'web',
  mode: 'development',
  entry: './webapp/src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.tsx', '.ts', '.js' ],
  },
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../../dist'),
  },
  plugins: [
    new Dotenv({
      path: './webapp/src/config/.env-' + ENV,
    }),
    new HtmlWebpackPlugin({
      hash: true,
      chunksSortMode: 'auto',
      title: 'Spotify',
      template: './webapp/src/indexTemplate.html',
      filename: './index.html',
  }),
  ]
};