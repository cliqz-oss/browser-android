System.register('adblocker/filters-matching', [], function (_export) {
  // Some content policy types used in filters
  'use strict';

  var CPT;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  _export('default', match);

  function checkContentPolicy(filter, cpt) {
    // Check content policy type only if at least one content policy has
    // been specified in the options.
    if (!filter.fromAny) {
      var options = [[filter.fromSubdocument, CPT.TYPE_SUBDOCUMENT], [filter.fromImage, CPT.TYPE_IMAGE], [filter.fromMedia, CPT.TYPE_MEDIA], [filter.fromObject, CPT.TYPE_OBJECT], [filter.fromObjectSubrequest, CPT.TYPE_OBJECT_SUBREQUEST], [filter.fromOther, CPT.TYPE_OTHER], [filter.fromPing, CPT.TYPE_PING], [filter.fromScript, CPT.TYPE_SCRIPT], [filter.fromStylesheet, CPT.TYPE_STYLESHEET], [filter.fromXmlHttpRequest, CPT.TYPE_XMLHTTPREQUEST]];

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

    // Try to match url with pattern
    if (filter.isHostnameAnchor) {
      var matchIndex = host.indexOf(filter.hostname);
      // Either start at beginning of hostname or be preceded by a '.'
      if (matchIndex > 0 && host[matchIndex - 1] === '.' || matchIndex === 0) {
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
      CPT = {
        TYPE_OTHER: 1,
        TYPE_SCRIPT: 2,
        TYPE_IMAGE: 3,
        TYPE_STYLESHEET: 4,
        TYPE_OBJECT: 5,
        TYPE_SUBDOCUMENT: 7,
        TYPE_PING: 10,
        TYPE_XMLHTTPREQUEST: 11,
        TYPE_OBJECT_SUBREQUEST: 12,
        TYPE_MEDIA: 15
      };
    }
  };
});