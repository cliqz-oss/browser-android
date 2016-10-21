System.register('antitracking/temp-set', ['core/cliqz'], function (_export) {

  /** Set like class whose members are removed after a specifie
  */
  'use strict';

  var utils, _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);

          this._items = new Set();
          this._timeouts = new Set();
        }

        _createClass(_default, [{
          key: 'contains',
          value: function contains(item) {
            return this._items.has(item);
          }
        }, {
          key: 'has',
          value: function has(item) {
            return this.contains(item);
          }
        }, {
          key: 'add',
          value: function add(item, ttl) {
            this._items.add(item);
            var timeout = utils.setTimeout((function () {
              this['delete'](item);
              this._timeouts['delete'](timeout);
            }).bind(this), ttl || 0);
            this._timeouts.add(timeout);
          }
        }, {
          key: 'delete',
          value: function _delete(item) {
            this._items['delete'](item);
          }
        }, {
          key: 'clear',
          value: function clear() {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = this._timeouts[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var t = _step.value;

                utils.clearTimeout(t);
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            this._timeouts.clear();
            this._items.clear();
          }
        }]);

        return _default;
      })();

      _export('default', _default);

      ;
    }
  };
});