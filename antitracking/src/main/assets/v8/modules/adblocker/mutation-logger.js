System.register('adblocker/mutation-logger', ['core/cliqz', 'adblocker/cosmetics'], function (_export) {
  'use strict';

  var utils, countChildren, MAX_CHILDREN;

  _export('default', MutationLogger);

  function MutationLogger() {
    this.tabsInfo = {}; // first party url
    this.config = {
      childList: true,
      subtree: true
    };
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_adblockerCosmetics) {
      countChildren = _adblockerCosmetics.countChildren;
      MAX_CHILDREN = _adblockerCosmetics.MAX_CHILDREN;
    }],
    execute: function () {

      MutationLogger.prototype = {
        onFrameMutation: function onFrameMutation(mutations) {
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = mutations[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var m = _step.value;

              var t = m.target;
              if (t.querySelectorAll('video').length > 0) {
                // find the frame element
                var frame = t.ownerDocument.defaultView.frameElement;
                CliqzUtils.f = frame;
                if (frame.getAttribute('cliqz-adb-blocked')) {
                  while (frame.getAttribute('cliqz-adb-blocked') === 'parent') {
                    frame.setAttribute('cliqz-adb-blocked', 'video-removed');
                    frame = frame.parentNode;
                  }
                  frame.style.display = '';
                  frame.setAttribute('cliqz-adb-blocked', 'video-removed');
                  frame.setAttribute('cliqz-adblocker', 'safe');
                }
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
        },
        onMutation: function onMutation(mutations) {
          var _iteratorNormalCompletion2 = true;
          var _didIteratorError2 = false;
          var _iteratorError2 = undefined;

          try {
            for (var _iterator2 = mutations[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
              var m = _step2.value;

              var t = m.target;
              var count = 0;
              var _iteratorNormalCompletion5 = true;
              var _didIteratorError5 = false;
              var _iteratorError5 = undefined;

              try {
                for (var _iterator5 = m.addedNodes[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                  var added = _step5.value;

                  count = Math.max(count, countChildren(added));
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

              try {
                if (t.getAttribute('cliqz-adb-blocked')) {
                  if (countChildren(t) > MAX_CHILDREN || count > MAX_CHILDREN) {
                    while (t.getAttribute('cliqz-adb-blocked') === 'parent') {
                      t.setAttribute('cliqz-adb-blocked', undefined);
                      t = t.parentNode;
                    }
                    t.style.display = '';
                    t.setAttribute('cliqz-adb-blocked', undefined);
                  }
                }
              } catch (e) {/* Ignore exception */}
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

          if (!mutations[0].target.ownerDocument) {
            return;
          }
          var windowID = mutations[0].target.ownerDocument.windowID;
          if (windowID) {
            // add nodes
            if (!this.tabsInfo[windowID].nodes) {
              this.tabsInfo[windowID].nodes = {
                groupCount: 0,
                count2node: {},
                id2count: {}
              };
            }
            this.tabsInfo[windowID].nodes.groupCount++;
            var c = this.tabsInfo[windowID].nodes.groupCount;
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
              for (var _iterator3 = mutations[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                var m = _step3.value;

                // let hide = false;
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                  for (var _iterator4 = m.addedNodes[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                    var n = _step4.value;

                    if (n.id && n.id !== 'cliqz-div-x') {
                      if (!(c in this.tabsInfo[windowID].nodes.count2node)) {
                        this.tabsInfo[windowID].nodes.count2node[c] = [];
                      }
                      this.tabsInfo[windowID].nodes.count2node[c].push(n);
                      this.tabsInfo[windowID].nodes.id2count[n.id] = c;
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
          }
        },
        addMutationObserver: function addMutationObserver(windowID) {
          if (!this.tabsInfo[windowID].observerAdded) {
            var _MutationObserver = utils.getWindow().MutationObserver;
            var mutationObserver = new _MutationObserver(this.onMutation.bind(this));
            this.tabsInfo[windowID].doc.windowID = windowID;
            mutationObserver.observe(this.tabsInfo[windowID].doc, this.config);
            this.tabsInfo[windowID].observerAdded = true;
          }
        },
        addFrameMutationObserver: function addFrameMutationObserver(winID, frameDoc) {
          var MutationObserver = utils.getWindow().MutationObserver;
          var mutationObserver = new MutationObserver(this.onFrameMutation.bind(this));
          mutationObserver.observe(frameDoc, this.config);
        },
        onLocationChange: function onLocationChange(aProgress, aRequest, aURI) {
          if (aProgress.isLoadingDocument) {
            var windowID = aProgress.DOMWindowID;
            if (!(windowID in this.tabsInfo)) {
              this.tabsInfo[windowID] = {
                url: null,
                doc: null
              };
            }
            this.tabsInfo[windowID].url = aURI.spec;
            this.tabsInfo[windowID].doc = aProgress.DOMWindow.document;
            this.tabsInfo[windowID].observerAdded = false;
            this.tabsInfo[windowID].requests = {};
          }
        }
      };
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFkYmxvY2tlci9tdXRhdGlvbi1sb2dnZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7cUJBSXdCLGNBQWM7O0FBQXZCLFdBQVMsY0FBYyxHQUFHO0FBQ3ZDLFFBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQ25CLFFBQUksQ0FBQyxNQUFNLEdBQUc7QUFDWixlQUFTLEVBQUUsSUFBSTtBQUNmLGFBQU8sRUFBRSxJQUFJO0tBQ2QsQ0FBQztHQUNIOzs7O3lCQVZRLEtBQUs7OzBDQUNMLGFBQWE7eUNBQUUsWUFBWTs7OztBQVlwQyxvQkFBYyxDQUFDLFNBQVMsR0FBRztBQUN6Qix1QkFBZSxFQUFBLHlCQUFDLFNBQVMsRUFBRTs7Ozs7O0FBQ3pCLGlDQUFnQixTQUFTLDhIQUFFO2tCQUFoQixDQUFDOztBQUNWLGtCQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ25CLGtCQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFOztBQUMxQyxvQkFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDO0FBQ3JELDBCQUFVLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztBQUNyQixvQkFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLG1CQUFtQixDQUFDLEVBQUU7QUFDM0MseUJBQU8sS0FBSyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLFFBQVEsRUFBRTtBQUMzRCx5QkFBSyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN6RCx5QkFBSyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUM7bUJBQzFCO0FBQ0QsdUJBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztBQUN6Qix1QkFBSyxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUN6RCx1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MEJBQUMsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7QUFDMUMsY0FBSSxTQUFTLENBQUMsaUJBQWlCLEVBQUU7QUFDL0IsZ0JBQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7QUFDdkMsZ0JBQUksRUFBRSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQSxBQUFDLEVBQUU7QUFDaEMsa0JBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUc7QUFDeEIsbUJBQUcsRUFBRSxJQUFJO0FBQ1QsbUJBQUcsRUFBRSxJQUFJO2VBQ1YsQ0FBQzthQUNIO0FBQ0QsZ0JBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDeEMsZ0JBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO0FBQzNELGdCQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGFBQWEsR0FBRyxLQUFLLENBQUM7QUFDOUMsZ0JBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztXQUN2QztTQUNGO09BQ0YsQ0FBQyIsImZpbGUiOiJhZGJsb2NrZXIvbXV0YXRpb24tbG9nZ2VyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXRpbHMgfSBmcm9tICdjb3JlL2NsaXF6JztcbmltcG9ydCB7IGNvdW50Q2hpbGRyZW4sIE1BWF9DSElMRFJFTiB9IGZyb20gJ2FkYmxvY2tlci9jb3NtZXRpY3MnO1xuXG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIE11dGF0aW9uTG9nZ2VyKCkge1xuICB0aGlzLnRhYnNJbmZvID0ge307ICAvLyBmaXJzdCBwYXJ0eSB1cmxcbiAgdGhpcy5jb25maWcgPSB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gIH07XG59XG5cblxuTXV0YXRpb25Mb2dnZXIucHJvdG90eXBlID0ge1xuICBvbkZyYW1lTXV0YXRpb24obXV0YXRpb25zKSB7XG4gICAgZm9yIChjb25zdCBtIG9mIG11dGF0aW9ucykge1xuICAgICAgY29uc3QgdCA9IG0udGFyZ2V0O1xuICAgICAgaWYgKHQucXVlcnlTZWxlY3RvckFsbCgndmlkZW8nKS5sZW5ndGggPiAwKSB7ICAvLyBmaW5kIHRoZSBmcmFtZSBlbGVtZW50XG4gICAgICAgIGxldCBmcmFtZSA9IHQub3duZXJEb2N1bWVudC5kZWZhdWx0Vmlldy5mcmFtZUVsZW1lbnQ7XG4gICAgICAgIENsaXF6VXRpbHMuZiA9IGZyYW1lO1xuICAgICAgICBpZiAoZnJhbWUuZ2V0QXR0cmlidXRlKCdjbGlxei1hZGItYmxvY2tlZCcpKSB7XG4gICAgICAgICAgd2hpbGUgKGZyYW1lLmdldEF0dHJpYnV0ZSgnY2xpcXotYWRiLWJsb2NrZWQnKSA9PT0gJ3BhcmVudCcpIHtcbiAgICAgICAgICAgIGZyYW1lLnNldEF0dHJpYnV0ZSgnY2xpcXotYWRiLWJsb2NrZWQnLCAndmlkZW8tcmVtb3ZlZCcpO1xuICAgICAgICAgICAgZnJhbWUgPSBmcmFtZS5wYXJlbnROb2RlO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmcmFtZS5zdHlsZS5kaXNwbGF5ID0gJyc7XG4gICAgICAgICAgZnJhbWUuc2V0QXR0cmlidXRlKCdjbGlxei1hZGItYmxvY2tlZCcsICd2aWRlby1yZW1vdmVkJyk7XG4gICAgICAgICAgZnJhbWUuc2V0QXR0cmlidXRlKCdjbGlxei1hZGJsb2NrZXInLCAnc2FmZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBvbk11dGF0aW9uKG11dGF0aW9ucykge1xuICAgIGZvciAoY29uc3QgbSBvZiBtdXRhdGlvbnMpIHtcbiAgICAgIGxldCB0ID0gbS50YXJnZXQ7XG4gICAgICBsZXQgY291bnQgPSAwO1xuICAgICAgZm9yIChjb25zdCBhZGRlZCBvZiBtLmFkZGVkTm9kZXMpIHtcbiAgICAgICAgY291bnQgPSBNYXRoLm1heChjb3VudCwgY291bnRDaGlsZHJlbihhZGRlZCkpO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKHQuZ2V0QXR0cmlidXRlKCdjbGlxei1hZGItYmxvY2tlZCcpKSB7XG4gICAgICAgICAgaWYgKGNvdW50Q2hpbGRyZW4odCkgPiBNQVhfQ0hJTERSRU4gfHwgY291bnQgPiBNQVhfQ0hJTERSRU4pIHtcbiAgICAgICAgICAgIHdoaWxlICh0LmdldEF0dHJpYnV0ZSgnY2xpcXotYWRiLWJsb2NrZWQnKSA9PT0gJ3BhcmVudCcpIHtcbiAgICAgICAgICAgICAgdC5zZXRBdHRyaWJ1dGUoJ2NsaXF6LWFkYi1ibG9ja2VkJywgdW5kZWZpbmVkKTtcbiAgICAgICAgICAgICAgdCA9IHQucGFyZW50Tm9kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHQuc3R5bGUuZGlzcGxheSA9ICcnO1xuICAgICAgICAgICAgdC5zZXRBdHRyaWJ1dGUoJ2NsaXF6LWFkYi1ibG9ja2VkJywgdW5kZWZpbmVkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHsgLyogSWdub3JlIGV4Y2VwdGlvbiAqLyB9XG4gICAgfVxuICAgIGlmICghbXV0YXRpb25zWzBdLnRhcmdldC5vd25lckRvY3VtZW50KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHdpbmRvd0lEID0gbXV0YXRpb25zWzBdLnRhcmdldC5vd25lckRvY3VtZW50LndpbmRvd0lEO1xuICAgIGlmICh3aW5kb3dJRCkge1xuICAgICAgLy8gYWRkIG5vZGVzXG4gICAgICBpZiAoIXRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzKSB7XG4gICAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzID0ge1xuICAgICAgICAgIGdyb3VwQ291bnQ6IDAsXG4gICAgICAgICAgY291bnQybm9kZToge30sXG4gICAgICAgICAgaWQyY291bnQ6IHt9LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgdGhpcy50YWJzSW5mb1t3aW5kb3dJRF0ubm9kZXMuZ3JvdXBDb3VudCsrO1xuICAgICAgY29uc3QgYyA9IHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzLmdyb3VwQ291bnQ7XG4gICAgICBmb3IgKGNvbnN0IG0gb2YgbXV0YXRpb25zKSB7XG4gICAgICAgIC8vIGxldCBoaWRlID0gZmFsc2U7XG4gICAgICAgIGZvciAoY29uc3QgbiBvZiBtLmFkZGVkTm9kZXMpIHtcbiAgICAgICAgICBpZiAobi5pZCAmJiBuLmlkICE9PSAnY2xpcXotZGl2LXgnKSB7XG4gICAgICAgICAgICBpZiAoIShjIGluIHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzLmNvdW50Mm5vZGUpKSB7XG4gICAgICAgICAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzLmNvdW50Mm5vZGVbY10gPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzLmNvdW50Mm5vZGVbY10ucHVzaChuKTtcbiAgICAgICAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdLm5vZGVzLmlkMmNvdW50W24uaWRdID0gYztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGFkZE11dGF0aW9uT2JzZXJ2ZXIod2luZG93SUQpIHtcbiAgICBpZiAoIXRoaXMudGFic0luZm9bd2luZG93SURdLm9ic2VydmVyQWRkZWQpIHtcbiAgICAgIGNvbnN0IE11dGF0aW9uT2JzZXJ2ZXIgPSB1dGlscy5nZXRXaW5kb3coKS5NdXRhdGlvbk9ic2VydmVyO1xuICAgICAgY29uc3QgbXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMub25NdXRhdGlvbi5iaW5kKHRoaXMpKTtcbiAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdLmRvYy53aW5kb3dJRCA9IHdpbmRvd0lEO1xuICAgICAgbXV0YXRpb25PYnNlcnZlci5vYnNlcnZlKHRoaXMudGFic0luZm9bd2luZG93SURdLmRvYywgdGhpcy5jb25maWcpO1xuICAgICAgdGhpcy50YWJzSW5mb1t3aW5kb3dJRF0ub2JzZXJ2ZXJBZGRlZCA9IHRydWU7XG4gICAgfVxuICB9LFxuICBhZGRGcmFtZU11dGF0aW9uT2JzZXJ2ZXIod2luSUQsIGZyYW1lRG9jKSB7XG4gICAgY29uc3QgTXV0YXRpb25PYnNlcnZlciA9IHV0aWxzLmdldFdpbmRvdygpLk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgY29uc3QgbXV0YXRpb25PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHRoaXMub25GcmFtZU11dGF0aW9uLmJpbmQodGhpcykpO1xuICAgIG11dGF0aW9uT2JzZXJ2ZXIub2JzZXJ2ZShmcmFtZURvYywgdGhpcy5jb25maWcpO1xuICB9LFxuICBvbkxvY2F0aW9uQ2hhbmdlKGFQcm9ncmVzcywgYVJlcXVlc3QsIGFVUkkpIHtcbiAgICBpZiAoYVByb2dyZXNzLmlzTG9hZGluZ0RvY3VtZW50KSB7XG4gICAgICBjb25zdCB3aW5kb3dJRCA9IGFQcm9ncmVzcy5ET01XaW5kb3dJRDtcbiAgICAgIGlmICghKHdpbmRvd0lEIGluIHRoaXMudGFic0luZm8pKSB7XG4gICAgICAgIHRoaXMudGFic0luZm9bd2luZG93SURdID0ge1xuICAgICAgICAgIHVybDogbnVsbCxcbiAgICAgICAgICBkb2M6IG51bGwsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICB0aGlzLnRhYnNJbmZvW3dpbmRvd0lEXS51cmwgPSBhVVJJLnNwZWM7XG4gICAgICB0aGlzLnRhYnNJbmZvW3dpbmRvd0lEXS5kb2MgPSBhUHJvZ3Jlc3MuRE9NV2luZG93LmRvY3VtZW50O1xuICAgICAgdGhpcy50YWJzSW5mb1t3aW5kb3dJRF0ub2JzZXJ2ZXJBZGRlZCA9IGZhbHNlO1xuICAgICAgdGhpcy50YWJzSW5mb1t3aW5kb3dJRF0ucmVxdWVzdHMgPSB7fTtcbiAgICB9XG4gIH0sXG59O1xuIl19