module.exports = {
  title: 'ELS Validate Content Ingestion Document',
  components: '../module/**/*.js',
  ignore: [
    '**/**/*.spec.js',
    '**/**/*View.js',
    '**/**/common/*.js',
    '**/**/services/*.js',
    '**/**/module/index.js',
    '**/**/module/constants.js'
  ],
  template: '../demo/demo.view.html',
  styleguideDir: '../dist/docs/styleguide',
  getComponentPathLine() {
    return ``;
  },
  webpackConfig: {
    devtool: 'inline-source-map',
    module: {
      rules: [
        // Babel loader, will use your project’s .babelrc
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          loader: 'babel-loader'
        },
        // Other loaders that are needed for building components and examples
        {
          test: /\.(css|scss)$/,
          use: ['style-loader', 'css-loader', 'sass-loader']
        },
        {
          test: /\.(png|jpe?g|gif|eot|ttf|woff|woff2)$/,
          use: ['file-loader?limit=1000&name=files/[md5:hash:base64:10].[ext]']
        },
        {
          test: /\.svg$/,
          use: ['svg-sprite-loader', 'svgo-loader']
        }
      ]
    }
  }
};
