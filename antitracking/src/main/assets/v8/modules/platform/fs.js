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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZzLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBRUEsV0FBUyxXQUFXLENBQUMsUUFBUSxFQUFFO0FBQzdCLFFBQUssT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFHO0FBQ2xDLGNBQVEsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3ZCO0FBQ0QsV0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0dBQzNCOztBQUVNLFdBQVMsUUFBUSxDQUFDLFFBQVEsRUFBRTtBQUNqQyxXQUFPLElBQUksT0FBTyxDQUFFLFVBQUMsT0FBTyxFQUFFLE1BQU0sRUFBSztBQUN2QyxvQkFBYyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxVQUFDLElBQUksRUFBSztBQUM5QyxZQUFJLENBQUMsSUFBSSxFQUFFO0FBQ1QsZ0JBQU0sRUFBRSxDQUFDO1NBQ1YsTUFBTTtBQUNMLGlCQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDZjtPQUNGLENBQUMsQ0FBQztLQUNKLENBQUMsQ0FBQztHQUNKOztBQUVNLFdBQVMsU0FBUyxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUU7QUFDeEMsUUFBSyxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUU7QUFDN0IsVUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDN0I7QUFDRCxtQkFBZSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QyxXQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztHQUMxQjs7QUFFTSxXQUFTLEtBQUssQ0FBQyxPQUFPLEVBQUU7QUFDN0IsYUFBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLFdBQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0dBQzFCOzs7O3lCQWhDUSxLQUFLIiwiZmlsZSI6ImZzLmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICdjb3JlL2NsaXF6JztcblxuZnVuY3Rpb24gZ2V0RnVsbFBhdGgoZmlsZVBhdGgpIHtcbiAgaWYgKCB0eXBlb2YgZmlsZVBhdGggPT09ICdzdHJpbmcnICkge1xuICAgIGZpbGVQYXRoID0gW2ZpbGVQYXRoXTtcbiAgfVxuICByZXR1cm4gZmlsZVBhdGguam9pbignLycpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZEZpbGUoZmlsZVBhdGgpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKCAocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgcmVhZEZpbGVOYXRpdmUoZ2V0RnVsbFBhdGgoZmlsZVBhdGgpLCAoZGF0YSkgPT4ge1xuICAgICAgaWYgKCFkYXRhKSB7XG4gICAgICAgIHJlamVjdCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3cml0ZUZpbGUoZmlsZVBhdGgsIGRhdGEpIHtcbiAgaWYgKCB0eXBlb2YgZGF0YSAhPT0gJ3N0cmluZycpIHtcbiAgICBkYXRhID0gSlNPTi5zdHJpbmdpZnkoZGF0YSk7XG4gIH1cbiAgd3JpdGVGaWxlTmF0aXZlKGdldEZ1bGxQYXRoKGZpbGVQYXRoKSwgZGF0YSk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1rZGlyKGRpclBhdGgpIHtcbiAgbWtUZW1wRGlyKGdldEZ1bGxQYXRoKGRpclBhdGgpKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xufVxuIl19