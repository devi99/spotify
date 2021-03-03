import path from 'path';
import Dotenv from 'dotenv-webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import copyWebpackPlugin from 'copy-webpack-plugin';
import webpack from 'webpack';

const ENV = process.argv.find((arg) => arg.includes('production')) ? 'production' : 'development';
const OUTPUT_PATH = ENV === 'production' ? path.resolve('dist') : path.resolve('src');
const webcomponentsjs = './src/node_modules/@webcomponents/webcomponentsjs';

const config: webpack.Configuration = {
    target: 'web',
    mode: 'development',
    entry: ['babel-polyfill', path.resolve(__dirname, '../index.ts')],
    devtool: 'eval-source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
    },
    plugins: [
        new Dotenv({
            path: './src/config/.env-dev',
        }),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            hash: true,
            chunksSortMode: 'auto',
            title: 'Edu',
            template: './src/indexTemplate.html',
            filename: './index.html',
        }),
        new copyWebpackPlugin({
            patterns: [
                { from: './src/assets/favicon.png', to: '' },
                {
                  to({ context, absoluteFilename }) {
                    return `scripts/${path.relative(context, absoluteFilename)}`;
                  },
                  from: "./src/scripts",
                },
                {
                  to({ context, absoluteFilename }) {
                    return `css/${path.relative(context, absoluteFilename)}`;
                  },
                  from: "./src/assets/css",
                },          
                {
                  to({ context, absoluteFilename }) {
                    return `img/${path.relative(context, absoluteFilename)}`;
                  },
                  from: "./src/assets/img",
                },    
                {
                  to({ context, absoluteFilename }) {
                    return `Views/${path.relative(context, absoluteFilename)}`;
                  },
                  from: "./src/views",
                },                                                
            ],
        }),
        // new copyWebpackPlugin({
        //     patterns: [
        //         { from: './src/assets/img/*', to: './img', flatten: true },
        //         { from: './src/assets/img/uiux', to: './img/uiux', flatten: true },
        //         { from: './src/assets/css/*', to: './css', flatten: true },
        //         { from: './src/assets/favicon.png', to: '' },
        //     ],
        // }),
    ],
    output: {
        path: path.resolve(__dirname, '../../dist'),
        publicPath: '/', // belangrijk voor het lazy loading van de enrollment stappen (ie personalInfo.js enzo)
        filename: '[name].[hash].bundle.js',
    },
    // node: {
    //     fs: 'empty',
    // },
    module: {
        rules: [
            // {
            //     test: /\.m?js$/,
            //     exclude: /(node_modules|bower_components)/,
            //     use: {
            //         loader: 'babel-loader',
            //         options: {
            //             presets: ['@babel/preset-env'],
            //             plugins: [
            //                 '@babel/plugin-syntax-dynamic-import',
            //                 '@babel/plugin-proposal-class-properties',
            //                 ['@babel/plugin-proposal-decorators', { decoratorsBeforeExport: true }],
            //             ],
            //         },
            //     },
            // },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader', '@teamsupercell/typings-for-css-modules-loader?modules'],
            },
            { 
                test: /\.scss$/, 
                use: '@teamsupercell/typings-for-css-modules?modules&sass' },
            {
                test: /\.ts?$/,
                use: [{ loader: 'babel-loader' }, { loader: 'ts-loader' }],
                exclude: /node_modules/,
            },
            {
                test: /\.xs?$/,
                use: 'ignore-loader',
                exclude: /node_modules/,
            },
        ],
    },
};

export default config;
