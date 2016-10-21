System.register('platform/fs', ['core/cliqz'], function (_export) {
  'use strict';

  var utils;

  _export('readFile', readFile);

  _export('writeFile', writeFile);

  _export('mkdir', mkdir);

  function getFullPath(filePath) {
    if (typeof filePath === 'string') {
      filePath = [filePath];
    }
    return filePath.join('/');
  }

  function readFile(filePath) {
    return new Promise(function (resolve, reject) {
      readFileNative(getFullPath(filePath), function (data) {
        if (!data) {
          reject();
        } else {
          resolve(data);
        }
      });
    });
  }

  function writeFile(filePath, data) {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    writeFileNative(getFullPath(filePath), data);
    return Promise.resolve();
  }

  function mkdir(dirPath) {
    mkTempDir(getFullPath(dirPath));
    return Promise.resolve();
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {}
  };
});