System.register("antitracking/pacemaker", ["core/cliqz"], function (_export) {
  "use strict";

  var utils, default_tpace, Pacemaker, pm;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }],
    execute: function () {
      default_tpace = 10 * 1000;

      Pacemaker = (function () {
        function Pacemaker(tpace, twait) {
          _classCallCheck(this, Pacemaker);

          this.tpace = tpace || default_tpace;
          this.twait = new Date().getTime() + (twait || 0);
          this._id = null;
          this._tasks = new Set();
        }

        // export singleton pacemaker

        _createClass(Pacemaker, [{
          key: "start",
          value: function start() {
            if (this._id) {
              this.stop();
            }
            this._id = utils.setInterval(this._tick.bind(this), this.tpace, null);
          }
        }, {
          key: "stop",
          value: function stop() {
            utils.clearTimeout(this._id);
            this._id = null;
            this._tasks = new Set();
          }
        }, {
          key: "_tick",
          value: function _tick() {
            var now = new Date().getTime();
            // initial waiting period
            if (this.twait > now) {
              utils.log("tick wait", "pacemaker");
              return;
            }

            // run registered tasks
            this._tasks.forEach(function (task) {
              if (now > task.last + task.freq) {
                utils.setTimeout(function () {
                  var task_name = task.fn.name || "<anon>";
                  try {
                    // if task constraint is set, test it before running
                    if (!task.when || task.when(task)) {
                      utils.log("run task: " + task_name, "pacemaker");
                      task.fn(now);
                    }
                    task.last = now;
                  } catch (e) {
                    utils.log("Error executing task " + task_name + ": " + e, "pacemaker");
                  }
                }, 0);
              }
            });
          }

          /** Register a function to be run periodically by the pacemaker.
                @param fn function to call
                @param frequency minimum interval between calls, in ms.
                @returns task object, which can be used with deregister to stop this task.
           */
        }, {
          key: "register",
          value: function register(fn, frequency, constraint) {
            if (!fn) {
              throw "fn cannot be undefined";
            }
            var task = {
              fn: fn,
              freq: frequency || 0,
              last: 0,
              when: constraint
            };
            this._tasks.add(task);
            return task;
          }
        }, {
          key: "deregister",
          value: function deregister(task) {
            this._tasks["delete"](task);
          }
        }]);

        return Pacemaker;
      })();

      pm = new Pacemaker(30000, 30000);

      _export("default", pm);
    }
  };
});