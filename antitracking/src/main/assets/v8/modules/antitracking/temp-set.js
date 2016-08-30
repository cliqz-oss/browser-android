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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy90ZW1wLXNldC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozt5QkFBUyxLQUFLOzs7O0FBTUQsNEJBQUc7OztBQUNaLGNBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztBQUN4QixjQUFJLENBQUMsU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7U0FDNUI7Ozs7aUJBRU8sa0JBQUMsSUFBSSxFQUFFO0FBQ2IsbUJBQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7V0FDOUI7OztpQkFFRSxhQUFDLElBQUksRUFBRTtBQUNSLG1CQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7V0FDNUI7OztpQkFFRSxhQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7QUFDYixnQkFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDdEIsZ0JBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQSxZQUFXO0FBQ3RDLGtCQUFJLFVBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsQixrQkFBSSxDQUFDLFNBQVMsVUFBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ2xDLENBQUEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3hCLGdCQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztXQUM3Qjs7O2lCQUVLLGlCQUFDLElBQUksRUFBRTtBQUNYLGdCQUFJLENBQUMsTUFBTSxVQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7V0FDMUI7OztpQkFFSSxpQkFBRzs7Ozs7O0FBQ04sbUNBQWMsSUFBSSxDQUFDLFNBQVMsOEhBQUU7b0JBQXJCLENBQUM7O0FBQ1IscUJBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7ZUFDdkI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDRCxnQkFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN2QixnQkFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztXQUNyQjs7Ozs7Ozs7QUFFRixPQUFDIiwiZmlsZSI6ImFudGl0cmFja2luZy90ZW1wLXNldC5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5cbi8qKiBTZXQgbGlrZSBjbGFzcyB3aG9zZSBtZW1iZXJzIGFyZSByZW1vdmVkIGFmdGVyIGEgc3BlY2lmaWVcbiovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5faXRlbXMgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5fdGltZW91dHMgPSBuZXcgU2V0KCk7XG4gIH1cblxuICBjb250YWlucyhpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuX2l0ZW1zLmhhcyhpdGVtKTtcbiAgfVxuXG4gIGhhcyhpdGVtKSB7XG4gICAgcmV0dXJuIHRoaXMuY29udGFpbnMoaXRlbSk7XG4gIH1cblxuICBhZGQoaXRlbSwgdHRsKSB7XG4gICAgdGhpcy5faXRlbXMuYWRkKGl0ZW0pO1xuICAgIHZhciB0aW1lb3V0ID0gdXRpbHMuc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgdGhpcy5kZWxldGUoaXRlbSk7XG4gICAgICAgIHRoaXMuX3RpbWVvdXRzLmRlbGV0ZSh0aW1lb3V0KTtcbiAgICB9LmJpbmQodGhpcyksIHR0bCB8fCAwKTtcbiAgICB0aGlzLl90aW1lb3V0cy5hZGQodGltZW91dCk7XG4gIH1cblxuICBkZWxldGUoaXRlbSkge1xuICAgIHRoaXMuX2l0ZW1zLmRlbGV0ZShpdGVtKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIGZvciAobGV0IHQgb2YgdGhpcy5fdGltZW91dHMpIHtcbiAgICAgIHV0aWxzLmNsZWFyVGltZW91dCh0KTtcbiAgICB9XG4gICAgdGhpcy5fdGltZW91dHMuY2xlYXIoKTtcbiAgICB0aGlzLl9pdGVtcy5jbGVhcigpO1xuICB9XG5cbn07XG4iXX0=