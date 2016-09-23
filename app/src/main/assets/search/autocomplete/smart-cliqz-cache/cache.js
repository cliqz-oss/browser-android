System.register('autocomplete/smart-cliqz-cache/cache', ['core/cliqz', 'core/fs'], function (_export) {

  /**
  * this simple cache is a dictionary that addionally stores
  * timestamps for each entry; life is time in seconds before
  * entries are marked stale (if life is not specified entries
  * are good forever); going stale has no immediate consequences
  * @namespace smart-cliqz-cache
  */
  'use strict';

  var utils, readFile, writeFile, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreFs) {
      readFile = _coreFs.readFile;
      writeFile = _coreFs.writeFile;
    }],
    execute: function () {
      _default = (function () {
        /**
        * @class Cache
        * @constructor
        */

        function _default(life) {
          _classCallCheck(this, _default);

          this._cache = {};
          this._life = life ? life * 1000 : false;
        }

        /**
        * stores entry only if it is newer than current entry,
        * current time is used if time is not specified
        * @method store
        * @param key {string}
        * @param value {string}
        * @param time {timestamp}
        */

        _createClass(_default, [{
          key: 'store',
          value: function store(key, value, time) {
            time = time || Date.now();

            if (this.isNew(key, value, time)) {
              this._cache[key] = {
                time: time,
                value: value
              };
            }
          }

          /**
          * deletes entry
          * @method delete
          * @param key {string}
          */
        }, {
          key: 'delete',
          value: function _delete(key) {
            if (this.isCached(key)) {
              delete this._cache[key];
            }
          }

          /**
          * returns cached entry or false if no entry exists for key
          * @method retrieve
          * @param key {string}
          */
        }, {
          key: 'retrieve',
          value: function retrieve(key) {
            if (!this.isCached(key)) {
              return false;
            }
            return this._cache[key].value;
          }

          /**
          * @method isCached
          * @param key {string}
          */
        }, {
          key: 'isCached',
          value: function isCached(key) {
            return this._cache.hasOwnProperty(key);
          }

          /**
          * @method isNew
          * @param key {string}
          * @param value {string}
          * @param time {timestamp}
          * @returns true if there is no newer entry already cached for key
          */
        }, {
          key: 'isNew',
          value: function isNew(key, value, time) {
            return !this.isCached(key) || time > this._cache[key].time;
          }

          /** an entry is stale if it is not cached or has expired
          * (an entry can only expire if life is specified); this
          * has no immediate consequences, but can be used from
          * outside to decide if this entry should be updated
          * @method isStale
          * @param key {string}
          */
        }, {
          key: 'isStale',
          value: function isStale(key) {
            return !this.isCached(key) || this._life && Date.now() - this._cache[key].time > this._life;
          }

          /**
          * updates time without replacing the entry
          * @method refresh
          * @param key {string}
          * @param time {timestamp}
          */
        }, {
          key: 'refresh',
          value: function refresh(key, time) {
            time = time || Date.now();

            if (this.isCached(key)) {
              this._cache[key].time = time;
            }
          }

          /**
          * save cache to file
          * @method save
          * @param filename {string}
          */
        }, {
          key: 'save',
          value: function save(filename) {
            var _this = this;

            var content = new TextEncoder().encode(JSON.stringify(this._cache));
            writeFile(filename, content).then(function () {
              _this.log('save: saved to ' + filename);
            })['catch'](function (e) {
              _this.log('save: failed saving: ' + e);
            });
          }

          /**
          * load cache from file
          * @method load
          * @param filename {string}
          */
        }, {
          key: 'load',
          value: function load(filename) {
            var _this2 = this;

            readFile(filename).then(function (data) {
              _this2._cache = JSON.parse(new TextDecoder().decode(data));
              _this2.log('load: loaded from: ' + filename);
            })['catch'](function (e) {
              _this2.log('load: failed loading: ' + e);
            });
          }
        }, {
          key: 'log',
          value: function log(msg) {
            utils.log(msg, 'Cache');
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});