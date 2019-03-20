const webpack = require('webpack'),
  path = require('path'),
  HtmlWebpackPlugin = require('html-webpack-plugin'),
  CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const nodeEnv = process.env.NODE_ENV || 'development';

module.exports = {
  devtool: 'inline-source-map',
  output: {
    path: path.join(__dirname, './dist'),
    publicPath: './',
    filename: '[name].js',
    chunkFilename: '[name].js'
  },
  resolve: {
    extensions: ['.js', '.scss', '.css'],
    modules: [path.resolve(__dirname, '../node_modules'), path.join(__dirname, './module')]
  },
  entry: {
    uiSecurity: [
      'react-hot-loader/patch',
      `webpack-dev-server/client?http://localhost:3000`,
      'webpack/hot/only-dev-server',
      './demo/index.js'
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NamedModulesPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
    new CaseSensitivePathsPlugin(),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor'
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(nodeEnv)
      }
    }),
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: './demo/demo.view.html',
      hash: true,
      chunks: ['vendor', 'uiSecurity'],
      minify: {
        removeComments: true,
        collapseWhitespace: false
      }
    })
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: 'babel-loader'
      },
      {
        test: /\.html$/,
        use: 'html-loader?attrs=img:src img:data-src'
      },
      {
        test: /\.(png|jpe?g|gif|eot|ttf|woff|woff2)$/,
        use: ['file-loader?limit=1000&name=files/[md5:hash:base64:10].[ext]']
      },
      {
        test: /\.svg$/,
        use: ['svg-sprite-loader', 'svgo-loader']
      },
      {
        test: /\.(css|scss)$/,
        use: ['style-loader', 'css-loader', 'sass-loader']
      }
    ]
  }
};
