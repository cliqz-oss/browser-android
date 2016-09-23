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
          this.registrar.unregisterFactory(this.classID, this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9jb250ZW50LXBvbGljeS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7K0NBSWlCLEVBQUUsRUFBYyxFQUFFLEVBQVMsRUFBRSxFQUt4QyxhQUFhOzs7O2lDQVRWLE9BQU87OzhDQUNQLGlCQUFpQjs7O29CQUd5QixVQUFVO0FBQTVDLFFBQUUsZUFBWCxPQUFPO0FBQWtCLFFBQUUsZUFBZCxVQUFVO0FBQWEsUUFBRSxlQUFULEtBQUs7O0FBRTFDLFFBQUUsVUFBTyxDQUFDLHVDQUF1QyxDQUFDLENBQUM7QUFDbkQsUUFBRSxVQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQzs7QUFFM0MsbUJBQWEsR0FBRztBQUNwQix3QkFBZ0IsRUFBRSxvQkFBb0I7QUFDdEMsZUFBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUMsd0NBQXdDLENBQUM7QUFDaEUsa0JBQVUsRUFBRSwwQkFBMEI7QUFDdEMsd0JBQWdCLEVBQUUsZ0JBQWdCO0FBQ2xDLG9CQUFZLEVBQUUsRUFBRTs7QUFFaEIsWUFBSSxFQUFBLGdCQUFHO0FBQ0wsY0FBSSxDQUFDLFNBQVMsR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUM3RSxjQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0FBQzNGLGNBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDLGdDQUFnQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3JGLGNBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7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V0FDbEM7QUFDRCxpQkFBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ2pDOzs7QUFHRCxzQkFBYyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDOztBQUUzRSxlQUFPLEVBQUEsbUJBQUc7Ozs7QUFFUixnQkFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxFQUFJO0FBQzVDLGtCQUFNLENBQUMsSUFBSSxDQUFDLE1BQUssWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUEsR0FBRyxFQUFJO0FBQ2pELGtCQUFJLE1BQUssWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLFNBQVMsRUFBRTs7QUFDN0MsdUJBQU8sTUFBSyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7ZUFDcEM7YUFDRixDQUFDLENBQUM7O0FBRUgsZ0JBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFLLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7QUFDcEQscUJBQU8sTUFBSyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDL0I7V0FDRixDQUFDLENBQUM7U0FDSjtPQUNGOzt5QkFFYyxhQUFhIiwiZmlsZSI6ImFkYmxvY2tlci9jb250ZW50LXBvbGljeS5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFVSTEluZm8gfSBmcm9tICdhbnRpdHJhY2tpbmcvdXJsJztcbmltcG9ydCB7IHNhbWVHZW5lcmFsRG9tYWluIH0gZnJvbSAnYW50aXRyYWNraW5nL2RvbWFpbic7XG5cblxuY29uc3QgeyBjbGFzc2VzOiBDYywgaW50ZXJmYWNlczogQ2ksIHV0aWxzOiBDdSB9ID0gQ29tcG9uZW50cztcblxuQ3UuaW1wb3J0KCdyZXNvdXJjZTovL2dyZS9tb2R1bGVzL1hQQ09NVXRpbHMuanNtJyk7XG5DdS5pbXBvcnQoJ3Jlc291cmNlOi8vZ3JlL21vZHVsZXMvU2VydmljZXMuanNtJyk7XG5cbmNvbnN0IENvbnRlbnRQb2xpY3kgPSB7XG4gIGNsYXNzRGVzY3JpcHRpb246ICdDbGlxekNvbnRlbnRQb2xpY3knLFxuICBjbGFzc0lEOiBDb21wb25lbnRzLklEKCd7ODc2NTQzMjEtMTIzNC0xMjM0LTEyMzQtMTIzNDU2Nzg5Y2JhfScpLFxuICBjb250cmFjdElEOiAnQGNsaXF6LmNvbS90ZXN0LXBvbGljeTsxJyxcbiAgeHBjb21fY2F0ZWdvcmllczogJ2NvbnRlbnQtcG9saWN5JyxcbiAgcmVxdWVzdHMyZG9tOiB7fSxcblxuICBpbml0KCkge1xuICAgIHRoaXMucmVnaXN0cmFyID0gQ29tcG9uZW50cy5tYW5hZ2VyLlF1ZXJ5SW50ZXJmYWNlKENpLm5zSUNvbXBvbmVudFJlZ2lzdHJhcik7XG4gICAgdGhpcy5yZWdpc3RyYXIucmVnaXN0ZXJGYWN0b3J5KHRoaXMuY2xhc3NJRCwgdGhpcy5jbGFzc0Rlc2NyaXB0aW9uLCB0aGlzLmNvbnRyYWN0SUQsIHRoaXMpO1xuICAgIHRoaXMuY2F0TWFuID0gQ2NbJ0Btb3ppbGxhLm9yZy9jYXRlZ29yeW1hbmFnZXI7MSddLmdldFNlcnZpY2UoQ2kubnNJQ2F0ZWdvcnlNYW5hZ2VyKTtcbiAgICB0aGlzLmNhdE1hbi5hZGRDYXRlZ29yeUVudHJ5KHRoaXMueHBjb21fY2F0ZWdvcmllcywgdGhpcy5jb250cmFjdElELCB0aGlzLmNvbnRyYWN0SUQsIGZhbHNlLCB0cnVlKTtcbiAgfSxcblxuICB1bmxvYWQoKSB7XG4gICAgdGhpcy5yZWdpc3RyYXIudW5yZWdpc3RlckZhY3RvcnkodGhpcy5jbGFzc0lELCB0aGlzKTtcbiAgICB0aGlzLmNhdE1hbi5kZWxldGVDYXRlZ29yeUVudHJ5KHRoaXMueHBjb21fY2F0ZWdvcmllcywgdGhpcy5jb250cmFjdElELCBmYWxzZSk7XG4gIH0sXG5cbiAgc2hvdWxkTG9hZChjb250ZW50VHlwZSwgY29udGVudExvY2F0aW9uLCByZXF1ZXN0T3JpZ2luLCBub2RlKSB7XG4gICAgY29uc3QgdXJsID0gY29udGVudExvY2F0aW9uID8gY29udGVudExvY2F0aW9uLnNwZWMgOiAnbnVsbCc7XG4gICAgY29uc3QgdXJsUGFydHMgPSBVUkxJbmZvLmdldCh1cmwpO1xuICAgIGxldCByZWYgPSBudWxsO1xuXG4gICAgLy8gdXRpbHMuZ2V0V2luZG93KCkuY29uc29sZS5sb2cobm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnRvcC5kb2N1bWVudC5VUkwsIHVybCk7XG4gICAgdHJ5IHtcbiAgICAgIHJlZiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlZiA9IHJlcXVlc3RPcmlnaW4gPyByZXF1ZXN0T3JpZ2luLnNwZWMgOiAnbnVsbCc7XG4gICAgfVxuXG4gICAgY29uc3QgcmVmUGFydHMgPSBVUkxJbmZvLmdldChyZWYpO1xuXG4gICAgLy8gdXRpbHMuZ2V0V2luZG93KCkuY29uc29sZS5sb2cobm9kZS5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3LnRvcC5kb2N1bWVudC5VUkwsICdkb2MnKTtcbiAgICBpZiAoIXNhbWVHZW5lcmFsRG9tYWluKHVybFBhcnRzLmhvc3RuYW1lLCByZWZQYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgIGlmICghKHJlZiBpbiB0aGlzLnJlcXVlc3RzMmRvbSkpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXVt1cmxdID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIENpLm5zSUNvbnRlbnRQb2xpY3kuQUNDRVBUO1xuICB9LFxuXG4gIHNob3VsZFByb2Nlc3MoY29udGVudFR5cGUsIGNvbnRlbnRMb2NhdGlvbiwgcmVxdWVzdE9yaWdpbiwgbm9kZSkge1xuICAgIC8vIHV0aWxzLmdldFdpbmRvdygpLmNvbnNvbGUubG9nKG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMLCAnZG9jJyk7XG4gICAgLy8gVE9ETzogdXNlIHRhYiBpZCBpbnN0ZWFkIG9mIHJlZiwgaWYgdHdvIHRhYnMgc2hhcmUgc2FtZSB1cmwsIHdlIHdpbGwgZW5kIHVwIHdpdGggd3Jvbmcgbm9kZXNcbiAgICBjb25zdCB1cmwgPSBjb250ZW50TG9jYXRpb24gPyBjb250ZW50TG9jYXRpb24uc3BlYyA6ICdudWxsJztcbiAgICBjb25zdCB1cmxQYXJ0cyA9IFVSTEluZm8uZ2V0KHVybCk7XG4gICAgbGV0IHJlZiA9IG51bGw7XG4gICAgdHJ5IHtcbiAgICAgIHJlZiA9IG5vZGUub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy50b3AuZG9jdW1lbnQuVVJMO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHJlZiA9IHJlcXVlc3RPcmlnaW4gPyByZXF1ZXN0T3JpZ2luLnNwZWMgOiAnbnVsbCc7XG4gICAgfVxuICAgIGNvbnN0IHJlZlBhcnRzID0gVVJMSW5mby5nZXQocmVmKTtcbiAgICBpZiAoIXNhbWVHZW5lcmFsRG9tYWluKHVybFBhcnRzLmhvc3RuYW1lLCByZWZQYXJ0cy5ob3N0bmFtZSkpIHtcbiAgICAgIGlmICghKHJlZiBpbiB0aGlzLnJlcXVlc3RzMmRvbSkpIHtcbiAgICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXSA9IHt9O1xuICAgICAgfVxuICAgICAgdGhpcy5yZXF1ZXN0czJkb21bcmVmXVt1cmxdID0gbm9kZTtcbiAgICB9XG4gICAgcmV0dXJuIENpLm5zSUNvbnRlbnRQb2xpY3kuQUNDRVBUO1xuICB9LFxuXG4gIC8vIG5zSUZhY3RvcnkgaW50ZXJmYWNlIGltcGxlbWVudGF0aW9uXG4gIGNyZWF0ZUluc3RhbmNlKG91dGVyLCBpaWQpIHtcbiAgICBpZiAob3V0ZXIpIHtcbiAgICAgIHRocm93IENyLk5TX0VSUk9SX05PX0FHR1JFR0FUSU9OO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5RdWVyeUludGVyZmFjZShpaWQpO1xuICB9LFxuXG4gIC8vIG5zSVN1cHBvcnRzIGludGVyZmFjZSBpbXBsZW1lbnRhdGlvblxuICBRdWVyeUludGVyZmFjZTogWFBDT01VdGlscy5nZW5lcmF0ZVFJKFtDaS5uc0lDb250ZW50UG9saWN5LCBDaS5uc0lGYWN0b3J5XSksXG5cbiAgY2xlYW5VUCgpIHtcbiAgICAvLyBjbGVhbiB1cCBkZWFkIG9iamVjdHMgKGkuZS4gY2xvc2VkIHRhYnMpXG4gICAgT2JqZWN0LmtleXModGhpcy5yZXF1ZXN0czJkb20pLmZvckVhY2gocmVmID0+IHtcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucmVxdWVzdHMyZG9tW3JlZl0pLmZvckVhY2godXJsID0+IHtcbiAgICAgICAgaWYgKHRoaXMucmVxdWVzdHMyZG9tW3JlZl1bdXJsXSA9PT0gdW5kZWZpbmVkKSB7ICAvLyBpdCdzIGFuIGRlYWQgb2JqZWN0XG4gICAgICAgICAgZGVsZXRlIHRoaXMucmVxdWVzdHMyZG9tW3JlZl1bdXJsXTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGlmIChPYmplY3Qua2V5cyh0aGlzLnJlcXVlc3RzMmRvbVtyZWZdKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZGVsZXRlIHRoaXMucmVxdWVzdHMyZG9tW3JlZl07XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG59O1xuXG5leHBvcnQgZGVmYXVsdCBDb250ZW50UG9saWN5O1xuIl19