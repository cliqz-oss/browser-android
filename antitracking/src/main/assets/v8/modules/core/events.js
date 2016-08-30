System.register("core/events", ["core/utils"], function (_export) {
  /*
   * This method implements the publish subscribe design pattern
   *
   * Event naming scheme:
   *    cliqz.module_name.event_name
   *
   *  single sender -> multiple potential recipients
   *    for example: cliqz.core.urlbar_focus (inform others about urlbar focus)
   *    module_name describes sender
   *  multiple potential senders -> single recipient
   *    for example: cliqz.msg_center.show_message (tell the message center to show a message)
   *    module_name describes recipient (this is more like a RPC)
   */

  "use strict";

  var CliqzUtils, CliqzEvents;
  return {
    setters: [function (_coreUtils) {
      CliqzUtils = _coreUtils["default"];
    }],
    execute: function () {
      CliqzEvents = CliqzEvents || {
        //use a javascript object to push the message ids and the callbacks
        cache: {},
        /*
         * Publish events of interest with a specific id
         */
        pub: function pub(id) {
          var args = Array.prototype.slice.call(arguments, 1);
          (CliqzEvents.cache[id] || []).forEach(function (ev) {
            CliqzUtils.setTimeout(function () {
              try {
                ev.apply(null, args);
              } catch (e) {
                CliqzUtils.log(e.toString() + " -- " + e.stack, "CliqzEvents error: " + id);
              }
            }, 0);
          });
        },

        /* Subscribe to events of interest
         * with a specific id and a callback
         * to be executed when the event is observed
         */
        sub: function sub(id, fn) {
          CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
          CliqzEvents.cache[id].push(fn);
        },

        un_sub: function un_sub(id, fn) {
          var index;
          if (!CliqzEvents.cache[id]) {
            return;
          }
          if (!fn) {
            CliqzEvents.cache[id] = [];
          } else {
            index = CliqzEvents.cache[id].indexOf(fn);
            if (index > -1) {
              CliqzEvents.cache[id].splice(index, 1);
            }
          }
        },

        nextId: function nextId() {
          nextId.id = nextId.id || 0;
          nextId.id += 1;
          return nextId.id;
        }
      };

      _export("default", CliqzEvents);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O2tCQWdCSSxXQUFXOzs7Ozs7QUFBWCxpQkFBVyxHQUFHLFdBQVcsSUFBSTs7QUFFL0IsYUFBSyxFQUFFLEVBQUU7Ozs7QUFJVCxXQUFHLEVBQUUsYUFBVSxFQUFFLEVBQUU7QUFDakIsY0FBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNwRCxXQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFBLENBQUUsT0FBTyxDQUFDLFVBQVUsRUFBRSxFQUFFO0FBQ2xELHNCQUFVLENBQUMsVUFBVSxDQUFDLFlBQVk7QUFDaEMsa0JBQUk7QUFDRixrQkFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7ZUFDdEIsQ0FBQyxPQUFNLENBQUMsRUFBRTtBQUNULDBCQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBQyxNQUFNLEdBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxxQkFBcUIsR0FBQyxFQUFFLENBQUMsQ0FBQztlQUN2RTthQUNGLEVBQUUsQ0FBQyxDQUFDLENBQUM7V0FDUCxDQUFDLENBQUM7U0FDSjs7Ozs7O0FBTUQsV0FBRyxFQUFFLGFBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNyQixxQkFBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwRCxxQkFBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEM7O0FBRUQsY0FBTSxFQUFFLGdCQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUU7QUFDeEIsY0FBSSxLQUFLLENBQUM7QUFDVixjQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUMxQixtQkFBTztXQUNSO0FBQ0QsY0FBSSxDQUFDLEVBQUUsRUFBRTtBQUNQLHVCQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztXQUM1QixNQUFNO0FBQ0wsaUJBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMxQyxnQkFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQUU7QUFDZCx5QkFBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3hDO1dBQ0Y7U0FDRjs7QUFFRCxjQUFNLEVBQUUsU0FBUyxNQUFNLEdBQUc7QUFDeEIsZ0JBQU0sQ0FBQyxFQUFFLEdBQUcsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDM0IsZ0JBQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQ2YsaUJBQU8sTUFBTSxDQUFDLEVBQUUsQ0FBQztTQUNsQjtPQUNGOzt5QkFFYyxXQUFXIiwiZmlsZSI6ImNvcmUvZXZlbnRzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIFRoaXMgbWV0aG9kIGltcGxlbWVudHMgdGhlIHB1Ymxpc2ggc3Vic2NyaWJlIGRlc2lnbiBwYXR0ZXJuXG4gKlxuICogRXZlbnQgbmFtaW5nIHNjaGVtZTpcbiAqICAgIGNsaXF6Lm1vZHVsZV9uYW1lLmV2ZW50X25hbWVcbiAqXG4gKiAgc2luZ2xlIHNlbmRlciAtPiBtdWx0aXBsZSBwb3RlbnRpYWwgcmVjaXBpZW50c1xuICogICAgZm9yIGV4YW1wbGU6IGNsaXF6LmNvcmUudXJsYmFyX2ZvY3VzIChpbmZvcm0gb3RoZXJzIGFib3V0IHVybGJhciBmb2N1cylcbiAqICAgIG1vZHVsZV9uYW1lIGRlc2NyaWJlcyBzZW5kZXJcbiAqICBtdWx0aXBsZSBwb3RlbnRpYWwgc2VuZGVycyAtPiBzaW5nbGUgcmVjaXBpZW50XG4gKiAgICBmb3IgZXhhbXBsZTogY2xpcXoubXNnX2NlbnRlci5zaG93X21lc3NhZ2UgKHRlbGwgdGhlIG1lc3NhZ2UgY2VudGVyIHRvIHNob3cgYSBtZXNzYWdlKVxuICogICAgbW9kdWxlX25hbWUgZGVzY3JpYmVzIHJlY2lwaWVudCAodGhpcyBpcyBtb3JlIGxpa2UgYSBSUEMpXG4gKi9cblxuaW1wb3J0IENsaXF6VXRpbHMgZnJvbSBcImNvcmUvdXRpbHNcIjtcblxudmFyIENsaXF6RXZlbnRzID0gQ2xpcXpFdmVudHMgfHwge1xuICAvL3VzZSBhIGphdmFzY3JpcHQgb2JqZWN0IHRvIHB1c2ggdGhlIG1lc3NhZ2UgaWRzIGFuZCB0aGUgY2FsbGJhY2tzXG4gIGNhY2hlOiB7fSxcbiAgLypcbiAgICogUHVibGlzaCBldmVudHMgb2YgaW50ZXJlc3Qgd2l0aCBhIHNwZWNpZmljIGlkXG4gICAqL1xuICBwdWI6IGZ1bmN0aW9uIChpZCkge1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAoQ2xpcXpFdmVudHMuY2FjaGVbaWRdIHx8IFtdKS5mb3JFYWNoKGZ1bmN0aW9uIChldikge1xuICAgICAgQ2xpcXpVdGlscy5zZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBldi5hcHBseShudWxsLCBhcmdzKTtcbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgQ2xpcXpVdGlscy5sb2coZS50b1N0cmluZygpK1wiIC0tIFwiK2Uuc3RhY2ssIFwiQ2xpcXpFdmVudHMgZXJyb3I6IFwiK2lkKTtcbiAgICAgICAgfVxuICAgICAgfSwgMCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLyogU3Vic2NyaWJlIHRvIGV2ZW50cyBvZiBpbnRlcmVzdFxuICAgKiB3aXRoIGEgc3BlY2lmaWMgaWQgYW5kIGEgY2FsbGJhY2tcbiAgICogdG8gYmUgZXhlY3V0ZWQgd2hlbiB0aGUgZXZlbnQgaXMgb2JzZXJ2ZWRcbiAgICovXG4gIHN1YjogZnVuY3Rpb24gKGlkLCBmbikge1xuICAgIENsaXF6RXZlbnRzLmNhY2hlW2lkXSA9IENsaXF6RXZlbnRzLmNhY2hlW2lkXSB8fCBbXTtcbiAgICBDbGlxekV2ZW50cy5jYWNoZVtpZF0ucHVzaChmbik7XG4gIH0sXG5cbiAgdW5fc3ViOiBmdW5jdGlvbiAoaWQsIGZuKSB7XG4gICAgdmFyIGluZGV4O1xuICAgIGlmICghQ2xpcXpFdmVudHMuY2FjaGVbaWRdKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghZm4pIHtcbiAgICAgIENsaXF6RXZlbnRzLmNhY2hlW2lkXSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICBpbmRleCA9IENsaXF6RXZlbnRzLmNhY2hlW2lkXS5pbmRleE9mKGZuKTtcbiAgICAgIGlmIChpbmRleCA+IC0xKSB7XG4gICAgICAgIENsaXF6RXZlbnRzLmNhY2hlW2lkXS5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcblxuICBuZXh0SWQ6IGZ1bmN0aW9uIG5leHRJZCgpIHtcbiAgICBuZXh0SWQuaWQgPSBuZXh0SWQuaWQgfHwgMDtcbiAgICBuZXh0SWQuaWQgKz0gMTtcbiAgICByZXR1cm4gbmV4dElkLmlkO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBDbGlxekV2ZW50cztcbiJdfQ==