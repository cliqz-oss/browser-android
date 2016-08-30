System.register("adblocker/filters-matching", [], function (_export) {
  // Some content policy types used in filters
  "use strict";

  var TYPE_OTHER, TYPE_SCRIPT, TYPE_IMAGE, TYPE_STYLESHEET, TYPE_OBJECT, TYPE_SUBDOCUMENT, TYPE_PING, TYPE_XMLHTTPREQUEST, TYPE_OBJECT_SUBREQUEST, TYPE_MEDIA;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

  _export("default", match);

  function checkContentPolicy(filter, cpt) {
    // Check content policy type only if at least one content policy has
    // been specified in the options.
    if (!filter.fromAny) {
      var options = [[filter.fromSubdocument, TYPE_SUBDOCUMENT], [filter.fromImage, TYPE_IMAGE], [filter.fromMedia, TYPE_MEDIA], [filter.fromObject, TYPE_OBJECT], [filter.fromObjectSubrequest, TYPE_OBJECT_SUBREQUEST], [filter.fromOther, TYPE_OTHER], [filter.fromPing, TYPE_PING], [filter.fromScript, TYPE_SCRIPT], [filter.fromStylesheet, TYPE_STYLESHEET], [filter.fromXmlHttpRequest, TYPE_XMLHTTPREQUEST]];

      // If content policy type `option` is specified in filter filter,
      // then the policy type of the request must match.
      // - If more than one policy type is valid, we must find at least one
      // - If we found a blacklisted policy type we can return `false`
      var foundValidCP = null;
      for (var i = 0; i < options.length; i++) {
        var _options$i = _slicedToArray(options[i], 2);

        var option = _options$i[0];
        var policyType = _options$i[1];

        // Found a fromX matching the origin policy of the request
        if (option === true) {
          if (cpt === policyType) {
            foundValidCP = true;
            break;
          } else {
            foundValidCP = false;
          }
        }

        // This rule can't be used with filter policy type
        if (option === false && cpt === policyType) {
          return false;
        }
      }

      // Couldn't find any policy origin matching the request
      if (foundValidCP === false) {
        return false;
      }
    }

    return true;
  }

  function checkOptions(filter, request) {
    // Source
    var sHost = request.sourceHostname;
    var sHostGD = request.sourceGD;

    // Url endpoint
    var hostGD = request.hostGD;

    // Check option $third-party
    // source domain and requested domain must be different
    if ((filter.firstParty === false || filter.thirdParty === true) && sHostGD === hostGD) {
      return false;
    }

    // $~third-party
    // source domain and requested domain must be the same
    if ((filter.firstParty === true || filter.thirdParty === false) && sHostGD !== hostGD) {
      return false;
    }

    // URL must be among these domains to match
    if (filter.optDomains !== null && !(filter.optDomains.has(sHostGD) || filter.optDomains.has(sHost))) {
      return false;
    }

    // URL must not be among these domains to match
    if (filter.optNotDomains !== null && (filter.optNotDomains.has(sHostGD) || filter.optNotDomains.has(sHost))) {
      return false;
    }

    if (!checkContentPolicy(filter, request.cpt)) {
      return false;
    }

    return true;
  }

  function checkPattern(filter, request) {
    var url = request.url;
    var host = request.hostname;
    var hostGD = request.hostGD;

    // Try to match url with pattern
    if (filter.isHostnameAnchor) {
      if (host.startsWith(filter.hostname) || hostGD.startsWith(filter.hostname) || host.endsWith(filter.hostname)) {
        // Extract only the part after the hostname
        var urlPattern = url.substring(url.indexOf(filter.hostname) + filter.hostname.length);
        if (filter.isRegex) {
          return filter.regex.test(urlPattern);
        }
        // TODO: Should startWith instead of includes?
        return urlPattern.startsWith(filter.filterStr);
      }
    } else {
      if (filter.isRegex) {
        return filter.regex.test(url);
      } else if (filter.isLeftAnchor) {
        return url.startsWith(filter.filterStr);
      } else if (filter.isRightAnchor) {
        return url.endsWith(filter.filterStr);
      }

      return url.includes(filter.filterStr);
    }

    return false;
  }

  function match(filter, request) {
    if (filter.supported) {
      if (!checkOptions(filter, request)) {
        return false;
      }

      return checkPattern(filter, request);
    }

    return false;
  }

  return {
    setters: [],
    execute: function () {
      TYPE_OTHER = 1;
      TYPE_SCRIPT = 2;
      TYPE_IMAGE = 3;
      TYPE_STYLESHEET = 4;
      TYPE_OBJECT = 5;
      TYPE_SUBDOCUMENT = 7;
      TYPE_PING = 10;
      TYPE_XMLHTTPREQUEST = 11;
      TYPE_OBJECT_SUBREQUEST = 12;
      TYPE_MEDIA = 15;
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9maWx0ZXJzLW1hdGNoaW5nLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7TUFDTSxVQUFVLEVBQ1YsV0FBVyxFQUNYLFVBQVUsRUFDVixlQUFlLEVBQ2YsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixTQUFTLEVBQ1QsbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixVQUFVOzs7O3FCQWtJUSxLQUFLOztBQS9IN0IsV0FBUyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFOzs7QUFHdkMsUUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUU7QUFDbkIsVUFBTSxPQUFPLEdBQUcsQ0FDZCxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsZ0JBQWdCLENBQUMsRUFDMUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUM5QixDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLEVBQzlCLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFDaEMsQ0FBQyxNQUFNLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUMsRUFDckQsQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxFQUM5QixDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLEVBQzVCLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFDaEMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxFQUN4QyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxtQkFBbUIsQ0FBQyxDQUNqRCxDQUFDOzs7Ozs7QUFNRixVQUFJLFlBQVksR0FBRyxJQUFJLENBQUM7QUFDeEIsV0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7d0NBQ1YsT0FBTyxDQUFDLENBQUMsQ0FBQzs7WUFBaEMsTUFBTTtZQUFF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Iiwic291cmNlc0NvbnRlbnQiOlsiLy8gU29tZSBjb250ZW50IHBvbGljeSB0eXBlcyB1c2VkIGluIGZpbHRlcnNcbmNvbnN0IFRZUEVfT1RIRVIgPSAxO1xuY29uc3QgVFlQRV9TQ1JJUFQgPSAyO1xuY29uc3QgVFlQRV9JTUFHRSA9IDM7XG5jb25zdCBUWVBFX1NUWUxFU0hFRVQgPSA0O1xuY29uc3QgVFlQRV9PQkpFQ1QgPSA1O1xuY29uc3QgVFlQRV9TVUJET0NVTUVOVCA9IDc7XG5jb25zdCBUWVBFX1BJTkcgPSAxMDtcbmNvbnN0IFRZUEVfWE1MSFRUUFJFUVVFU1QgPSAxMTtcbmNvbnN0IFRZUEVfT0JKRUNUX1NVQlJFUVVFU1QgPSAxMjtcbmNvbnN0IFRZUEVfTUVESUEgPSAxNTtcblxuXG5mdW5jdGlvbiBjaGVja0NvbnRlbnRQb2xpY3koZmlsdGVyLCBjcHQpIHtcbiAgLy8gQ2hlY2sgY29udGVudCBwb2xpY3kgdHlwZSBvbmx5IGlmIGF0IGxlYXN0IG9uZSBjb250ZW50IHBvbGljeSBoYXNcbiAgLy8gYmVlbiBzcGVjaWZpZWQgaW4gdGhlIG9wdGlvbnMuXG4gIGlmICghZmlsdGVyLmZyb21BbnkpIHtcbiAgICBjb25zdCBvcHRpb25zID0gW1xuICAgICAgW2ZpbHRlci5mcm9tU3ViZG9jdW1lbnQsIFRZUEVfU1VCRE9DVU1FTlRdLFxuICAgICAgW2ZpbHRlci5mcm9tSW1hZ2UsIFRZUEVfSU1BR0VdLFxuICAgICAgW2ZpbHRlci5mcm9tTWVkaWEsIFRZUEVfTUVESUFdLFxuICAgICAgW2ZpbHRlci5mcm9tT2JqZWN0LCBUWVBFX09CSkVDVF0sXG4gICAgICBbZmlsdGVyLmZyb21PYmplY3RTdWJyZXF1ZXN0LCBUWVBFX09CSkVDVF9TVUJSRVFVRVNUXSxcbiAgICAgIFtmaWx0ZXIuZnJvbU90aGVyLCBUWVBFX09USEVSXSxcbiAgICAgIFtmaWx0ZXIuZnJvbVBpbmcsIFRZUEVfUElOR10sXG4gICAgICBbZmlsdGVyLmZyb21TY3JpcHQsIFRZUEVfU0NSSVBUXSxcbiAgICAgIFtmaWx0ZXIuZnJvbVN0eWxlc2hlZXQsIFRZUEVfU1RZTEVTSEVFVF0sXG4gICAgICBbZmlsdGVyLmZyb21YbWxIdHRwUmVxdWVzdCwgVFlQRV9YTUxIVFRQUkVRVUVTVF0sXG4gICAgXTtcblxuICAgIC8vIElmIGNvbnRlbnQgcG9saWN5IHR5cGUgYG9wdGlvbmAgaXMgc3BlY2lmaWVkIGluIGZpbHRlciBmaWx0ZXIsXG4gICAgLy8gdGhlbiB0aGUgcG9saWN5IHR5cGUgb2YgdGhlIHJlcXVlc3QgbXVzdCBtYXRjaC5cbiAgICAvLyAtIElmIG1vcmUgdGhhbiBvbmUgcG9saWN5IHR5cGUgaXMgdmFsaWQsIHdlIG11c3QgZmluZCBhdCBsZWFzdCBvbmVcbiAgICAvLyAtIElmIHdlIGZvdW5kIGEgYmxhY2tsaXN0ZWQgcG9saWN5IHR5cGUgd2UgY2FuIHJldHVybiBgZmFsc2VgXG4gICAgbGV0IGZvdW5kVmFsaWRDUCA9IG51bGw7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvcHRpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBbb3B0aW9uLCBwb2xpY3lUeXBlXSA9IG9wdGlvbnNbaV07XG5cbiAgICAgIC8vIEZvdW5kIGEgZnJvbVggbWF0Y2hpbmcgdGhlIG9yaWdpbiBwb2xpY3kgb2YgdGhlIHJlcXVlc3RcbiAgICAgIGlmIChvcHRpb24gPT09IHRydWUpIHtcbiAgICAgICAgaWYgKGNwdCA9PT0gcG9saWN5VHlwZSkge1xuICAgICAgICAgIGZvdW5kVmFsaWRDUCA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm91bmRWYWxpZENQID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gVGhpcyBydWxlIGNhbid0IGJlIHVzZWQgd2l0aCBmaWx0ZXIgcG9saWN5IHR5cGVcbiAgICAgIGlmIChvcHRpb24gPT09IGZhbHNlICYmIGNwdCA9PT0gcG9saWN5VHlwZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ291bGRuJ3QgZmluZCBhbnkgcG9saWN5IG9yaWdpbiBtYXRjaGluZyB0aGUgcmVxdWVzdFxuICAgIGlmIChmb3VuZFZhbGlkQ1AgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59XG5cblxuZnVuY3Rpb24gY2hlY2tPcHRpb25zKGZpbHRlciwgcmVxdWVzdCkge1xuICAvLyBTb3VyY2VcbiAgY29uc3Qgc0hvc3QgPSByZXF1ZXN0LnNvdXJjZUhvc3RuYW1lO1xuICBjb25zdCBzSG9zdEdEID0gcmVxdWVzdC5zb3VyY2VHRDtcblxuICAvLyBVcmwgZW5kcG9pbnRcbiAgY29uc3QgaG9zdEdEID0gcmVxdWVzdC5ob3N0R0Q7XG5cbiAgLy8gQ2hlY2sgb3B0aW9uICR0aGlyZC1wYXJ0eVxuICAvLyBzb3VyY2UgZG9tYWluIGFuZCByZXF1ZXN0ZWQgZG9tYWluIG11c3QgYmUgZGlmZmVyZW50XG4gIGlmICgoZmlsdGVyLmZpcnN0UGFydHkgPT09IGZhbHNlIHx8IGZpbHRlci50aGlyZFBhcnR5ID09PSB0cnVlKSAmJiBzSG9zdEdEID09PSBob3N0R0QpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyAkfnRoaXJkLXBhcnR5XG4gIC8vIHNvdXJjZSBkb21haW4gYW5kIHJlcXVlc3RlZCBkb21haW4gbXVzdCBiZSB0aGUgc2FtZVxuICBpZiAoKGZpbHRlci5maXJzdFBhcnR5ID09PSB0cnVlIHx8IGZpbHRlci50aGlyZFBhcnR5ID09PSBmYWxzZSkgJiYgc0hvc3RHRCAhPT0gaG9zdEdEKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLy8gVVJMIG11c3QgYmUgYW1vbmcgdGhlc2UgZG9tYWlucyB0byBtYXRjaFxuICBpZiAoZmlsdGVyLm9wdERvbWFpbnMgIT09IG51bGwgJiZcbiAgICAgIShmaWx0ZXIub3B0RG9tYWlucy5oYXMoc0hvc3RHRCkgfHxcbiAgICAgICBmaWx0ZXIub3B0RG9tYWlucy5oYXMoc0hvc3QpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIFVSTCBtdXN0IG5vdCBiZSBhbW9uZyB0aGVzZSBkb21haW5zIHRvIG1hdGNoXG4gIGlmIChmaWx0ZXIub3B0Tm90RG9tYWlucyAhPT0gbnVsbCAmJlxuICAgICAgKGZpbHRlci5vcHROb3REb21haW5zLmhhcyhzSG9zdEdEKSB8fFxuICAgICAgIGZpbHRlci5vcHROb3REb21haW5zLmhhcyhzSG9zdCkpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaWYgKCFjaGVja0NvbnRlbnRQb2xpY3koZmlsdGVyLCByZXF1ZXN0LmNwdCkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuXG5mdW5jdGlvbiBjaGVja1BhdHRlcm4oZmlsdGVyLCByZXF1ZXN0KSB7XG4gIGNvbnN0IHVybCA9IHJlcXVlc3QudXJsO1xuICBjb25zdCBob3N0ID0gcmVxdWVzdC5ob3N0bmFtZTtcbiAgY29uc3QgaG9zdEdEID0gcmVxdWVzdC5ob3N0R0Q7XG5cbiAgLy8gVHJ5IHRvIG1hdGNoIHVybCB3aXRoIHBhdHRlcm5cbiAgaWYgKGZpbHRlci5pc0hvc3RuYW1lQW5jaG9yKSB7XG4gICAgaWYgKGhvc3Quc3RhcnRzV2l0aChmaWx0ZXIuaG9zdG5hbWUpIHx8XG4gICAgICAgIGhvc3RHRC5zdGFydHNXaXRoKGZpbHRlci5ob3N0bmFtZSkgfHxcbiAgICAgICAgaG9zdC5lbmRzV2l0aChmaWx0ZXIuaG9zdG5hbWUpKSB7XG4gICAgICAvLyBFeHRyYWN0IG9ubHkgdGhlIHBhcnQgYWZ0ZXIgdGhlIGhvc3RuYW1lXG4gICAgICBjb25zdCB1cmxQYXR0ZXJuID0gdXJsLnN1YnN0cmluZyh1cmwuaW5kZXhPZihmaWx0ZXIuaG9zdG5hbWUpICsgZmlsdGVyLmhvc3RuYW1lLmxlbmd0aCk7XG4gICAgICBpZiAoZmlsdGVyLmlzUmVnZXgpIHtcbiAgICAgICAgcmV0dXJuIGZpbHRlci5yZWdleC50ZXN0KHVybFBhdHRlcm4pO1xuICAgICAgfVxuICAgICAgLy8gVE9ETzogU2hvdWxkIHN0YXJ0V2l0aCBpbnN0ZWFkIG9mIGluY2x1ZGVzP1xuICAgICAgcmV0dXJuIHVybFBhdHRlcm4uc3RhcnRzV2l0aChmaWx0ZXIuZmlsdGVyU3RyKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKGZpbHRlci5pc1JlZ2V4KSB7XG4gICAgICByZXR1cm4gZmlsdGVyLnJlZ2V4LnRlc3QodXJsKTtcbiAgICB9IGVsc2UgaWYgKGZpbHRlci5pc0xlZnRBbmNob3IpIHtcbiAgICAgIHJldHVybiB1cmwuc3RhcnRzV2l0aChmaWx0ZXIuZmlsdGVyU3RyKTtcbiAgICB9IGVsc2UgaWYgKGZpbHRlci5pc1JpZ2h0QW5jaG9yKSB7XG4gICAgICByZXR1cm4gdXJsLmVuZHNXaXRoKGZpbHRlci5maWx0ZXJTdHIpO1xuICAgIH1cblxuICAgIHJldHVybiB1cmwuaW5jbHVkZXMoZmlsdGVyLmZpbHRlclN0cik7XG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gbWF0Y2goZmlsdGVyLCByZXF1ZXN0KSB7XG4gIGlmIChmaWx0ZXIuc3VwcG9ydGVkKSB7XG4gICAgaWYgKCFjaGVja09wdGlvbnMoZmlsdGVyLCByZXF1ZXN0KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiBjaGVja1BhdHRlcm4oZmlsdGVyLCByZXF1ZXN0KTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cbiJdfQ==