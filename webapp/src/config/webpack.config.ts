module.exports = (env: { NODE_ENV: string; }) => {
    return require('./webpack.' + env.NODE_ENV + '.ts');
};
