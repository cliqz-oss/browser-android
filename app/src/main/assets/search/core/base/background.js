System.register("core/base/background", ["core/cliqz"], function (_export) {
  "use strict";

  var utils, events;
  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
      events = _coreCliqz.events;
    }],
    execute: function () {
      _export("default", function (background) {
        var bgInit = background.init,
            bgUnload = background.unload,
            bgEvents = background.events;
        var enabled = undefined;

        // bind actions to background object
        Object.keys(background.actions || {}).forEach(function (action) {
          background.actions[action] = background.actions[action].bind(background);
        });

        background.init = function init() {
          enabled = background.enabled.apply(background, arguments);

          if (!enabled) {
            return;
          }

          bgInit.apply(background, arguments);

          Object.keys(bgEvents || {}).forEach(function (event) {

            bgEvents[event] = bgEvents[event].bind(background);
            events.sub(event, bgEvents[event]);
          });
        };

        background.unload = function unload() {
          if (!enabled) {
            return;
          }

          Object.keys(bgEvents || {}).forEach(function (event) {
            events.un_sub(event, bgEvents[event]);
          });

          bgUnload.apply(background, arguments);
        };

        return background;
      });
    }
  };
});