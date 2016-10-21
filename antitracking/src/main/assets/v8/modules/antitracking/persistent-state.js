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