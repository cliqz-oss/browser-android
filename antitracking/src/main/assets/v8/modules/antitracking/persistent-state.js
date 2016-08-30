System.register("antitracking/persistent-state", ["core/cliqz", "antitracking/pacemaker", "platform/antitracking/storage"], function (_export) {
  "use strict";

  var utils, pacemaker, sto, LOG_KEY, PersistenceHandler, LazyPersistentObject, PersistentObject, AutoPersistentObject;

  var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  _export("create_persistent", create_persistent);

  _export("clear_persistent", clear_persistent);

  _export("getValue", getValue);

  _export("setValue", setValue);

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  /** Load data from the attrack sqlite table.
      From CliqzAttrack.loadRecord
   */
  function loadRecord(id, callback) {
    sto.getItem('cliqz.dbattrack.' + id).then(callback);
  }

  /** Save data to the attrack sqlite table.
      From CliqzAttrack.saveRecord
   */
  function saveRecord(id, data) {
    sto.setItem('cliqz.dbattrack.' + id, data);
  }
  function create_persistent(name, setter) {
    loadRecord(name, function (value) {
      var obj = {},
          dirty = false;
      try {
        obj = JSON.parse(value || "{}");
      } catch (e) {
        obj = {};
        dirty = true;
      }
      setter(new Proxy(obj, new PersistenceHandler(name, obj, dirty)));
    });
  }

  function clear_persistent(value) {
    for (var k in value) {
      delete value[k];
    }
  }

  function getValue(key, default_value) {
    var val = utils.getPref("attrack." + key, default_value);
    return val;
  }

  function setValue(key, value) {
    utils.setPref("attrack." + key, value);
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_antitrackingPacemaker) {
      pacemaker = _antitrackingPacemaker["default"];
    }, function (_platformAntitrackingStorage) {
      sto = _platformAntitrackingStorage["default"];
    }],
    execute: function () {
      LOG_KEY = "attrack-persist";
      ;;

      PersistenceHandler = (function () {
        function PersistenceHandler(name, target, dirty) {
          _classCallCheck(this, PersistenceHandler);

          this.name = name;
          this.target = target;
          this.dirty = dirty || false;
          // write dirty pages every minute
          pacemaker.register(this.persistState.bind(this), 60000, this.isDirty.bind(this));

          // propegate proxy down object leaves
          for (var k in this.target) {
            this.target[k] = this.proxyBranch(this.target[k]);
          }

          // trap for set operations
          this.set = function (target, property, value, receiver) {
            // propegate proxy down object tree
            target[property] = this.proxyBranch(value);
            this.dirty = true;
            return true;
          };
          // trap for delete operations
          this.deleteProperty = function (target, property) {
            delete target[property];
            this.dirty = true;
            return true;
          };
        }

        _createClass(PersistenceHandler, [{
          key: "persistState",
          value: function persistState() {
            if (this.dirty) {
              saveRecord(this.name, JSON.stringify(this.target));
              this.dirty = false;
            }
          }
        }, {
          key: "proxyBranch",
          value: function proxyBranch(obj) {
            if (typeof obj === 'object') {
              for (var k in obj) {
                obj[k] = this.proxyBranch(obj[k]);
              }
              return new Proxy(obj, this);
            } else {
              return obj;
            }
          }
        }, {
          key: "isDirty",
          value: function isDirty() {
            return this.dirty;
          }
        }]);

        return PersistenceHandler;
      })();

      ;

      ;

      ;

      ;

      ;

      _export("loadRecord", loadRecord);

      _export("saveRecord", saveRecord);

      LazyPersistentObject = (function () {
        function LazyPersistentObject(name) {
          _classCallCheck(this, LazyPersistentObject);

          this.name = name;
          this.value = {};
          this.dirty = false;
        }

        _createClass(LazyPersistentObject, [{
          key: "load",
          value: function load() {
            return new Promise((function (resolve, reject) {
              loadRecord(this.name, (function (value) {
                try {
                  this.value = JSON.parse(value || '{}');
                } catch (e) {
                  this.value = {};
                  this.dirty = true;
                }
                resolve(this.value);
              }).bind(this));
            }).bind(this));
          }
        }, {
          key: "save",
          value: function save() {
            if (this.dirty) {
              saveRecord(this.name, JSON.stringify(this.value));
              this.dirty = false;
            }
          }
        }, {
          key: "setValue",
          value: function setValue(v) {
            this.value = v;
            this.dirty = true;
            this.save();
          }
        }, {
          key: "setDirty",
          value: function setDirty() {
            this.dirty = true;
          }
        }, {
          key: "isDirty",
          value: function isDirty() {
            return this.dirty;
          }
        }, {
          key: "clear",
          value: function clear() {
            this.value = {};
            this.dirty = true;
            this.save();
          }
        }]);

        return LazyPersistentObject;
      })();

      _export("LazyPersistentObject", LazyPersistentObject);

      PersistentObject = (function () {
        function PersistentObject(name, setter) {
          _classCallCheck(this, PersistentObject);

          this.name = name;
          this.value = {};
          this.dirty = false;
          this.setter = setter;
          this.setter(this.value);
          this.load();
        }

        _createClass(PersistentObject, [{
          key: "load",
          value: function load() {
            loadRecord(this.name, (function (value) {
              try {
                this.value = JSON.parse(value || '{}');
              } catch (e) {
                this.value = {};
                this.dirty = true;
              }
              this.setter(this.value);
            }).bind(this));
          }
        }, {
          key: "setValue",
          value: function setValue(v) {
            this.value = v;
            this.dirty = true;
            this.setter(v);
            this.save();
          }
        }, {
          key: "save",
          value: function save() {
            if (this.dirty) {
              saveRecord(this.name, JSON.stringify(this.value));
              this.dirty = false;
            }
          }
        }, {
          key: "setDirty",
          value: function setDirty() {
            this.dirty = true;
          }
        }, {
          key: "isDirty",
          value: function isDirty() {
            return this.dirty;
          }
        }, {
          key: "clear",
          value: function clear() {
            this.value = {};
            this.dirty = true;
            this.save();
            this.setter(this.value);
          }
        }]);

        return PersistentObject;
      })();

      _export("PersistentObject", PersistentObject);

      ;

      AutoPersistentObject = (function (_PersistentObject) {
        _inherits(AutoPersistentObject, _PersistentObject);

        function AutoPersistentObject(name, setter, saveInterval) {
          _classCallCheck(this, AutoPersistentObject);

          _get(Object.getPrototypeOf(AutoPersistentObject.prototype), "constructor", this).call(this, name, setter);
          pacemaker.register(this.save.bind(this), saveInterval, this.isDirty.bind(this));
        }

        return AutoPersistentObject;
      })(PersistentObject);

      _export("AutoPersistentObject", AutoPersistentObject);

      ;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs2QkFJTSxPQUFPLEVBZ0JQLGtCQUFrQixFQWtGWCxvQkFBb0IsRUFrRHBCLGdCQUFnQixFQXNEaEIsb0JBQW9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFyTWpDLFdBQVMsVUFBVSxDQUFDLEVBQUUsRUFBRSxRQUFRLEVBQUU7QUFDaEMsT0FBRyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUUsUUFBUSxDQUFFLENBQUM7R0FDdkQ7Ozs7O0FBS0QsV0FBUyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRTtBQUM1QixPQUFHLENBQUMsT0FBTyxDQUFDLGtCQUFrQixHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztHQUM1QztBQXFETSxXQUFTLGlCQUFpQixDQUFDLElBQUksRUFBRSxNQUFNLEVBQUU7QUFDOUMsY0FBVSxDQUFDLElBQUksRUFBRSxVQUFTLEtBQUssRUFBRTtBQUMvQixVQUFJLEdBQUcsR0FBRyxFQUFFO1VBQ1IsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUNsQixVQUFJO0FBQ0YsV0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxDQUFDO09BQ2pDLENBQUMsT0FBTSxDQUFDLEVBQUU7QUFDVCxXQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ1QsYUFBSyxHQUFHLElBQUksQ0FBQztPQUNkO0FBQ0QsWUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ2xFLENBQUMsQ0FBQztHQUNKOztBQUVNLFdBQVMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFO0FBQ3RDLFNBQUssSUFBSSxDQUFDLElBQUksS0FBSyxFQUFFO0FBQ25CLGFBQU8s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QUd2QixJQUFJLEVBQUUsTUFBTSxFQUFFO0FBQ3BCLG1CQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1NBQ2pGOztlQUxVLG9CQUFvQjtTQUFTLGdCQUFnQjs7OztBQU96RCxPQUFDIiwiZmlsZSI6ImFudGl0cmFja2luZy9wZXJzaXN0ZW50LXN0YXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCBwYWNlbWFrZXIgZnJvbSBcImFudGl0cmFja2luZy9wYWNlbWFrZXJcIjtcbmltcG9ydCBzdG8gZnJvbSBcInBsYXRmb3JtL2FudGl0cmFja2luZy9zdG9yYWdlXCI7XG5cbmNvbnN0IExPR19LRVkgPSBcImF0dHJhY2stcGVyc2lzdFwiO1xuXG4vKiogTG9hZCBkYXRhIGZyb20gdGhlIGF0dHJhY2sgc3FsaXRlIHRhYmxlLlxuICAgIEZyb20gQ2xpcXpBdHRyYWNrLmxvYWRSZWNvcmRcbiAqL1xuZnVuY3Rpb24gbG9hZFJlY29yZChpZCwgY2FsbGJhY2spIHtcbiAgc3RvLmdldEl0ZW0oJ2NsaXF6LmRiYXR0cmFjay4nICsgaWQpLnRoZW4oIGNhbGxiYWNrICk7XG59O1xuXG4vKiogU2F2ZSBkYXRhIHRvIHRoZSBhdHRyYWNrIHNxbGl0ZSB0YWJsZS5cbiAgICBGcm9tIENsaXF6QXR0cmFjay5zYXZlUmVjb3JkXG4gKi9cbmZ1bmN0aW9uIHNhdmVSZWNvcmQoaWQsIGRhdGEpIHtcbiAgc3RvLnNldEl0ZW0oJ2NsaXF6LmRiYXR0cmFjay4nICsgaWQsIGRhdGEpO1xufTtcblxuY2xhc3MgUGVyc2lzdGVuY2VIYW5kbGVyIHtcbiAgY29uc3RydWN0b3IobmFtZSwgdGFyZ2V0LCBkaXJ0eSkge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG4gICAgdGhpcy5kaXJ0eSA9IGRpcnR5IHx8IGZhbHNlO1xuICAgIC8vIHdyaXRlIGRpcnR5IHBhZ2VzIGV2ZXJ5IG1pbnV0ZVxuICAgIHBhY2VtYWtlci5yZWdpc3Rlcih0aGlzLnBlcnNpc3RTdGF0ZS5iaW5kKHRoaXMpLCA2MDAwMCwgdGhpcy5pc0RpcnR5LmJpbmQodGhpcykpO1xuXG4gICAgLy8gcHJvcGVnYXRlIHByb3h5IGRvd24gb2JqZWN0IGxlYXZlc1xuICAgIGZvciAobGV0IGsgaW4gdGhpcy50YXJnZXQpIHtcbiAgICAgIHRoaXMudGFyZ2V0W2tdID0gdGhpcy5wcm94eUJyYW5jaCh0aGlzLnRhcmdldFtrXSk7XG4gICAgfVxuXG4gICAgLy8gdHJhcCBmb3Igc2V0IG9wZXJhdGlvbnNcbiAgICB0aGlzLnNldCA9IGZ1bmN0aW9uKHRhcmdldCwgcHJvcGVydHksIHZhbHVlLCByZWNlaXZlcikge1xuICAgICAgLy8gcHJvcGVnYXRlIHByb3h5IGRvd24gb2JqZWN0IHRyZWVcbiAgICAgIHRhcmdldFtwcm9wZXJ0eV0gPSB0aGlzLnByb3h5QnJhbmNoKHZhbHVlKTtcbiAgICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgICAvLyB0cmFwIGZvciBkZWxldGUgb3BlcmF0aW9uc1xuICAgIHRoaXMuZGVsZXRlUHJvcGVydHkgPSBmdW5jdGlvbih0YXJnZXQsIHByb3BlcnR5KSB7XG4gICAgICBkZWxldGUgdGFyZ2V0W3Byb3BlcnR5XTtcbiAgICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbiAgfVxuXG4gIHBlcnNpc3RTdGF0ZSgpIHtcbiAgICBpZiAodGhpcy5kaXJ0eSkge1xuICAgICAgc2F2ZVJlY29yZCh0aGlzLm5hbWUsIEpTT04uc3RyaW5naWZ5KHRoaXMudGFyZ2V0KSk7XG4gICAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJveHlCcmFuY2gob2JqKSB7XG4gICAgaWYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnKSB7XG4gICAgICBmb3IgKGxldCBrIGluIG9iaikge1xuICAgICAgICBvYmpba10gPSB0aGlzLnByb3h5QnJhbmNoKG9ialtrXSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IFByb3h5KG9iaiwgdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICB9XG5cbiAgaXNEaXJ0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXJ0eTtcbiAgfVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZV9wZXJzaXN0ZW50KG5hbWUsIHNldHRlcikge1xuICBsb2FkUmVjb3JkKG5hbWUsIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgdmFyIG9iaiA9IHt9LFxuICAgICAgICBkaXJ0eSA9IGZhbHNlO1xuICAgIHRyeSB7XG4gICAgICBvYmogPSBKU09OLnBhcnNlKHZhbHVlIHx8IFwie31cIik7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICBvYmogPSB7fTtcbiAgICAgIGRpcnR5ID0gdHJ1ZTtcbiAgICB9XG4gICAgc2V0dGVyKG5ldyBQcm94eShvYmosIG5ldyBQZXJzaXN0ZW5jZUhhbmRsZXIobmFtZSwgb2JqLCBkaXJ0eSkpKTtcbiAgfSk7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJfcGVyc2lzdGVudCh2YWx1ZSkge1xuICBmb3IgKGxldCBrIGluIHZhbHVlKSB7XG4gICAgZGVsZXRlIHZhbHVlW2tdO1xuICB9XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VmFsdWUoa2V5LCBkZWZhdWx0X3ZhbHVlKSB7XG4gIGxldCB2YWwgPSB1dGlscy5nZXRQcmVmKFwiYXR0cmFjay5cIiArIGtleSwgZGVmYXVsdF92YWx1ZSk7XG4gIHJldHVybiB2YWw7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0VmFsdWUoa2V5LCB2YWx1ZSkge1xuICB1dGlscy5zZXRQcmVmKFwiYXR0cmFjay5cIiArIGtleSwgdmFsdWUpO1xufTtcblxuZXhwb3J0IHsgbG9hZFJlY29yZCwgc2F2ZVJlY29yZCB9O1xuXG5leHBvcnQgY2xhc3MgTGF6eVBlcnNpc3RlbnRPYmplY3Qge1xuXG4gIGNvbnN0cnVjdG9yKG5hbWUpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMudmFsdWUgPSB7fTtcbiAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gIH1cblxuICBsb2FkKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGxvYWRSZWNvcmQodGhpcy5uYW1lLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRoaXMudmFsdWUgPSBKU09OLnBhcnNlKHZhbHVlIHx8ICd7fScpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICB0aGlzLnZhbHVlID0ge307XG4gICAgICAgICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmVzb2x2ZSh0aGlzLnZhbHVlKTtcbiAgICAgIH0uYmluZCh0aGlzKSk7XG4gICAgfS5iaW5kKHRoaXMpKTtcbiAgfVxuXG4gIHNhdmUoKSB7XG4gICAgaWYgKHRoaXMuZGlydHkpIHtcbiAgICAgIHNhdmVSZWNvcmQodGhpcy5uYW1lLCBKU09OLnN0cmluZ2lmeSh0aGlzLnZhbHVlKSk7XG4gICAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgc2V0VmFsdWUodikge1xuICAgIHRoaXMudmFsdWUgPSB2O1xuICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG5cbiAgc2V0RGlydHkoKSB7XG4gICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gIH1cblxuICBpc0RpcnR5KCkge1xuICAgIHJldHVybiB0aGlzLmRpcnR5O1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy52YWx1ZSA9IHt9O1xuICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICAgIHRoaXMuc2F2ZSgpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBQZXJzaXN0ZW50T2JqZWN0IHtcblxuICBjb25zdHJ1Y3RvcihuYW1lLCBzZXR0ZXIpIHtcbiAgICB0aGlzLm5hbWUgPSBuYW1lO1xuICAgIHRoaXMudmFsdWUgPSB7fTtcbiAgICB0aGlzLmRpcnR5ID0gZmFsc2U7XG4gICAgdGhpcy5zZXR0ZXIgPSBzZXR0ZXI7XG4gICAgdGhpcy5zZXR0ZXIodGhpcy52YWx1ZSk7XG4gICAgdGhpcy5sb2FkKCk7XG4gIH1cblxuICBsb2FkKCkge1xuICAgIGxvYWRSZWNvcmQodGhpcy5uYW1lLCBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IEpTT04ucGFyc2UodmFsdWUgfHwgJ3t9Jyk7XG4gICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgdGhpcy52YWx1ZSA9IHt9O1xuICAgICAgICB0aGlzLmRpcnR5ID0gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0dGVyKHRoaXMudmFsdWUpO1xuICAgIH0uYmluZCh0aGlzKSk7XG4gIH1cblxuICBzZXRWYWx1ZSh2KSB7XG4gICAgdGhpcy52YWx1ZSA9IHY7XG4gICAgdGhpcy5kaXJ0eSA9IHRydWU7XG4gICAgdGhpcy5zZXR0ZXIodik7XG4gICAgdGhpcy5zYXZlKCk7XG4gIH1cblxuICBzYXZlKCkge1xuICAgIGlmICh0aGlzLmRpcnR5KSB7XG4gICAgICBzYXZlUmVjb3JkKHRoaXMubmFtZSwgSlNPTi5zdHJpbmdpZnkodGhpcy52YWx1ZSkpO1xuICAgICAgdGhpcy5kaXJ0eSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIHNldERpcnR5KCkge1xuICAgIHRoaXMuZGlydHkgPSB0cnVlO1xuICB9XG5cbiAgaXNEaXJ0eSgpIHtcbiAgICByZXR1cm4gdGhpcy5kaXJ0eTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMudmFsdWUgPSB7fTtcbiAgICB0aGlzLmRpcnR5ID0gdHJ1ZTtcbiAgICB0aGlzLnNhdmUoKTtcbiAgICB0aGlzLnNldHRlcih0aGlzLnZhbHVlKTtcbiAgfVxuXG59O1xuXG5leHBvcnQgY2xhc3MgQXV0b1BlcnNpc3RlbnRPYmplY3QgZXh0ZW5kcyBQZXJzaXN0ZW50T2JqZWN0IHtcblxuICBjb25zdHJ1Y3RvcihuYW1lLCBzZXR0ZXIsIHNhdmVJbnRlcnZhbCkge1xuICAgIHN1cGVyKG5hbWUsIHNldHRlcik7XG4gICAgcGFjZW1ha2VyLnJlZ2lzdGVyKHRoaXMuc2F2ZS5iaW5kKHRoaXMpLCBzYXZlSW50ZXJ2YWwsIHRoaXMuaXNEaXJ0eS5iaW5kKHRoaXMpKTtcbiAgfVxuXG59O1xuIl19