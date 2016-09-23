System.register('autocomplete/smart-cliqz-cache/rich-header', ['core/cliqz', 'autocomplete/result'], function (_export) {
  'use strict';

  var utils, Result;

  _export('getSmartCliqz', getSmartCliqz);

  function getSmartCliqz(url) {
    var _this = this;

    utils.log('getSmartCliqz: start fetching for ' + url);

    return new Promise(function (resolve, reject) {
      var endpointUrl = 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=' + url;

      utils.httpGet(endpointUrl, (function success(req) {
        try {
          var smartCliqzData = JSON.parse(req.response).results[0];
          var smartCliqzExists = typeof smartCliqzData !== 'undefined';
          var smartCliqz = undefined;

          if (!smartCliqzExists) {
            reject({
              type: 'URL_NOT_FOUND',
              message: url + ' not found on server'
            });
          } else {
            smartCliqz = Result.cliqzExtra(smartCliqzData);
            utils.log('getSmartCliqz: done fetching for ' + url);
            resolve(smartCliqz);
          }
        } catch (e) {
          reject({
            type: 'UNKNOWN_ERROR',
            message: e
          });
        }
      }).bind(_this), function error() {
        reject({
          type: 'HTTP_REQUEST_ERROR',
          message: ''
        });
      });
    });
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_autocompleteResult) {
      Result = _autocompleteResult['default'];
    }],
    execute: function () {}
  };
});