System.register('adblocker/cosmetics', ['adblocker/content-policy', 'adblocker/adblocker', 'adblocker/utils'], function (_export) {
  'use strict';

  var ContentPolicy, CliqzADB, autoBlockAds, log, MAX_CHILDREN, MIN_CHILDREN_HEIGHT, MIN_EXPAND_RATE, CONTENT_TAG;

  function isVideoFrame(frame) {
    var doc = frame.contentWindow.document;
    return doc.querySelectorAll('VIDEO').length > 0;
  }

  function isPossibleContent(node) {
    // normal size video frame
    // const isVideoFrame =  node.offsetHeight >= 360 && node.offsetWidth >= 640;

    if (!node.ownerDocument || !node.ownerDocument.body) {
      return true;
    }
    // if the node is bigger than 1/3 of the body height and height, we consider it as content
    var bigContent = node.offsetHeight / node.ownerDocument.body.offsetHeight > 0.33 && node.offsetWidth / node.ownerDocument.body.offsetWidth > 0.33;

    log(node.offsetHeight + ' ' + node.offsetWidth + (node.ownerDocument.body.offsetHeight + ' ') + (node.ownerDocument.body.offsetWidth + ' ') + ('' + node.className));

    return bigContent;
  }

  function countChildren(node) {
    var count = 0;
    if (!node || !node.children) {
      return count;
    }
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = node.children[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var n = _step.value;

        // ignore empty nodes
        try {
          if (n.style.display === 'none' && n.innerHTML === '' && n.tagName !== 'IFRAME') {
            continue;
          }
        } catch (e) {/* Ignore exception */}

        var tag = n.tagName;
        if (CONTENT_TAG.has(tag)) {
          count++;
        }
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator['return']) {
          _iterator['return']();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }

    log(node.id + ' ' + node.tagName + ' ' + node.className + ' ' + count);
    return count;
  }

  function areaIncreased(child, parent) {
    var aChild = child.offsetHeight * child.offsetWidth;
    var aParent = parent.offsetHeight * parent.offsetWidth;
    if (aChild === 0) {
      return 10000;
    }
    return (aParent - aChild) / aChild;
  }

  function compareChildrenHeight(node) {
    var pct = 1;
    if (!node || !node.children) {
      return pct;
    }
    if (node.offsetHeight === 0) {
      return 0;
    }

    var childrenHeight = 0;
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = node.children[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var n = _step2.value;

        childrenHeight += n.offsetHeight;
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
          _iterator2['return']();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    return childrenHeight / node.offsetHeight;
  }

  function locateParent(node) {
    // Given a source node of ad request, find the possible parent node containing the ad
    var searchHistory = [];
    searchHistory.push(node.id + ' ' + node.className + ' ' + node.tagName);
    if (!node.parentNode) {
      log(searchHistory);
      return node;
    }

    var child = node;
    var parent = node.parentNode;
    var isWholeDoc = function isWholeDoc(n) {
      return n.nodeName === '#document' || n.tagName === 'BODY' || n.nodeName === 'HTML';
    };

    var _iteratorNormalCompletion3 = true;
    var _didIteratorError3 = false;
    var _iteratorError3 = undefined;

    try {
      for (var _iterator3 = parent.children[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
        var c = _step3.value;

        if (countChildren(c) >= MAX_CHILDREN || isPossibleContent(c)) {
          return child;
        }
      }
    } catch (err) {
      _didIteratorError3 = true;
      _iteratorError3 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion3 && _iterator3['return']) {
          _iterator3['return']();
        }
      } finally {
        if (_didIteratorError3) {
          throw _iteratorError3;
        }
      }
    }

    while (parent && !isWholeDoc(parent)) {
      var count = countChildren(parent);
      var incr = areaIncreased(child, parent);
      var childrenHeight = compareChildrenHeight(parent);
      if ((count <= MAX_CHILDREN || incr < MIN_EXPAND_RATE || childrenHeight < MIN_CHILDREN_HEIGHT) && !isPossibleContent(parent)) {
        child.setAttribute('cliqz-adb-blocked', 'parent');
        child = parent;
        parent = parent.parentNode;
        searchHistory.push(child.id + ' ' + child.className + ' ' + child.tagName + ' ' + count + ' ' + incr);
      } else {
        break;
      }
    }
    log(searchHistory);
    log(child.id + ' ' + child.tagName + ' ' + child.className);

    return child;
  }

  function checkFrame(tabId, frameId, url) {
    if (!CliqzADB.cacheADB) {
      CliqzADB.cacheADB = {};
    }
    if (!CliqzADB.cacheADB[tabId]) {
      // TODO: need to clean these
      CliqzADB.cacheADB[tabId] = [];
    }

    var curID = frameId;
    if (curID) {
      log('frame id ' + curID);
      CliqzADB.cacheADB[tabId].push(curID);
    }

    var tmp = [];
    var _iteratorNormalCompletion4 = true;
    var _didIteratorError4 = false;
    var _iteratorError4 = undefined;

    try {
      for (var _iterator4 = CliqzADB.cacheADB[tabId][Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
        var d = _step4.value;

        if (!(tabId in CliqzADB.mutationLogger.tabsInfo)) {
          continue;
        }
        var nInfo = CliqzADB.mutationLogger.tabsInfo[tabId].nodes;
        if (d in nInfo.id2count) {
          log('found ' + d + ' ' + nInfo.id2count[d]);
          var count = nInfo.id2count[d];
          var _iteratorNormalCompletion5 = true;
          var _didIteratorError5 = false;
          var _iteratorError5 = undefined;

          try {
            for (var _iterator5 = nInfo.count2node[count][Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
              var n = _step5.value;

              if (n === undefined || n.tagName !== 'IFRAME' || n.getAttribute('cliqz-adblocker' === 'safe')) {
                continue;
              }

              n = locateParent(n);
              if (n.getAttribute('cliqz-adblocker') !== 'safe') {
                if (!isPossibleContent(n)) {
                  n.style.display = 'none';
                  try {
                    n.setAttribute('cliqz-adb', 'from source1: ' + url);
                  } catch (e) {/* Ignore exception */}
                }
              }
            }
          } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                _iterator5['return']();
              }
            } finally {
              if (_didIteratorError5) {
                throw _iteratorError5;
              }
            }
          }
        } else {
            tmp.push(curID);
          }
      }
    } catch (err) {
      _didIteratorError4 = true;
      _iteratorError4 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
          _iterator4['return']();
        }
      } finally {
        if (_didIteratorError4) {
          throw _iteratorError4;
        }
      }
    }

    CliqzADB.cacheADB[tabId] = tmp;
  }

  function locateSource(requestContext) {
    var source = requestContext.getSourceURL();
    var url = requestContext.url;
    var sourceNode = null;

    if (source in ContentPolicy.requests2dom && !(url in ContentPolicy.requests2dom[source])) {
      source = requestContext.getReferrer();
    }

    if (source in ContentPolicy.requests2dom && url in ContentPolicy.requests2dom[source]) {
      sourceNode = ContentPolicy.requests2dom[source][url];
    } else {
      // fall back to the frame if possible
      var outWinId = requestContext.getOuterWindowID();
      var oriWinId = requestContext.getOriginWindowID();
      if (outWinId !== oriWinId) {
        var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
        sourceNode = wm.getOuterWindowWithId(outWinId).frameElement;
      }
    }
    return sourceNode;
  }

  function isFromFrame(requestContext) {
    return requestContext.getOuterWindowID() !== requestContext.getOriginWindowID();
    // return node.tagName === 'IFRAME';
  }

  function containsVideo(node) {
    try {
      if (node.querySelectorAll('VIDEO').length > 0) {
        return true;
      }

      var _frames = node.querySelectorAll('IFRAME');
      var _iteratorNormalCompletion6 = true;
      var _didIteratorError6 = false;
      var _iteratorError6 = undefined;

      try {
        for (var _iterator6 = _frames[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
          var frame = _step6.value;

          if (isVideoFrame(frame)) {
            return true;
          }
        }
      } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion6 && _iterator6['return']) {
            _iterator6['return']();
          }
        } finally {
          if (_didIteratorError6) {
            throw _iteratorError6;
          }
        }
      }
    } catch (ex) {/* Ignore exception */}

    return false;
  }

  function isFlash(node) {
    if (node.tagName === 'OBJECT' && node.getAttribute('type') === 'application/x-shockwave-flash') {
      return true;
    }

    return false;
  }

  function markNodeAsSafe(node) {
    try {
      node.setAttribute('cliqz-adblocker', 'safe');
    } catch (e) {/* Ignore exception */}
  }

  function hide(node, url, source) {
    if (autoBlockAds()) {
      try {
        if (node.getAttribute('cliqz-adblocker') === 'safe') {
          return;
        }
        node.style.display = 'none';
        node.setAttribute('cliqz-adb-blocked', 'from source: ' + url);
      } catch (e) {/* Ignore exception */}
      CliqzADB.adbStats.pages[source] = (CliqzADB.adbStats.pages[source] || 0) + 1;
    }
  }

  function hideNodes(requestContext) {
    log('hideNodes for ' + requestContext.url);
    var source = locateSource(requestContext);
    if (!source) {
      return; // We cannot do anything if we failed to determin the element originated the request
    }

    if (containsVideo(source)) {
      markNodeAsSafe(source);
      return;
    }

    if (isFlash(source) && source.getAttribute('data') !== requestContext.url) {
      return;
    }

    hide(locateParent(source), requestContext.url, requestContext.getSourceURL());

    if (isFromFrame(requestContext)) {
      // hideCompanyFrames(source);
      var wm = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
      var outWinId = requestContext.getOuterWindowID();
      var frame = wm.getOuterWindowWithId(outWinId).frameElement;
      if (isVideoFrame(frame) || isPossibleContent(frame)) {
        markNodeAsSafe(frame);
        return;
      }
      hide(locateParent(frame), requestContext.url, requestContext.getSourceURL());
      CliqzADB.mutationLogger.addFrameMutationObserver(outWinId, frame.contentWindow.document);
      checkFrame(requestContext.getOriginWindowID(), frame.id, requestContext.url, false);
    }
  }

  return {
    setters: [function (_adblockerContentPolicy) {
      ContentPolicy = _adblockerContentPolicy['default'];
    }, function (_adblockerAdblocker) {
      CliqzADB = _adblockerAdblocker['default'];
      autoBlockAds = _adblockerAdblocker.autoBlockAds;
    }, function (_adblockerUtils) {
      log = _adblockerUtils.log;
    }],
    execute: function () {
      MAX_CHILDREN = 1;

      _export('MAX_CHILDREN', MAX_CHILDREN);

      MIN_CHILDREN_HEIGHT = 0.1;
      MIN_EXPAND_RATE = 0.05;
      CONTENT_TAG = new Set(['DIV', 'IFRAME', 'LI', 'SECTION', 'A', 'UL', 'P', 'SPAN', 'ARTICLE', 'INPUT', 'MAIN', 'HEADER', 'VIDEO', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'FOOTER', 'BR']);

      _export('hideNodes', hideNodes);

      _export('locateParent', locateParent);

      _export('checkFrame', checkFrame);

      _export('countChildren', countChildren);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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SUFBSSxHQUFHLENBQUMsQ0FDMUIsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUNoRCxNQUFNLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQzdELElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FDN0MsQ0FBQzs7MkJBOFJBLFNBQVM7OzhCQUNULFlBQVk7OzRCQUNaLFVBQVU7OytCQUNWLGFBQWEiLCJmaWxlIjoiYWRibG9ja2VyL2Nvc21ldGljcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBDb250ZW50UG9saWN5IGZyb20gJ2FkYmxvY2tlci9jb250ZW50LXBvbGljeSc7XG5pbXBvcnQgQ2xpcXpBREIsIHsgYXV0b0Jsb2NrQWRzIH0gZnJvbSAnYWRibG9ja2VyL2FkYmxvY2tlcic7XG5pbXBvcnQgeyBsb2cgfSBmcm9tICdhZGJsb2NrZXIvdXRpbHMnO1xuXG5cbmV4cG9ydCBjb25zdCBNQVhfQ0hJTERSRU4gPSAxO1xuY29uc3QgTUlOX0NISUxEUkVOX0hFSUdIVCA9IDAuMTtcbmNvbnN0IE1JTl9FWFBBTkRfUkFURSA9IDAuMDU7XG5jb25zdCBDT05URU5UX1RBRyA9IG5ldyBTZXQoW1xuICAnRElWJywgJ0lGUkFNRScsICdMSScsICdTRUNUSU9OJywgJ0EnLCAnVUwnLCAnUCcsXG4gICdTUEFOJywgJ0FSVElDTEUnLCAnSU5QVVQnLCAnTUFJTicsICdIRUFERVInLCAnVklERU8nLCAnRk9STScsXG4gICdIMScsICdIMicsICdIMycsICdINCcsICdINScsICdGT09URVInLCAnQlInLFxuXSk7XG5cblxuZnVuY3Rpb24gaXNWaWRlb0ZyYW1lKGZyYW1lKSB7XG4gIGNvbnN0IGRvYyA9IGZyYW1lLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQ7XG4gIHJldHVybiBkb2MucXVlcnlTZWxlY3RvckFsbCgnVklERU8nKS5sZW5ndGggPiAwO1xufVxuXG5cbmZ1bmN0aW9uIGlzUG9zc2libGVDb250ZW50KG5vZGUpIHtcbiAgLy8gbm9ybWFsIHNpemUgdmlkZW8gZnJhbWVcbiAgLy8gY29uc3QgaXNWaWRlb0ZyYW1lID0gIG5vZGUub2Zmc2V0SGVpZ2h0ID49IDM2MCAmJiBub2RlLm9mZnNldFdpZHRoID49IDY0MDtcblxuICBpZiAoIW5vZGUub3duZXJEb2N1bWVudCB8fCAhbm9kZS5vd25lckRvY3VtZW50LmJvZHkpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICAvLyBpZiB0aGUgbm9kZSBpcyBiaWdnZXIgdGhhbiAxLzMgb2YgdGhlIGJvZHkgaGVpZ2h0IGFuZCBoZWlnaHQsIHdlIGNvbnNpZGVyIGl0IGFzIGNvbnRlbnRcbiAgY29uc3QgYmlnQ29udGVudCA9IG5vZGUub2Zmc2V0SGVpZ2h0IC8gbm9kZS5vd25lckRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0ID4gMC4zMyAmJlxuICAgICAgICAgICAgICAgICAgICAgbm9kZS5vZmZzZXRXaWR0aCAvIG5vZGUub3duZXJEb2N1bWVudC5ib2R5Lm9mZnNldFdpZHRoID4gMC4zMztcblxuICBsb2coYCR7bm9kZS5vZmZzZXRIZWlnaHR9ICR7bm9kZS5vZmZzZXRXaWR0aH1gICtcbiAgICAgIGAke25vZGUub3duZXJEb2N1bWVudC5ib2R5Lm9mZnNldEhlaWdodH0gYCArXG4gICAgICBgJHtub2RlLm93bmVyRG9jdW1lbnQuYm9keS5vZmZzZXRXaWR0aH0gYCArXG4gICAgICBgJHtub2RlLmNsYXNzTmFtZX1gKTtcblxuICByZXR1cm4gYmlnQ29udGVudDtcbn1cblxuXG5mdW5jdGlvbiBjb3VudENoaWxkcmVuKG5vZGUpIHtcbiAgbGV0IGNvdW50ID0gMDtcbiAgaWYgKCFub2RlIHx8ICFub2RlLmNoaWxkcmVuKSB7XG4gICAgcmV0dXJuIGNvdW50O1xuICB9XG4gIGZvciAoY29uc3QgbiBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgLy8gaWdub3JlIGVtcHR5IG5vZGVzXG4gICAgdHJ5IHtcbiAgICAgIGlmIChuLnN0eWxlLmRpc3BsYXkgPT09ICdub25lJyAmJiBuLmlubmVySFRNTCA9PT0gJycgJiYgbi50YWdOYW1lICE9PSAnSUZSQU1FJykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7IC8qIElnbm9yZSBleGNlcHRpb24gKi8gfVxuXG4gICAgY29uc3QgdGFnID0gbi50YWdOYW1lO1xuICAgIGlmIChDT05URU5UX1RBRy5oYXModGFnKSkge1xuICAgICAgY291bnQrKztcbiAgICB9XG4gIH1cbiAgbG9nKGAke25vZGUuaWR9ICR7bm9kZS50YWdOYW1lfSAke25vZGUuY2xhc3NOYW1lfSAke2NvdW50fWApO1xuICByZXR1cm4gY291bnQ7XG59XG5cblxuZnVuY3Rpb24gYXJlYUluY3JlYXNlZChjaGlsZCwgcGFyZW50KSB7XG4gIGNvbnN0IGFDaGlsZCA9IGNoaWxkLm9mZnNldEhlaWdodCAqIGNoaWxkLm9mZnNldFdpZHRoO1xuICBjb25zdCBhUGFyZW50ID0gcGFyZW50Lm9mZnNldEhlaWdodCAqIHBhcmVudC5vZmZzZXRXaWR0aDtcbiAgaWYgKGFDaGlsZCA9PT0gMCkge1xuICAgIHJldHVybiAxMDAwMDtcbiAgfVxuICByZXR1cm4gKGFQYXJlbnQgLSBhQ2hpbGQpIC8gYUNoaWxkO1xufVxuXG5cbmZ1bmN0aW9uIGNvbXBhcmVDaGlsZHJlbkhlaWdodChub2RlKSB7XG4gIGNvbnN0IHBjdCA9IDE7XG4gIGlmICghbm9kZSB8fCAhbm9kZS5jaGlsZHJlbikge1xuICAgIHJldHVybiBwY3Q7XG4gIH1cbiAgaWYgKG5vZGUub2Zmc2V0SGVpZ2h0ID09PSAwKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICBsZXQgY2hpbGRyZW5IZWlnaHQgPSAwO1xuICBmb3IgKGNvbnN0IG4gb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgIGNoaWxkcmVuSGVpZ2h0ICs9IG4ub2Zmc2V0SGVpZ2h0O1xuICB9XG4gIHJldHVybiBjaGlsZHJlbkhlaWdodCAvIG5vZGUub2Zmc2V0SGVpZ2h0O1xufVxuXG5cbmZ1bmN0aW9uIGxvY2F0ZVBhcmVudChub2RlKSB7XG4gIC8vIEdpdmVuIGEgc291cmNlIG5vZGUgb2YgYWQgcmVxdWVzdCwgZmluZCB0aGUgcG9zc2libGUgcGFyZW50IG5vZGUgY29udGFpbmluZyB0aGUgYWRcbiAgY29uc3Qgc2VhcmNoSGlzdG9yeSA9IFtdO1xuICBzZWFyY2hIaXN0b3J5LnB1c2goYCR7bm9kZS5pZH0gJHtub2RlLmNsYXNzTmFtZX0gJHtub2RlLnRhZ05hbWV9YCk7XG4gIGlmICghbm9kZS5wYXJlbnROb2RlKSB7XG4gICAgbG9nKHNlYXJjaEhpc3RvcnkpO1xuICAgIHJldHVybiBub2RlO1xuICB9XG5cbiAgbGV0IGNoaWxkID0gbm9kZTtcbiAgbGV0IHBhcmVudCA9IG5vZGUucGFyZW50Tm9kZTtcbiAgY29uc3QgaXNXaG9sZURvYyA9IGZ1bmN0aW9uIGlzV2hvbGVEb2Mobikge1xuICAgIHJldHVybiBuLm5vZGVOYW1lID09PSAnI2RvY3VtZW50JyB8fCBuLnRhZ05hbWUgPT09ICdCT0RZJyB8fCBuLm5vZGVOYW1lID09PSAnSFRNTCc7XG4gIH07XG5cbiAgZm9yIChjb25zdCBjIG9mIHBhcmVudC5jaGlsZHJlbikge1xuICAgIGlmIChjb3VudENoaWxkcmVuKGMpID49IE1BWF9DSElMRFJFTiB8fCBpc1Bvc3NpYmxlQ29udGVudChjKSkge1xuICAgICAgcmV0dXJuIGNoaWxkO1xuICAgIH1cbiAgfVxuXG4gIHdoaWxlIChwYXJlbnQgJiYgIWlzV2hvbGVEb2MocGFyZW50KSkge1xuICAgIGNvbnN0IGNvdW50ID0gY291bnRDaGlsZHJlbihwYXJlbnQpO1xuICAgIGNvbnN0IGluY3IgPSBhcmVhSW5jcmVhc2VkKGNoaWxkLCBwYXJlbnQpO1xuICAgIGNvbnN0IGNoaWxkcmVuSGVpZ2h0ID0gY29tcGFyZUNoaWxkcmVuSGVpZ2h0KHBhcmVudCk7XG4gICAgaWYgKChjb3VudCA8PSBNQVhfQ0hJTERSRU4gfHxcbiAgICAgICAgICBpbmNyIDwgTUlOX0VYUEFORF9SQVRFIHx8XG4gICAgICAgICAgY2hpbGRyZW5IZWlnaHQgPCBNSU5fQ0hJTERSRU5fSEVJR0hUKSAmJlxuICAgICAgICAhaXNQb3NzaWJsZUNvbnRlbnQocGFyZW50KSkge1xuICAgICAgY2hpbGQuc2V0QXR0cmlidXRlKCdjbGlxei1hZGItYmxvY2tlZCcsICdwYXJlbnQnKTtcbiAgICAgIGNoaWxkID0gcGFyZW50O1xuICAgICAgcGFyZW50ID0gcGFyZW50LnBhcmVudE5vZGU7XG4gICAgICBzZWFyY2hIaXN0b3J5LnB1c2goYCR7Y2hpbGQuaWR9ICR7Y2hpbGQuY2xhc3NOYW1lfSAke2NoaWxkLnRhZ05hbWV9ICR7Y291bnR9ICR7aW5jcn1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGxvZyhzZWFyY2hIaXN0b3J5KTtcbiAgbG9nKGAke2NoaWxkLmlkfSAke2NoaWxkLnRhZ05hbWV9ICR7Y2hpbGQuY2xhc3NOYW1lfWApO1xuXG4gIHJldHVybiBjaGlsZDtcbn1cblxuXG5mdW5jdGlvbiBjaGVja0ZyYW1lKHRhYklkLCBmcmFtZUlkLCB1cmwpIHtcbiAgaWYgKCFDbGlxekFEQi5jYWNoZUFEQikge1xuICAgIENsaXF6QURCLmNhY2hlQURCID0ge307XG4gIH1cbiAgaWYgKCFDbGlxekFEQi5jYWNoZUFEQlt0YWJJZF0pIHtcbiAgICAvLyBUT0RPOiBuZWVkIHRvIGNsZWFuIHRoZXNlXG4gICAgQ2xpcXpBREIuY2FjaGVBREJbdGFiSWRdID0gW107XG4gIH1cblxuICBjb25zdCBjdXJJRCA9IGZyYW1lSWQ7XG4gIGlmIChjdXJJRCkge1xuICAgIGxvZyhgZnJhbWUgaWQgJHtjdXJJRH1gKTtcbiAgICBDbGlxekFEQi5jYWNoZUFEQlt0YWJJZF0ucHVzaChjdXJJRCk7XG4gIH1cblxuICBjb25zdCB0bXAgPSBbXTtcbiAgZm9yIChjb25zdCBkIG9mIENsaXF6QURCLmNhY2hlQURCW3RhYklkXSkge1xuICAgIGlmICghKHRhYklkIGluIENsaXF6QURCLm11dGF0aW9uTG9nZ2VyLnRhYnNJbmZvKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IG5JbmZvID0gQ2xpcXpBREIubXV0YXRpb25Mb2dnZXIudGFic0luZm9bdGFiSWRdLm5vZGVzO1xuICAgIGlmIChkIGluIG5JbmZvLmlkMmNvdW50KSB7XG4gICAgICBsb2coYGZvdW5kICR7ZH0gJHtuSW5mby5pZDJjb3VudFtkXX1gKTtcbiAgICAgIGNvbnN0IGNvdW50ID0gbkluZm8uaWQyY291bnRbZF07XG4gICAgICBmb3IgKGxldCBuIG9mIG5JbmZvLmNvdW50Mm5vZGVbY291bnRdKSB7XG4gICAgICAgIGlmIChuID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICAgIG4udGFnTmFtZSAhPT0gJ0lGUkFNRScgfHxcbiAgICAgICAgICAgIG4uZ2V0QXR0cmlidXRlKCdjbGlxei1hZGJsb2NrZXInID09PSAnc2FmZScpKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBuID0gbG9jYXRlUGFyZW50KG4pO1xuICAgICAgICBpZiAobi5nZXRBdHRyaWJ1dGUoJ2NsaXF6LWFkYmxvY2tlcicpICE9PSAnc2FmZScpIHtcbiAgICAgICAgICBpZiAoIWlzUG9zc2libGVDb250ZW50KG4pKSB7XG4gICAgICAgICAgICBuLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBuLnNldEF0dHJpYnV0ZSgnY2xpcXotYWRiJywgYGZyb20gc291cmNlMTogJHt1cmx9YCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IC8qIElnbm9yZSBleGNlcHRpb24gKi8gfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0bXAucHVzaChjdXJJRCk7XG4gICAgfVxuICB9XG4gIENsaXF6QURCLmNhY2hlQURCW3RhYklkXSA9IHRtcDtcbn1cblxuXG5mdW5jdGlvbiBsb2NhdGVTb3VyY2UocmVxdWVzdENvbnRleHQpIHtcbiAgbGV0IHNvdXJjZSA9IHJlcXVlc3RDb250ZXh0LmdldFNvdXJjZVVSTCgpO1xuICBjb25zdCB1cmwgPSByZXF1ZXN0Q29udGV4dC51cmw7XG4gIGxldCBzb3VyY2VOb2RlID0gbnVsbDtcblxuICBpZiAoc291cmNlIGluIENvbnRlbnRQb2xpY3kucmVxdWVzdHMyZG9tICYmICEodXJsIGluIENvbnRlbnRQb2xpY3kucmVxdWVzdHMyZG9tW3NvdXJjZV0pKSB7XG4gICAgc291cmNlID0gcmVxdWVzdENvbnRleHQuZ2V0UmVmZXJyZXIoKTtcbiAgfVxuXG4gIGlmIChzb3VyY2UgaW4gQ29udGVudFBvbGljeS5yZXF1ZXN0czJkb20gJiYgdXJsIGluIENvbnRlbnRQb2xpY3kucmVxdWVzdHMyZG9tW3NvdXJjZV0pIHtcbiAgICBzb3VyY2VOb2RlID0gQ29udGVudFBvbGljeS5yZXF1ZXN0czJkb21bc291cmNlXVt1cmxdO1xuICB9IGVsc2Uge1xuICAgIC8vIGZhbGwgYmFjayB0byB0aGUgZnJhbWUgaWYgcG9zc2libGVcbiAgICBjb25zdCBvdXRXaW5JZCA9IHJlcXVlc3RDb250ZXh0LmdldE91dGVyV2luZG93SUQoKTtcbiAgICBjb25zdCBvcmlXaW5JZCA9IHJlcXVlc3RDb250ZXh0LmdldE9yaWdpbldpbmRvd0lEKCk7XG4gICAgaWYgKG91dFdpbklkICE9PSBvcmlXaW5JZCkge1xuICAgICAgY29uc3Qgd20gPSBDb21wb25lbnRzLmNsYXNzZXNbJ0Btb3ppbGxhLm9yZy9hcHBzaGVsbC93aW5kb3ctbWVkaWF0b3I7MSddXG4gICAgICAgIC5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lXaW5kb3dNZWRpYXRvcik7XG4gICAgICBzb3VyY2VOb2RlID0gd20uZ2V0T3V0ZXJXaW5kb3dXaXRoSWQob3V0V2luSWQpLmZyYW1lRWxlbWVudDtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHNvdXJjZU5vZGU7XG59XG5cblxuZnVuY3Rpb24gaXNGcm9tRnJhbWUocmVxdWVzdENvbnRleHQpIHtcbiAgcmV0dXJuIHJlcXVlc3RDb250ZXh0LmdldE91dGVyV2luZG93SUQoKSAhPT0gcmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKTtcbiAgLy8gcmV0dXJuIG5vZGUudGFnTmFtZSA9PT0gJ0lGUkFNRSc7XG59XG5cblxuZnVuY3Rpb24gY29udGFpbnNWaWRlbyhub2RlKSB7XG4gIHRyeSB7XG4gICAgaWYgKG5vZGUucXVlcnlTZWxlY3RvckFsbCgnVklERU8nKS5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBmcmFtZXMgPSBub2RlLnF1ZXJ5U2VsZWN0b3JBbGwoJ0lGUkFNRScpO1xuICAgIGZvciAoY29uc3QgZnJhbWUgb2YgZnJhbWVzKSB7XG4gICAgICBpZiAoaXNWaWRlb0ZyYW1lKGZyYW1lKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGV4KSB7IC8qIElnbm9yZSBleGNlcHRpb24gKi8gfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuXG5mdW5jdGlvbiBpc0ZsYXNoKG5vZGUpIHtcbiAgaWYgKG5vZGUudGFnTmFtZSA9PT0gJ09CSkVDVCcgJiYgbm9kZS5nZXRBdHRyaWJ1dGUoJ3R5cGUnKSA9PT0gJ2FwcGxpY2F0aW9uL3gtc2hvY2t3YXZlLWZsYXNoJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5cbmZ1bmN0aW9uIG1hcmtOb2RlQXNTYWZlKG5vZGUpIHtcbiAgdHJ5IHtcbiAgICBub2RlLnNldEF0dHJpYnV0ZSgnY2xpcXotYWRibG9ja2VyJywgJ3NhZmUnKTtcbiAgfSBjYXRjaCAoZSkgeyAvKiBJZ25vcmUgZXhjZXB0aW9uICovIH1cbn1cblxuZnVuY3Rpb24gaGlkZShub2RlLCB1cmwsIHNvdXJjZSkge1xuICBpZiAoYXV0b0Jsb2NrQWRzKCkpIHtcbiAgICB0cnkge1xuICAgICAgaWYgKG5vZGUuZ2V0QXR0cmlidXRlKCdjbGlxei1hZGJsb2NrZXInKSA9PT0gJ3NhZmUnKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG5vZGUuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdjbGlxei1hZGItYmxvY2tlZCcsIGBmcm9tIHNvdXJjZTogJHt1cmx9YCk7XG4gICAgfSBjYXRjaCAoZSkgeyAvKiBJZ25vcmUgZXhjZXB0aW9uICovIH1cbiAgICBDbGlxekFEQi5hZGJTdGF0cy5wYWdlc1tzb3VyY2VdID0gKENsaXF6QURCLmFkYlN0YXRzLnBhZ2VzW3NvdXJjZV0gfHwgMCkgKyAxO1xuICB9XG59XG5cblxuZnVuY3Rpb24gaGlkZU5vZGVzKHJlcXVlc3RDb250ZXh0KSB7XG4gIGxvZyhgaGlkZU5vZGVzIGZvciAke3JlcXVlc3RDb250ZXh0LnVybH1gKTtcbiAgY29uc3Qgc291cmNlID0gbG9jYXRlU291cmNlKHJlcXVlc3RDb250ZXh0KTtcbiAgaWYgKCFzb3VyY2UpIHtcbiAgICByZXR1cm47ICAvLyBXZSBjYW5ub3QgZG8gYW55dGhpbmcgaWYgd2UgZmFpbGVkIHRvIGRldGVybWluIHRoZSBlbGVtZW50IG9yaWdpbmF0ZWQgdGhlIHJlcXVlc3RcbiAgfVxuXG4gIGlmIChjb250YWluc1ZpZGVvKHNvdXJjZSkpIHtcbiAgICBtYXJrTm9kZUFzU2FmZShzb3VyY2UpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmIChpc0ZsYXNoKHNvdXJjZSkgJiYgc291cmNlLmdldEF0dHJpYnV0ZSgnZGF0YScpICE9PSByZXF1ZXN0Q29udGV4dC51cmwpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBoaWRlKGxvY2F0ZVBhcmVudChzb3VyY2UpLCByZXF1ZXN0Q29udGV4dC51cmwsIHJlcXVlc3RDb250ZXh0LmdldFNvdXJjZVVSTCgpKTtcblxuICBpZiAoaXNGcm9tRnJhbWUocmVxdWVzdENvbnRleHQpKSB7XG4gICAgLy8gaGlkZUNvbXBhbnlGcmFtZXMoc291cmNlKTtcbiAgICBjb25zdCB3bSA9IENvbXBvbmVudHMuY2xhc3Nlc1snQG1vemlsbGEub3JnL2FwcHNoZWxsL3dpbmRvdy1tZWRpYXRvcjsxJ11cbiAgICAgICAgICAuZ2V0U2VydmljZShDb21wb25lbnRzLmludGVyZmFjZXMubnNJV2luZG93TWVkaWF0b3IpO1xuICAgIGNvbnN0IG91dFdpbklkID0gcmVxdWVzdENvbnRleHQuZ2V0T3V0ZXJXaW5kb3dJRCgpO1xuICAgIGNvbnN0IGZyYW1lID0gd20uZ2V0T3V0ZXJXaW5kb3dXaXRoSWQob3V0V2luSWQpLmZyYW1lRWxlbWVudDtcbiAgICBpZiAoaXNWaWRlb0ZyYW1lKGZyYW1lKSB8fCBpc1Bvc3NpYmxlQ29udGVudChmcmFtZSkpIHtcbiAgICAgIG1hcmtOb2RlQXNTYWZlKGZyYW1lKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaGlkZShsb2NhdGVQYXJlbnQoZnJhbWUpLCByZXF1ZXN0Q29udGV4dC51cmwsIHJlcXVlc3RDb250ZXh0LmdldFNvdXJjZVVSTCgpKTtcbiAgICBDbGlxekFEQi5tdXRhdGlvbkxvZ2dlci5hZGRGcmFtZU11dGF0aW9uT2JzZXJ2ZXIob3V0V2luSWQsIGZyYW1lLmNvbnRlbnRXaW5kb3cuZG9jdW1lbnQpO1xuICAgIGNoZWNrRnJhbWUocmVxdWVzdENvbnRleHQuZ2V0T3JpZ2luV2luZG93SUQoKSwgZnJhbWUuaWQsIHJlcXVlc3RDb250ZXh0LnVybCwgZmFsc2UpO1xuICB9XG59XG5cblxuZXhwb3J0IHtcbiAgaGlkZU5vZGVzLFxuICBsb2NhdGVQYXJlbnQsXG4gIGNoZWNrRnJhbWUsXG4gIGNvdW50Q2hpbGRyZW4sXG59O1xuIl19