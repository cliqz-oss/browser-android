// From https://github.com/webpack/node-libs-browser and https://github.com/parshap/node-libs-react-native
module.exports = {
  extraNodeModules: {
    fs: require.resolve('./_empty'),
    stream: require.resolve('stream-browserify'),
    http: require.resolve('stream-http'),
    https: require.resolve('https-browserify'),
    path: require.resolve('path-browserify'),
    buffer: require.resolve('buffer'),
  },
};
