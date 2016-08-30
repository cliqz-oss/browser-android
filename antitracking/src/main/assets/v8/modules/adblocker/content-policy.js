System.register('adblocker/content-policy', ['antitracking/url', 'antitracking/domain'], function (_export) {
  'use strict';

  var URLInfo, sameGeneralDomain, _Components, Cc, Ci, Cu, ContentPolicy;

  return {
    setters: [function (_antitrackingUrl) {
      URLInfo = _antitrackingUrl.URLInfo;
    }, function (_antitrackingDomain) {
      sameGeneralDomain = _antitrackingDomain.sameGeneralDomain;
    }],
    execute: function () {
      _Components = Components;
      Cc = _Components.classes;
      Ci = _Components.interfaces;
      Cu = _Components.utils;

      Cu['import']('resource://gre/modules/XPCOMUtils.jsm');
      Cu['import']('resource://gre/modules/Services.jsm');

      ContentPolicy = {
        classDescription: 'CliqzContentPolicy',
        classID: Components.ID('{87654321-1234-1234-1234-123456789cba}'),
        contractID: '@cliqz.com/test-policy;1',
        xpcom_categories: 'content-policy',
        requests2dom: {},

        init: function init() {
          this.registrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
          this.registrar.registerFactory(this.classID, this.classDescription, this.contractID, this);
          this.catMan = Cc['@mozilla.org/categorymanager;1'].getService(Ci.nsICategoryManager);
          this.catMan.addCategoryEntry(this.xpcom_categories, this.contractID, this.contractID, false, true);
        },

        unload: function unload() {
          this.catMan.deleteCategoryEntry(this.xpcom_categories, this.contractID, false);
        },

        shouldLoad: function shouldLoad(contentType, contentLocation, requestOrigin, node) {
          var url = contentLocation ? contentLocation.spec : 'null';
          var urlParts = URLInfo.get(url);
          var ref = null;

          // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, url);
          try {
            ref = node.ownerDocument.defaultView.top.document.URL;
          } catch (e) {
            ref = requestOrigin ? requestOrigin.spec : 'null';
          }

          var refParts = URLInfo.get(ref);

          // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
          if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
            if (!(ref in this.requests2dom)) {
              this.requests2dom[ref] = {};
            }
            this.requests2dom[ref][url] = node;
          }
          return Ci.nsIContentPolicy.ACCEPT;
        },

        shouldProcess: function shouldProcess(contentType, contentLocation, requestOrigin, node) {
          // utils.getWindow().console.log(node.ownerDocument.defaultView.top.document.URL, 'doc');
          // TODO: use tab id instead of ref, if two tabs share same url, we will end up with wrong nodes
          var url = contentLocation ? contentLocation.spec : 'null';
          var urlParts = URLInfo.get(url);
          var ref = null;
          try {
            ref = node.ownerDocument.defaultView.top.document.URL;
          } catch (e) {
            ref = requestOrigin ? requestOrigin.spec : 'null';
          }
          var refParts = URLInfo.get(ref);
          if (!sameGeneralDomain(urlParts.hostname, refParts.hostname)) {
            if (!(ref in this.requests2dom)) {
              this.requests2dom[ref] = {};
            }
            this.requests2dom[ref][url] = node;
          }
          return Ci.nsIContentPolicy.ACCEPT;
        },

        // nsIFactory interface implementation
        createInstance: function createInstance(outer, iid) {
          if (outer) {
            throw Cr.NS_ERROR_NO_AGGREGATION;
          }
          return this.QueryInterface(iid);
        },

        // nsISupports interface implementation
        QueryInterface: XPCOMUtils.generateQI([Ci.nsIContentPolicy, Ci.nsIFactory]),

        cleanUP: function cleanUP() {
          var _this = this;

          // clean up dead objects (i.e. closed tabs)
          Object.keys(this.requests2dom).forEach(function (ref) {
            Object.keys(_this.requests2dom[ref]).forEach(function (url) {
              if (_this.requests2dom[ref][url] === undefined) {
                // it's an dead object
                delete _this.requests2dom[ref][url];
              }
            });

            if (Object.keys(_this.requests2dom[ref]).length === 0) {
              delete _this.requests2dom[ref];
            }
          });
        }
      };

      _export('default', ContentPolicy);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9jb250ZW50LXBvbGljeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7K0NBSWlCLEVBQUUsRUFBYyxFQUFFLEVBQVMsRUFBRSxFQUt4QyxhQUFhOzs7O2lDQVRWLE9BQU87OzhDQUNQLGlCQUFpQjs7O29CQUd5QixVQUFVO0FBQTVDLFFBQUUsZUFBWCxPQUFPO0FBQWtCLFFBQUUsZUFBZCxVQUFVO0FBQWEsUUFBRSxlQUFULEtBQUs7O0FBRTFDLFFBQUUsVUFBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7QUFDbkQsUUFBRSxVQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQzs7QUFFM0MsbUJBQWEsR0FBRztBQUNwQix3QkFBZ0IsRUFBRSxvQkFBb0I7QUFDdEMsZUFBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsd0NBQXdDLENBQUM7QUFDaEUsa0JBQVUsRUFBRSwwQkFBMEI7QUFDdEMsd0JBQWdCLEVBQUUsZ0JBQWdCO0FBQ2xDLG9CQUFZLEVBQUUsRUFBRTs7QUFFaEIsWUFBSSxFQUFBLGdCQUFHO0FBQ0wsY0FBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUM3RSxjQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNGLGNBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3JGLGNBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7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QUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7O0FBRTNFLGVBQU8sRUFBQSxtQkFBRzs7OztBQUVSLGdCQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHLEVBQUk7QUFDNUMsa0JBQU0sQ0FBQyxJQUFJLENBQUMsTUFBSyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQSxHQUFHLEVBQUk7QUFDakQsa0JBQUksTUFBSyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssU0FBUyxFQUFFOztBQUM3Qyx1QkFBTyxNQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztlQUNwQzthQUNGLENBQUMsQ0FBQzs7QUFFSCxnQkFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQUssWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtBQUNwRCxxQkFBTyxNQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUMvQjtXQUNGLENBQUMsQ0FBQztTQUNKO09BQ0Y7O3lCQUVjLGFBQWEiLCJmaWxlIjoiYWRibG9ja2VyL2NvbnRlbnQtcG9saWN5LmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVVJMSW5mbyB9IGZyb20gJ2FudGl0cmFja2luZy91cmwnO1xuaW1wb3J0IHsgc2FtZUdlbmVyYWxEb21haW4gfSBmcm9tICdhbnRpdHJhY2tpbmcvZG9tYWluJztcblxuXG5jb25zdCB7IGNsYXNzZXM6IENjLCBpbnRlcmZhY2VzOiBDaSwgdXRpbHM6IEN1IH0gPSBDb21wb25lbnRzO1xuXG5DdS5pbXBvcnQoJ3Jlc291cmNlOi8vZ3JlL21vZHVsZXMvWFBDT01VdGlscy5qc20nKTtcbkN1LmltcG9ydCgncmVzb3VyY2U6Ly9ncmUvbW9kdWxlcy9TZXJ2aWNlcy5qc20nKTtcblxuY29uc3QgQ29udGVudFBvbGljeSA9IHtcbiAgY2xhc3NEZXNjcmlwdGlvbjogJ0NsaXF6Q29udGVudFBvbGljeScsXG4gIGNsYXNzSUQ6IENvbXBvbmVudHMuSUQoJ3s4NzY1NDMyMS0xMjM0LTEyMzQtMTIzNC0xMjM0NTY3ODljYmF9JyksXG4gIGNvbnRyYWN0SUQ6ICdAY2xpcXouY29tL3Rlc3QtcG9saWN5OzEnLFxuICB4cGNvbV9jYXRlZ29yaWVzOiAnY29udGVudC1wb2xpY3knLFxuICByZXF1ZXN0czJkb206IHt9LFxuXG4gIGluaXQoKSB7XG4gICAgdGhpcy5yZWdpc3RyYXIgPSBDb21wb25lbnRzLm1hbmFnZXIuUXVlcnlJbnRlcmZhY2UoQ2kubnNJQ29tcG9uZW50UmVnaXN0cmFyKTtcbiAgICB0aGlzLnJlZ2lzdHJhci5yZWdpc3RlckZhY3RvcnkodGhpcy5jbGFzc0lELCB0aGlzLmNsYXNzRGVzY3JpcHRpb24sIHRoaXMuY29udHJhY3RJRCwgdGhpcyk7XG4gICAgdGhpcy5jYXRNYW4gPSBDY1snQG1vemlsbGEub3JnL2NhdGVnb3J5bWFuYWdlcjsxJ10uZ2V0U2VydmljZShDaS5uc0lDYXRlZ29yeU1hbmFnZXIpO1xuICAgIHRoaXMuY2F0TWFuLmFkZENhdGVnb3J5RW50cnkodGhpcy54cGNvbV9jYXRlZ29yaWVzLCB0aGlzLmNvbnRyYWN0SUQsIHRoaXMuY29udHJhY3RJRCwgZmFsc2UsIHRydWUpO1xuICB9LFxuXG4gIHVubG9hZCgpIHtcbiAgICB0aGlzLmNhdE1hbi5kZWxldGVDYXRlZ29yeUVudHJ5KHRoaXMueHBjb21fY2F0ZWdvcmllcywgdGhpcy5jb250cmFjdElELCBmYWxzZSk7XG4gIH0sXG5cbiAgc2hvdWxkTG9hZChjb250ZW50VHlwZSwgY29udGVudExvY2F0aW9uLCByZXF1ZXN0T3JpZ2luLCBub2RlKSB7XG4gICAgY29uc3QgdXJsID0gY29udGVudExvY2F0aW9uID8gY29udGVudExvY2F0aW9uLnNwZWMgOiAnbnVsbCc7XG4gICAgY29uc3QgdXJsUGFydHMgPSBVUkxJbmZvLmdldCh1cmwpO1xuICAgIGxldCByZWYgPSBudWxsO1xuXG4gICAgLy8gdXRpbHMuZ2V0V2luZG93KCkuY29uc29sZS5sb2cobm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnRvcC5kb2N1bWVudC5VUkwsIHVybCk7XG4gICAgdHJ5IHtcbiAgICAgIHJlZiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlZiA9IHJlcXVlc3RPcmlnaW4gPyByZXF1ZXN0T3JpZ2luLnNwZWMgOiAnbnVsbCc7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmUGFydHMgPSBVUkxJbmZvLmdldChyZWYpO1xuXG4gICAgLy8gdXRpbHMuZ2V0V2luZG93KCkuY29uc29sZS5sb2cobm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnRvcC5kb2N1bWVudC5VUkwsICdkb2MnKTtcbiAgICBpZiAoIXNhbWVHZW5lcmFsRG9tYWluKHVybFBhcnRzLmhvc3RuYW1lLCByZWZQYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgIGlmICghKHJlZiBpbiB0aGlzLnJlcXVlc3RzMmRvbSkpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXVt1cmxdID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIENpLm5zSUNvbnRlbnRQb2xpY3kuQUNDRVBUO1xuICB9LFxuXG4gIHNob3VsZFByb2Nlc3MoY29udGVudFR5cGUsIGNvbnRlbnRMb2NhdGlvbiwgcmVxdWVzdE9yaWdpbiwgbm9kZSkge1xuICAgIC8vIHV0aWxzLmdldFdpbmRvdygpLmNvbnNvbGUubG9nKG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMLCAnZG9jJyk7XG4gICAgLy8gVE9ETzogdXNlIHRhYiBpZCBpbnN0ZWFkIG9mIHJlZiwgaWYgdHdvIHRhYnMgc2hhcmUgc2FtZSB1cmwsIHdlIHdpbGwgZW5kIHVwIHdpdGggd3Jvbmcgbm9kZXNcbiAgICBjb25zdCB1cmwgPSBjb250ZW50TG9jYXRpb24gPyBjb250ZW50TG9jYXRpb24uc3BlYyA6ICdudWxsJztcbiAgICBjb25zdCB1cmxQYXJ0cyA9IFVSTEluZm8uZ2V0KHVybCk7XG4gICAgbGV0IHJlZiA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlZiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlZiA9IHJlcXVlc3RPcmlnaW4gPyByZXF1ZXN0T3JpZ2luLnNwZWMgOiAnbnVsbCc7XG4gICAgfVxuICAgIGNvbnN0IHJlZlBhcnRzID0gVVJMSW5mby5nZXQocmVmKTtcbiAgICBpZiAoIXNhbWVHZW5lcmFsRG9tYWluKHVybFBhcnRzLmhvc3RuYW1lLCByZWZQYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgIGlmICghKHJlZiBpbiB0aGlzLnJlcXVlc3RzMmRvbSkpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXVt1cmxdID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIENpLm5zSUNvbnRlbnRQb2xpY3kuQUNDRVBUO1xuICB9LFxuXG4gIC8vIG5zSUZhY3RvcnkgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gIGNyZWF0ZUluc3RhbmNlKG91dGVyLCBpaWQpIHtcbiAgICBpZiAob3V0ZXIpIHtcbiAgICAgIHRocm93IENyLk5TX0VSUk9SX05PX0FHR1JFR0FUSU9OO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5RdWVyeUludGVyZmFjZShpaWQpO1xuICB9LFxuXG4gIC8vIG5zSVN1cHBvcnRzIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICBRdWVyeUludGVyZmFjZTogWFBDT01VdGlscy5nZW5lcmF0ZVFJKFtDaS5uc0lDb250ZW50UG9saWN5LCBDaS5uc0lGYWN0b3J5XSksXG5cbiAgY2xlYW5VUCgpIHtcbiAgICAvLyBjbGVhbiB1cCBkZWFkIG9iamVjdHMgKGkuZS4gY2xvc2VkIHRhYnMpXG4gICAgT2JqZWN0LmtleXModGhpcy5yZXF1ZXN0czJkb20pLmZvckVhY2gocmVmID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucmVxdWVzdHMyZG9tW3JlZl0pLmZvckVhY2godXJsID0+IHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdHMyZG9tW3JlZl1bdXJsXSA9PT0gdW5kZWZpbmVkKSB7ICAvLyBpdCdzIGFuIGRlYWQgb2JqZWN0XG4gICAgICAgICAgZGVsZXRlIHRoaXMucmVxdWVzdHMyZG9tW3JlZl1bdXJsXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLnJlcXVlc3RzMmRvbVtyZWZdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVxdWVzdHMyZG9tW3JlZl07XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBDb250ZW50UG9saWN5O1xuIl19