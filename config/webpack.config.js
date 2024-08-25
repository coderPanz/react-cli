const path = require("path")
const ESLintWebpackPlugin = require("eslint-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin") // 生成html文件，并在script标签中引入打包后的项目入口文件
const MiniCssExtractPlugin = require("mini-css-extract-plugin") // css单独打包
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin") // css压缩
const TerserWepackPlugin = require("terser-webpack-plugin") // js压缩
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin") // img压缩
const CopyWebpackPlugin = require("copy-webpack-plugin") // 将指定目录下的资源复制到指定的打包输出目录
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin")

// 需要通过 cross-env 定义环境变量
const isProduction = process.env.NODE_ENV === "production"

const getCssLoader = pre => {
  return [
    isProduction ? MiniCssExtractPlugin.loader: "style-loader",
    "css-loader",
    {
      loader: "postcss-loader",
      options: {
        postcssOptions: {
          plugins: ["postcss-preset-env"],
        },
      },
    },
    pre,
  ].filter(Boolean)
}
module.exports = {
  // 打包入口
  entry: "./src/main.js",
  output: {
    path: isProduction ? path.resolve(__dirname, "../dist") : undefined,
    filename: "static/js/[name].[contenthash:8].js",
    chunkFilename: "static/js/[name].[contenthash:8].chunk.js",
    assetModuleFilename: "static/media/[name].[hash:10][ext]",
    clean: isProduction ? true : false,
  },
  module: {
    rules: [
      {
        // webpack会对文件遍历所有的loader，即使loader匹配到对应文件。
        // oneof：loader匹配到对应文件后立即结束遍历。
        oneOf: [
          // handle Css loader, postcss 处理兼容性问题，位置：css-loader后，预处理器loader前。
          // 还需搭配package.json中的browserslist进行兼容性适配
          {
            test: /\.css$/,
            use: getCssLoader(),
          },
          {
            test: /\.less$/,
            use: getCssLoader("less-loader"),
          },
          {
            test: /\.s[ac]ss$/,
            use: getCssLoader("sass-loader"),
          },
          {
            test: /\.styl$/,
            use: getCssLoader("stylus-loader"),
          },
          // handle img loader
          // 资源模块：是一种模块类型，它允许使用资源文件（字体，图标等）而无需配置额外 loader。
          {
            test: /\.(png|jpe?g|gif|webp)$/,
            type: "asset",
            parser: {
              // 将小于指定体积的图片转为base64，以减少http请求
              dataUrlCondition: {
                maxSize: 500 * 1024, // 500kb
              },
            },
          },
          {
            test: /\.svg/,
            type: "asset/inline",
          },
          // hanlde otherAsset loader
          {
            test: /\.(ttf|woff2?|map4|map3|avi)$/,
            // 原封不动输出到指定路径
            type: "asset/resource",
          },
          // handle js
          {
            test: /\.jsx?$/,
            include: path.resolve(__dirname, "../src"),
            loader: "babel-loader",
            options: {
              cacheDirectory: true, // 开启babel编译缓存
              cacheCompression: false, // 缓存文件不要压缩
              plugins: [!isProduction && "react-refresh/babel"].filter(Boolean),
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new ESLintWebpackPlugin({
      // 指定检查文件的根目录-不包含目录
      context: path.resolve(__dirname, "../src"),
      exclude: "node_modules",
      // 开启缓存-设置缓存目录
      cache: true,
      cacheLocation: path.resolve(
        __dirname,
        "../node_modules/.cache/.eslintCache"
      ),
    }),

    new HtmlWebpackPlugin({
      // 以 index.html 为模板创建文件
      // 新的html文件有两个特点：1. 内容和源文件一致 2. 自动引入打包生成的js等资源
      template: path.resolve(__dirname, "../src/index.html"),
    }),
    //  CSS 提取到单独的文件中，并进行link导入防止闪屏
    isProduction &&
      new MiniCssExtractPlugin({
        filename: "static/css/[name].[contenthash:8].css",
        chunkFilename: "static/css/[name].chunk.[contenthash:8].css",
      }),
    isProduction && new CssMinimizerPlugin(),
    // 将public下面的资源复制到dist目录去（除了index.html）
    isProduction &&
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, "../src/public"),
            to: path.resolve(__dirname, "../dist"),
            noErrorOnMissing: true, // 不生成错误
            globOptions: {
              // 忽略文件
              ignore: ["**/index.html"],
            },
          },
        ],
      }),
    !isProduction && new ReactRefreshWebpackPlugin(),
  ].filter(Boolean),
  // 代码压缩/打包编译性能优化处理
  optimization: {
    // 代码分割配置
    splitChunks: {
      chunks: "all", // 对所有模块都进行分割
      cacheGroups: {
        // layouts通常是admin项目的主体布局组件，所有路由组件都要使用的
        // 可以单独打包，从而复用，实现按需加载
        layouts: {
          name: "layouts",
          test: path.resolve(__dirname, "../src/layouts"),
          priority: 40,
        },
        // 如果项目中使用antd，此时将所有node_modules打包在一起，那么打包输出文件会比较大。
        // 所以我们将node_modules中比较大的模块单独打包，从而并行加载速度更好
        antd: {
          name: "chunk-antd",
          test: /[\\/]node_modules[\\/]antd(.*)/,
          priority: 30,
        },
        // 将react相关的库单独打包，减少node_modules的chunk体积。
        react: {
          name: "react",
          test: /[\\/]node_modules[\\/]react(.*)?[\\/]/,
          chunks: "initial",
          priority: 20,
        },
        libs: {
          name: "chunk-libs",
          test: /[\\/]node_modules[\\/]/,
          priority: 10, // 权重最低，优先考虑前面内容
          chunks: "initial",
        },
      },
    },
    // 提取runtime文件：文件hash和文件的映射实现缓存
    runtimeChunk: {
      name: entrypoint => `runtime-${entrypoint.name}`, // runtime文件命名规则
    },
    // 是否需要进行压缩，minimize为true时就会执行minimizer。
    minimize: isProduction,
    minimizer: [
      // css压缩也可以写到optimization.minimizer里面，效果一样的
      new CssMinimizerPlugin(),
      // 当生产模式会默认开启TerserPlugin，如果需要进行额外配置，就要重新写了
      new TerserWepackPlugin(),
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminGenerate,
          options: {
            plugins: [
              ["gifsicle", { interlaced: true }],
              ["jpegtran", { progressive: true }],
              ["optipng", { optimizationLevel: 5 }],
              [
                "svgo",
                {
                  plugins: [
                    "preset-default",
                    "prefixIds",
                    {
                      name: "sortAttrs",
                      params: {
                        xmlnsOrder: "alphabetical",
                      },
                    },
                  ],
                },
              ],
            ],
          },
        },
      }),
    ],
  },
  resolve: {
    extensions: [".jsx", ".js", ".json"], // 自动补全文件扩展名，让jsx可以使用
  },
  devtool: isProduction ? "source-map" : "cheap-module-source-map",
  mode: isProduction ? "production" : "development",
  // 运行指令控制，生产模式没有添加对应指令，所以这里不需要做判断。
  devServer: {
    host: "localhost", // 启动服务器域名
    port: "3000", // 启动服务器端口号
    open: true, // 是否自动打开浏览器
    hot: true, // 开启热模块替换
    historyApiFallback: true, // 解决react-router刷新404问题
  },
  performance: false, // 关闭性能分析，提升打包速度
}
