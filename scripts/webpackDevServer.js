/* eslint-disable no-console */
const webpack = require('webpack'),
  config = require('../config/webpack.config'),
  WebpackDevServer = require('webpack-dev-server');

new WebpackDevServer(webpack(config), {
  contentBase: ['./'],
  hot: true,
  compress: false,
  historyApiFallback: true,
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: 300
  },
  stats: {
    modules: false,
    chunks: false,
    colors: true
  }
}).listen(3000, 'localhost', function(err) {
  if (err) {
    return console.log(err);
  }
  console.log(`Listening at http://localhost:3000/`);
});
