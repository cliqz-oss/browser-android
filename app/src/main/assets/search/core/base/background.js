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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvYmFzZS9iYWNrZ3JvdW5kLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozt5QkFBUyxLQUFLOzBCQUFFLE1BQU07Ozt5QkFFUCxVQUFVLFVBQVUsRUFBRTtBQUNuQyxZQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSTtZQUN4QixRQUFRLEdBQUcsVUFBVSxDQUFDLE1BQU07WUFDNUIsUUFBUSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUM7QUFDbkMsWUFBSSxPQUFPLFlBQUEsQ0FBQzs7O0FBR1osY0FBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBRSxVQUFBLE1BQU0sRUFBSTtBQUN2RCxvQkFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMxRSxDQUFDLENBQUM7O0FBRUgsa0JBQVUsQ0FBQyxJQUFJLEdBQUcsU0FBUyxJQUFJLEdBQUc7QUFDaEMsaUJBQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7O0FBRTFELGNBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixtQkFBTztXQUNSOztBQUVELGdCQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQzs7QUFFcEMsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBRSxVQUFBLEtBQUssRUFBSTs7QUFFNUMsb0JBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25ELGtCQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztXQUNwQyxDQUFDLENBQUM7U0FDSixDQUFDOztBQUVGLGtCQUFVLENBQUMsTUFBTSxHQUFHLFNBQVMsTUFBTSxHQUFHO0FBQ3BDLGNBQUksQ0FBQyxPQUFPLEVBQUU7QUFDWixtQkFBTztXQUNSOztBQUVELGdCQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUUsVUFBQSxLQUFLLEVBQUk7QUFDNUMsa0JBQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1dBQ3ZDLENBQUMsQ0FBQzs7QUFFSCxrQkFBUSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7U0FDdkMsQ0FBQzs7QUFFRixlQUFPLFVBQVUsQ0FBQztPQUNuQiIsImZpbGUiOiJjb3JlL2Jhc2UvYmFja2dyb3VuZC5lcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHV0aWxzLCBldmVudHMgfSBmcm9tIFwiY29yZS9jbGlxelwiO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiAoYmFja2dyb3VuZCkge1xuICBjb25zdCBiZ0luaXQgPSBiYWNrZ3JvdW5kLmluaXQsXG4gICAgICAgIGJnVW5sb2FkID0gYmFja2dyb3VuZC51bmxvYWQsXG4gICAgICAgIGJnRXZlbnRzID0gYmFja2dyb3VuZC5ldmVudHM7XG4gIGxldCBlbmFibGVkO1xuXG4gIC8vIGJpbmQgYWN0aW9ucyB0byBiYWNrZ3JvdW5kIG9iamVjdFxuICBPYmplY3Qua2V5cyhiYWNrZ3JvdW5kLmFjdGlvbnMgfHwge30pLmZvckVhY2goIGFjdGlvbiA9PiB7XG4gICAgYmFja2dyb3VuZC5hY3Rpb25zW2FjdGlvbl0gPSBiYWNrZ3JvdW5kLmFjdGlvbnNbYWN0aW9uXS5iaW5kKGJhY2tncm91bmQpO1xuICB9KTtcblxuICBiYWNrZ3JvdW5kLmluaXQgPSBmdW5jdGlvbiBpbml0KCkge1xuICAgIGVuYWJsZWQgPSBiYWNrZ3JvdW5kLmVuYWJsZWQuYXBwbHkoYmFja2dyb3VuZCwgYXJndW1lbnRzKTtcblxuICAgIGlmICghZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGJnSW5pdC5hcHBseShiYWNrZ3JvdW5kLCBhcmd1bWVudHMpO1xuXG4gICAgT2JqZWN0LmtleXMoYmdFdmVudHMgfHwge30pLmZvckVhY2goIGV2ZW50ID0+IHtcblxuICAgICAgYmdFdmVudHNbZXZlbnRdID0gYmdFdmVudHNbZXZlbnRdLmJpbmQoYmFja2dyb3VuZCk7XG4gICAgICBldmVudHMuc3ViKGV2ZW50LCBiZ0V2ZW50c1tldmVudF0pO1xuICAgIH0pO1xuICB9O1xuXG4gIGJhY2tncm91bmQudW5sb2FkID0gZnVuY3Rpb24gdW5sb2FkKCkge1xuICAgIGlmICghZW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIE9iamVjdC5rZXlzKGJnRXZlbnRzIHx8IHt9KS5mb3JFYWNoKCBldmVudCA9PiB7XG4gICAgICBldmVudHMudW5fc3ViKGV2ZW50LCBiZ0V2ZW50c1tldmVudF0pO1xuICAgIH0pO1xuXG4gICAgYmdVbmxvYWQuYXBwbHkoYmFja2dyb3VuZCwgYXJndW1lbnRzKTtcbiAgfTtcblxuICByZXR1cm4gYmFja2dyb3VuZDtcbn1cbiJdfQ==