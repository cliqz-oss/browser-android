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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9wYWNlbWFrZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O2FBRU0sYUFBYSxFQUViLFNBQVMsRUEyRVgsRUFBRTs7Ozs7Ozs7eUJBL0VHLEtBQUs7OztBQUVSLG1CQUFhLEdBQUcsRUFBRSxHQUFHLElBQUk7O0FBRXpCLGVBQVM7QUFFRixpQkFGUCxTQUFTLENBRUQsS0FBSyxFQUFFLEtBQUssRUFBRTtnQ0FGdEIsU0FBUzs7QUFHWCxjQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssSUFBSSxhQUFhLENBQUM7QUFDcEMsY0FBSSxDQUFDLEtBQUssR0FBRyxBQUFDLElBQUksSUFBSSxFQUFFLENBQUUsT0FBTyxFQUFFLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQSxBQUFDLENBQUM7QUFDbkQsY0FBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUM7QUFDaEIsY0FBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1NBQ3pCOzs7O3FCQVBHLFNBQVM7O2lCQVNSLGlCQUFHO0FBQ04sZ0JBQUksSUFBSSxDQUFDLEdBQUcsRUFBRTtBQUNaLGtCQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDYjtBQUNELGdCQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztXQUN2RTs7O2lCQUVHLGdCQUFHO0FBQ0wsaUJBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLGdCQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQztBQUNoQixnQkFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1dBQ3pCOzs7aUJBRUksaUJBQUc7QUFDTixnQkFBSSxHQUFHLEdBQUcsQUFBQyxJQUFJLElBQUksRUFBRSxDQUFFLE9BQU8sRUFBRSxDQUFDOztBQUVqQyxnQkFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRTtBQUNwQixtQkFBSyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDcEMscUJBQU87YUFDUjs7O0FBR0QsZ0JBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVMsSUFBSSxFQUFFO0FBQ2pDLGtCQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDL0IscUJBQUssQ0FBQyxVQUFVLENBQUMsWUFBVztBQUMxQixzQkFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDO0FBQ3pDLHNCQUFJOztBQUVGLHdCQUFJLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ2pDLDJCQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksR0FBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDaEQsMEJBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2Q7QUFDRCx3QkFBSSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUM7bUJBQ2pCLENBQUMsT0FBTSxDQUFDLEVBQUU7QUFDVCx5QkFBSyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsR0FBRSxTQUFTLEdBQUUsSUFBSSxHQUFFLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQzttQkFDckU7aUJBQ0YsRUFBRSxDQUFDLENBQUMsQ0FBQztlQUNQO2FBQ0YsQ0FBQyxDQUFDO1dBQ0o7Ozs7Ozs7OztpQkFPTyxrQkFBQyxFQUFFLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRTtBQUNsQyxnQkFBSSxDQUFDLEVBQUUsRUFBRTtBQUNQLG9CQUFNLHdCQUF3QixDQUFDO2FBQ2hDO0FBQ0QsZ0JBQUksSUFBSSxHQUFHO0FBQ1QsZ0JBQUUsRUFBRSxFQUFFO0FBQ04sa0JBQUksRUFBRSxTQUFTLElBQUksQ0FBQztBQUNwQixrQkFBSSxFQUFFLENBQUM7QUFDUCxrQkFBSSxFQUFFLFVBQVU7YUFDakIsQ0FBQztBQUNGLGdCQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN0QixtQkFBTyxJQUFJLENBQUM7V0FDYjs7O2lCQUVTLG9CQUFDLElBQUksRUFBRTtBQUNmLGdCQUFJLENBQUMsTUFBTSxVQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7V0FDMUI7OztlQXZFRyxTQUFTOzs7QUEyRVgsUUFBRSxHQUFHLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUM7O3lCQUNyQixFQUFFIiwiZmlsZSI6ImFudGl0cmFja2luZy9wYWNlbWFrZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1dGlscyB9IGZyb20gJ2NvcmUvY2xpcXonO1xuXG5jb25zdCBkZWZhdWx0X3RwYWNlID0gMTAgKiAxMDAwO1xuXG5jbGFzcyBQYWNlbWFrZXIge1xuXG4gIGNvbnN0cnVjdG9yKHRwYWNlLCB0d2FpdCkge1xuICAgIHRoaXMudHBhY2UgPSB0cGFjZSB8fCBkZWZhdWx0X3RwYWNlO1xuICAgIHRoaXMudHdhaXQgPSAobmV3IERhdGUoKSkuZ2V0VGltZSgpICsgKHR3YWl0IHx8IDApO1xuICAgIHRoaXMuX2lkID0gbnVsbDtcbiAgICB0aGlzLl90YXNrcyA9IG5ldyBTZXQoKTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIGlmICh0aGlzLl9pZCkge1xuICAgICAgdGhpcy5zdG9wKCk7XG4gICAgfVxuICAgIHRoaXMuX2lkID0gdXRpbHMuc2V0SW50ZXJ2YWwodGhpcy5fdGljay5iaW5kKHRoaXMpLCB0aGlzLnRwYWNlLCBudWxsKTtcbiAgfVxuXG4gIHN0b3AoKSB7XG4gICAgdXRpbHMuY2xlYXJUaW1lb3V0KHRoaXMuX2lkKTtcbiAgICB0aGlzLl9pZCA9IG51bGw7XG4gICAgdGhpcy5fdGFza3MgPSBuZXcgU2V0KCk7XG4gIH1cblxuICBfdGljaygpIHtcbiAgICB2YXIgbm93ID0gKG5ldyBEYXRlKCkpLmdldFRpbWUoKTtcbiAgICAvLyBpbml0aWFsIHdhaXRpbmcgcGVyaW9kXG4gICAgaWYgKHRoaXMudHdhaXQgPiBub3cpIHtcbiAgICAgIHV0aWxzLmxvZyhcInRpY2sgd2FpdFwiLCBcInBhY2VtYWtlclwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBydW4gcmVnaXN0ZXJlZCB0YXNrc1xuICAgIHRoaXMuX3Rhc2tzLmZvckVhY2goZnVuY3Rpb24odGFzaykge1xuICAgICAgaWYgKG5vdyA+IHRhc2subGFzdCArIHRhc2suZnJlcSkge1xuICAgICAgICB1dGlscy5zZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGxldCB0YXNrX25hbWUgPSB0YXNrLmZuLm5hbWUgfHwgXCI8YW5vbj5cIjtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gaWYgdGFzayBjb25zdHJhaW50IGlzIHNldCwgdGVzdCBpdCBiZWZvcmUgcnVubmluZ1xuICAgICAgICAgICAgaWYgKCF0YXNrLndoZW4gfHwgdGFzay53aGVuKHRhc2spKSB7XG4gICAgICAgICAgICAgIHV0aWxzLmxvZyhcInJ1biB0YXNrOiBcIisgdGFza19uYW1lLCBcInBhY2VtYWtlclwiKTtcbiAgICAgICAgICAgICAgdGFzay5mbihub3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGFzay5sYXN0ID0gbm93O1xuICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgdXRpbHMubG9nKFwiRXJyb3IgZXhlY3V0aW5nIHRhc2sgXCIrIHRhc2tfbmFtZSArXCI6IFwiKyBlLCBcInBhY2VtYWtlclwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sIDApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgLyoqIFJlZ2lzdGVyIGEgZnVuY3Rpb24gdG8gYmUgcnVuIHBlcmlvZGljYWxseSBieSB0aGUgcGFjZW1ha2VyLlxuICAgICAgICBAcGFyYW0gZm4gZnVuY3Rpb24gdG8gY2FsbFxuICAgICAgICBAcGFyYW0gZnJlcXVlbmN5IG1pbmltdW0gaW50ZXJ2YWwgYmV0d2VlbiBjYWxscywgaW4gbXMuXG4gICAgICAgIEByZXR1cm5zIHRhc2sgb2JqZWN0LCB3aGljaCBjYW4gYmUgdXNlZCB3aXRoIGRlcmVnaXN0ZXIgdG8gc3RvcCB0aGlzIHRhc2suXG4gICAqL1xuICByZWdpc3RlcihmbiwgZnJlcXVlbmN5LCBjb25zdHJhaW50KSB7XG4gICAgaWYgKCFmbikge1xuICAgICAgdGhyb3cgXCJmbiBjYW5ub3QgYmUgdW5kZWZpbmVkXCI7XG4gICAgfVxuICAgIHZhciB0YXNrID0ge1xuICAgICAgZm46IGZuLFxuICAgICAgZnJlcTogZnJlcXVlbmN5IHx8IDAsXG4gICAgICBsYXN0OiAwLFxuICAgICAgd2hlbjogY29uc3RyYWludFxuICAgIH07XG4gICAgdGhpcy5fdGFza3MuYWRkKHRhc2spO1xuICAgIHJldHVybiB0YXNrO1xuICB9XG5cbiAgZGVyZWdpc3Rlcih0YXNrKSB7XG4gICAgdGhpcy5fdGFza3MuZGVsZXRlKHRhc2spO1xuICB9XG59XG5cbi8vIGV4cG9ydCBzaW5nbGV0b24gcGFjZW1ha2VyXG52YXIgcG0gPSBuZXcgUGFjZW1ha2VyKDMwMDAwLCAzMDAwMCk7XG5leHBvcnQgZGVmYXVsdCBwbTtcbiJdfQ==