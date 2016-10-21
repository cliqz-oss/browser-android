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