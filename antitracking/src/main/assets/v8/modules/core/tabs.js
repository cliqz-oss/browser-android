System.register("core/tabs", [], function (_export) {
  "use strict";

  _export("queryActiveTabs", queryActiveTabs);

  function queryActiveTabs(window) {
    var selectedBrowser = window.gBrowser.selectedBrowser;
    return Array.prototype.map.call(window.gBrowser.tabs, function (tab, index) {
      return {
        index: index,
        url: tab.linkedBrowser.currentURI.spec,
        isCurrent: selectedBrowser === tab.linkedBrowser
      };
    });
  }

  return {
    setters: [],
    execute: function () {}
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvdGFicy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFPLFdBQVMsZUFBZSxDQUFDLE1BQU0sRUFBRTtBQUN0QyxRQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztBQUN4RCxXQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUs7QUFDcEUsYUFBTztBQUNMLGFBQUssRUFBTCxLQUFLO0FBQ0wsV0FBRyxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLElBQUk7QUFDdEMsaUJBQVMsRUFBRSxlQUFlLEtBQUssR0FBRyxDQUFDLGFBQWE7T0FDakQsQ0FBQztLQUNILENBQUMsQ0FBQztHQUNKIiwiZmlsZSI6ImNvcmUvdGFicy5qcyIsInNvdXJjZXNDb250ZW50IjpbImV4cG9ydCBmdW5jdGlvbiBxdWVyeUFjdGl2ZVRhYnMod2luZG93KSB7XG4gIGNvbnN0IHNlbGVjdGVkQnJvd3NlciA9IHdpbmRvdy5nQnJvd3Nlci5zZWxlY3RlZEJyb3dzZXI7XG4gIHJldHVybiBBcnJheS5wcm90b3R5cGUubWFwLmNhbGwod2luZG93LmdCcm93c2VyLnRhYnMsICh0YWIsIGluZGV4KSA9PiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGluZGV4LFxuICAgICAgdXJsOiB0YWIubGlua2VkQnJvd3Nlci5jdXJyZW50VVJJLnNwZWMsXG4gICAgICBpc0N1cnJlbnQ6IHNlbGVjdGVkQnJvd3NlciA9PT0gdGFiLmxpbmtlZEJyb3dzZXJcbiAgICB9O1xuICB9KTtcbn1cbiJdfQ==