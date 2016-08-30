System.register('mobile-ui/UI', ['mobile-ui/DelayedImageLoader', 'core/mobile-webview', 'core/cliqz', 'mobile-ui/views/currency', 'mobile-ui/views/entity-generic', 'mobile-ui/views/generic', 'mobile-ui/views/hq', 'mobile-ui/views/local-data-sc', 'mobile-ui/views/stocks', 'mobile-ui/views/weatherAlert', 'mobile-ui/views/weatherEZ', 'mobile-ui/views/liveTicker'], function (_export) {
  /*
   * This is the module which creates the UI for the results
   *   - uses handlebars templates
   *   - attaches all the needed listners (keyboard/mouse)
   */

  'use strict';

  //TODO: improve loading of these views!
  var DelayedImageLoader, window, handlebars, v1, v2, v3, v4, v6, v7, v8, v9, v10, resultsBox, currentResults, imgLoader, progressBarInterval, PEEK, currentResultsCount, FRAME, UI, resizeTimeout;

  function setCardCountPerPage(windowWidth) {
    UI.nCardsPerPage = Math.floor(windowWidth / 320) || 1;
  }

  function loadAsyncResult(res, query) {
    for (var i in res) {
      var r = res[i];
      var qt = query + ": " + new Date().getTime();
      CliqzUtils.log(r, "LOADINGASYNC");
      CliqzUtils.log(query, "loadAsyncResult");
      var loop_count = 0;
      var async_callback = function async_callback(req) {
        CliqzUtils.log(query, "async_callback");
        var resp = null;
        try {
          resp = JSON.parse(req.response).results[0];
        } catch (err) {
          res.splice(i, 1);
        }
        if (resp && CliqzAutocomplete.lastSearch === query) {

          var kind = r.data.kind;
          if ("__callback_url__" in resp.data) {
            // If the result is again a promise, retry.
            if (loop_count < 10 /*smartCliqzMaxAttempts*/) {
                setTimeout(function () {
                  loop_count += 1;
                  CliqzUtils.httpGet(resp.data.__callback_url__, async_callback, async_callback);
                }, 100 /*smartCliqzWaitTime*/);
              } else if (!currentResults.results.length) {
                redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
              }
          } else {
            r.data = resp.data;
            r.url = resp.url;
            r.data.kind = kind;
            r.data.subType = resp.subType;
            r.data.trigger_urls = resp.trigger_urls;
            r.vertical = getVertical(r);
            r.urlDetails = CliqzUtils.getDetailsFromUrl(r.url);
            r.logo = CliqzUtils.getLogoDetails(r.urlDetails);

            if (resultsBox && CliqzAutocomplete.lastSearch === query) {
              // Remove all existing extra results
              currentResults.results = currentResults.results.filter(function (r) {
                return r.type !== 'cliqz-extra';
              });
              // add the current one on top of the list
              currentResults.results.unshift(r);

              if (currentResults.results.length) {
                redrawDropdown(handlebars.tplCache.results(currentResults), query);
              } else {
                redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
              }
              imgLoader = new DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
              imgLoader.start();
            }
          }
        }
        // to handle broken promises (eg. Weather and flights) on mobile
        else if (r.data && r.data.__callback_url__) {
            shiftResults();
          } else {
            res.splice(i, 1);
            if (!currentResults.results.length) {
              redrawDropdown(handlebars.tplCache.noResult(CliqzUtils.getNoResults()), query);
            }
          }
      };
      CliqzUtils.httpGet(r.data.__callback_url__, async_callback, async_callback);
    }
  }

  function assessAsync(getAsync) {
    return function (result) {
      var isAsync = result.type === 'cliqz-extra' && result.data && '__callback_url__' in result.data;
      return getAsync ? isAsync : !isAsync;
    };
  }

  function redrawDropdown(newHTML) {
    resultsBox.style.display = 'block';

    resultsBox.innerHTML = newHTML;
  }

  function getVertical(result) {
    // if history records are less than 3 it goes to generic
    var template = undefined;
    if (result.data.template === 'pattern-h3') {
      template = 'history';
    } else if (CLIQZEnvironment.TEMPLATES[result.data.superTemplate]) {
      template = result.data.superTemplate;
    } else if (CLIQZEnvironment.TEMPLATES[result.data.template]) {
      template = result.data.template;
    } else {
      template = 'generic';
    }
    return template;
  }

  function enhanceResults(results) {
    var enhancedResults = [];
    results.forEach(function (r, index) {
      var _tmp = getDebugMsg(r.comment || '');
      var url = r.val || '';
      var urlDetails = CliqzUtils.getDetailsFromUrl(url);

      enhancedResults.push(enhanceSpecificResult({
        type: r.style,
        left: UI.CARD_WIDTH * index,
        data: r.data || {},
        url: url,
        urlDetails: urlDetails,
        logo: CliqzUtils.getLogoDetails(urlDetails),
        title: _tmp[0],
        debug: _tmp[1]
      }));
    });

    var filteredResults = enhancedResults.filter(function (r) {
      return !(r.data && r.data.adult);
    });

    // if there no results after adult filter - show no results entry
    if (!filteredResults.length) {
      filteredResults.push(CliqzUtils.getNoResults());
      filteredResults[0].vertical = 'noResult';
    }

    return filteredResults;
  }

  // debug message are at the end of the title like this: "title (debug)!"
  function getDebugMsg(fullTitle) {
    // regex matches two parts:
    // 1) the title, can be anything ([\s\S] is more inclusive than '.' as it includes newline)
    // followed by:
    // 2) a debug string like this " (debug)!"
    if (fullTitle === null) {
      return [null, null];
    }
    var r = fullTitle.match(/^([\s\S]+) \((.*)\)!$/);
    if (r && r.length >= 3) {
      return [r[1], r[2]];
    } else {
      return [fullTitle, null];
    }
  }

  function enhanceSpecificResult(r) {
    var contentArea = {
      width: UI.CARD_WIDTH,
      height: window.screen.height
    };

    if (r.subType && JSON.parse(r.subType).ez) {
      // Indicate that this is a RH result.
      r.type = 'cliqz-extra';
    }

    var template = r.vertical = getVertical(r);

    var specificView = UI.VIEWS[template] || UI.VIEWS.generic;
    specificView.enhanceResults && specificView.enhanceResults(r.data, contentArea);

    return r;
  }

  function crossTransform(element, x) {
    var platforms = ['', '-webkit-', '-ms-'];
    platforms.forEach(function (platform) {
      element.style[platform + 'transform'] = 'translate3d(' + x + 'px, 0px, 0px)';
    });
  }

  function getResultKind(el) {
    return getResultOrChildAttr(el, 'kind').split(';');
  }

  // bubbles up maximum to the result container
  function getResultOrChildAttr(_x2, _x3) {
    var _left;

    var _again = true;

    _function: while (_again) {
      var el = _x2,
          attr = _x3;
      _again = false;

      if (el === null) return '';
      if (el.className === FRAME) return el.getAttribute(attr) || '';

      if (_left = el.getAttribute(attr)) {
        return _left;
      }

      _x2 = el.parentElement;
      _x3 = attr;
      _again = true;
      continue _function;
    }
  }

  function resultClick(ev) {
    var el = ev.target,
        url,
        extra,
        action;

    while (el) {
      extra = extra || el.getAttribute('extra');
      url = el.getAttribute('url');
      action = el.getAttribute('cliqz-action');

      if (url && url !== '#') {

        var card = document.getElementsByClassName('card')[CLIQZEnvironment.currentPage];
        var cardPosition = card.getBoundingClientRect();
        var coordinate = [ev.clientX - cardPosition.left, ev.clientY - cardPosition.top, UI.CARD_WIDTH];

        var signal = {
          type: 'activity',
          action: 'result_click',
          extra: extra,
          mouse: coordinate,
          position_type: getResultKind(el)
        };

        CliqzUtils.telemetry(signal);
        CLIQZEnvironment.openLink(window, url);
        return;
      } else if (action) {
        switch (action) {
          case 'stop-click-event-propagation':
            return;
          case 'copy-calc-answer':
            CLIQZEnvironment.copyResult(document.getElementById('calc-answer').innerHTML);
            document.getElementById('calc-copied-msg').style.display = '';
            document.getElementById('calc-copy-msg').style.display = 'none';
            break;
        }
      }

      if (el.className === FRAME) break; // do not go higher than a result
      el = el.parentElement;
    }
  }

  function shiftResults() {
    var frames = document.getElementsByClassName('frame');
    for (var i = 0; i < frames.length; i++) {
      var left = frames[i].style.left.substring(0, frames[i].style.left.length - 1);
      left = parseInt(left);
      left -= left / (i + 1);
      CLIQZEnvironment.lastResults[i] && (CLIQZEnvironment.lastResults[i].left = left);
      frames[i].style.left = left + 'px';
    }
    setResultNavigation(CLIQZEnvironment.lastResults);
  }

  function setResultNavigation(results) {

    var showGooglethis = 1;
    if (!results[0] || results[0].data.template === 'noResult') {
      showGooglethis = 0;
    }

    resultsBox.style.width = window.innerWidth + 'px';
    resultsBox.style.marginLeft = PEEK + 'px';

    var lastResultOffset = results.length ? results[results.length - 1].left || 0 : 0;

    currentResultsCount = lastResultOffset / UI.CARD_WIDTH + showGooglethis + 1;

    // get number of pages according to number of cards per page
    UI.nPages = Math.ceil(currentResultsCount / UI.nCardsPerPage);

    if (!CLIQZEnvironment.vp) {
      CLIQZEnvironment.vp = UI.initViewpager();
    }

    if (document.getElementById('currency-tpl')) {
      document.getElementById('currency-tpl').parentNode.removeAttribute('url');
    }
  }

  return {
    setters: [function (_mobileUiDelayedImageLoader) {
      DelayedImageLoader = _mobileUiDelayedImageLoader['default'];
    }, function (_coreMobileWebview) {
      window = _coreMobileWebview.window;
    }, function (_coreCliqz) {
      handlebars = _coreCliqz.handlebars;
    }, function (_mobileUiViewsCurrency) {
      v1 = _mobileUiViewsCurrency['default'];
    }, function (_mobileUiViewsEntityGeneric) {
      v2 = _mobileUiViewsEntityGeneric['default'];
    }, function (_mobileUiViewsGeneric) {
      v3 = _mobileUiViewsGeneric['default'];
    }, function (_mobileUiViewsHq) {
      v4 = _mobileUiViewsHq['default'];
    }, function (_mobileUiViewsLocalDataSc) {
      v6 = _mobileUiViewsLocalDataSc['default'];
    }, function (_mobileUiViewsStocks) {
      v7 = _mobileUiViewsStocks['default'];
    }, function (_mobileUiViewsWeatherAlert) {
      v8 = _mobileUiViewsWeatherAlert['default'];
    }, function (_mobileUiViewsWeatherEZ) {
      v9 = _mobileUiViewsWeatherEZ['default'];
    }, function (_mobileUiViewsLiveTicker) {
      v10 = _mobileUiViewsLiveTicker['default'];
    }],
    execute: function () {
      resultsBox = null;
      currentResults = null;
      imgLoader = null;
      progressBarInterval = null;
      PEEK = 25;
      currentResultsCount = 0;
      FRAME = 'frame';
      UI = {
        CARD_WIDTH: 0,
        nCardsPerPage: 1,
        nPages: 1,
        init: function init() {
          //check if loading is done
          if (!handlebars.tplCache.main) return;
          var box = document.getElementById('results');
          box.innerHTML = handlebars.tplCache.main();

          resultsBox = document.getElementById('cliqz-results', box);
          resultsBox.addEventListener('click', resultClick);
        },
        setDimensions: function setDimensions() {
          UI.CARD_WIDTH = window.innerWidth - 2 * PEEK;
          UI.CARD_WIDTH /= UI.nCardsPerPage;
        },
        setTheme: function setTheme() {
          var incognito = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

          window.document.body.style.backgroundColor = incognito ? '#4a4a4a' : '#E8E8E8';
        },
        setMobileBasedUrls: function setMobileBasedUrls(o) {
          if (!o) return;
          var url = o.data && o.data.mobile_url;
          if (o.val) {
            o.val = url || o.val;
          }
          if (o.url) {
            o.url = url || o.url;
          }
          if (o.url && o.m_url) {
            o.url = o.m_url;
          }
          for (var i in o) {
            if (typeof o[i] === 'object') {
              UI.setMobileBasedUrls(o[i]);
            }
          }
        },
        results: function results(r) {

          UI.setMobileBasedUrls(r);

          setCardCountPerPage(window.innerWidth);

          UI.setDimensions();

          var engine = CLIQZEnvironment.getDefaultSearchEngine();
          var details = CliqzUtils.getDetailsFromUrl(engine.url);
          var logo = CliqzUtils.getLogoDetails(details);

          var enhancedResults = enhanceResults(r._results);

          currentResults = {
            searchString: r._searchString,
            frameWidth: UI.CARD_WIDTH,
            results: enhancedResults,
            isInstant: false,
            isMixed: true,
            googleThis: {
              title: CliqzUtils.getLocalizedString('mobile_more_results_title'),
              action: CliqzUtils.getLocalizedString('mobile_more_results_action', engine.name),
              left: UI.CARD_WIDTH * enhancedResults.length,
              frameWidth: UI.CARD_WIDTH,
              searchString: encodeURIComponent(r._searchString),
              searchEngineUrl: engine.url,
              logo: logo,
              background: logo.backgroundColor
            }
          };
          var query = currentResults.searchString || '';

          if (imgLoader) imgLoader.stop();

          // Results that are not ready (extra results, for which we received a callback_url)
          var asyncResults = currentResults.results.filter(assessAsync(true));
          currentResults.results = currentResults.results.filter(assessAsync(false));

          redrawDropdown(handlebars.tplCache.results(currentResults), query);

          if (asyncResults.length) loadAsyncResult(asyncResults, query);

          imgLoader = new DelayedImageLoader('#cliqz-results img[data-src], #cliqz-results div[data-style], #cliqz-results span[data-style]');
          imgLoader.start();

          crossTransform(resultsBox, 0);

          setResultNavigation(currentResults.results);

          return currentResults;
        },
        VIEWS: {},
        initViewpager: function initViewpager() {
          var views = {},
              pageShowTs = Date.now(),
              innerWidth = window.innerWidth,
              offset = 0;

          crossTransform(resultsBox, Math.min(offset * innerWidth, innerWidth * currentResultsCount));

          return new ViewPager(resultsBox, {
            dragSize: window.innerWidth,
            prevent_all_native_scrolling: false,
            vertical: false,
            anim_duration: 400,
            tipping_point: 0.4,
            onPageScroll: function onPageScroll(scrollInfo) {
              offset = -scrollInfo.totalOffset;
              crossTransform(resultsBox, offset * UI.CARD_WIDTH * UI.nCardsPerPage);
            },

            onPageChange: function onPageChange(page) {
              page = Math.abs(page);
              if (page === CLIQZEnvironment.currentPage || !UI.isSearch()) return;

              views[page] = (views[page] || 0) + 1;

              CliqzUtils.telemetry({
                type: 'activity',
                action: 'swipe',
                swipe_direction: page > CLIQZEnvironment.currentPage ? 'right' : 'left',
                current_position: page,
                views: views[page],
                prev_position: CLIQZEnvironment.currentPage,
                prev_display_time: Date.now() - pageShowTs
              });

              pageShowTs = Date.now();

              CLIQZEnvironment.currentPage = page;
            }
          });
        },
        hideResultsBox: function hideResultsBox() {
          resultsBox.style.display = 'none';
        },
        updateSearchCard: function updateSearchCard(engine) {
          var engineDiv = document.getElementById('defaultEngine');
          if (engineDiv && CliqzAutocomplete.lastSearch) {
            engineDiv.setAttribute('url', engine.url + encodeURIComponent(CliqzAutocomplete.lastSearch));
          }
        },
        startProgressBar: function startProgressBar() {
          if (progressBarInterval) {
            clearInterval(progressBarInterval);
          }
          var multiplier = parseInt(Math.ceil(window.innerWidth / 100)),
              progress = document.getElementById('progress'),
              i = 0;
          progressBarInterval = setInterval(function () {
            i++;
            progress.style.width = i * multiplier + 'px';
          }, 20);

          setTimeout(UI.stopProgressBar, 4000);
        },

        stopProgressBar: function stopProgressBar() {
          if (progressBarInterval) {
            clearInterval(progressBarInterval);
          }
          document.getElementById('progress').style.width = '0px';
        },
        isSearch: function isSearch() {
          return resultsBox && resultsBox.style.display === 'block';
        }
      };

      window.addEventListener('resize', function () {
        if (!UI.isSearch()) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function () {
          var lastnCardsPerPage = UI.nCardsPerPage;
          setCardCountPerPage(window.innerWidth);
          UI.setDimensions();
          var frames = document.getElementsByClassName(FRAME);
          for (var i = 0; i < frames.length; i++) {
            var left = UI.CARD_WIDTH * i;
            frames[i].style.left = left + 'px';
            CLIQZEnvironment.lastResults[i] && (CLIQZEnvironment.lastResults[i].left = left);
            frames[i].style.width = UI.CARD_WIDTH + 'px';
          }
          setResultNavigation(CLIQZEnvironment.lastResults);
          CLIQZEnvironment.currentPage = Math.floor(CLIQZEnvironment.currentPage * lastnCardsPerPage / UI.nCardsPerPage);
          CLIQZEnvironment.vp.goToIndex(CLIQZEnvironment.currentPage, 0);
        }, 200);
      });

      window.addEventListener('disconnected', function () {
        var elem = document.getElementById('reconnecting');
        elem && (elem.innerHTML = '<h3>' + CliqzUtils.getLocalizedString('mobile_reconnecting_msg') + '</h3>');
      });

      window.addEventListener('connected', function () {
        var elem = document.getElementById('reconnecting');
        elem && (elem.innerHTML = '');
      });

      UI.clickHandlers = {};
      Object.keys(handlebars.TEMPLATES).concat(handlebars.MESSAGE_TEMPLATES).concat(handlebars.PARTIALS).forEach(function (templateName) {
        UI.VIEWS[templateName] = Object.create(null);
        try {
          var _module2 = System.get('mobile-ui/views/' + templateName);
          if (_module2) {
            UI.VIEWS[templateName] = new _module2['default'](window);

            if (UI.VIEWS[templateName].events && UI.VIEWS[templateName].events.click) {
              Object.keys(UI.VIEWS[templateName].events.click).forEach(function (selector) {
                UI.clickHandlers[selector] = UI.VIEWS[templateName].events.click[selector];
              });
            }
          }
        } catch (ex) {
          CliqzUtils.log(ex, 'UI');
        }
      });

      _export('default', UI);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,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LEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2VBQzVFLENBQUMsQ0FBQzthQUNKO1dBQ0Y7U0FDRixDQUFDLE9BQU8sRUFBRSxFQUFFO0FBQ1gsb0JBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1NBQzFCO09BQ0YsQ0FBQyxDQUFDOzt5QkFFWSxFQUFFIiwiZmlsZSI6Im1vYmlsZS11aS9VSS5lcyIsInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0Jztcbi8qXG4gKiBUaGlzIGlzIHRoZSBtb2R1bGUgd2hpY2ggY3JlYXRlcyB0aGUgVUkgZm9yIHRoZSByZXN1bHRzXG4gKiAgIC0gdXNlcyBoYW5kbGViYXJzIHRlbXBsYXRlc1xuICogICAtIGF0dGFjaGVzIGFsbCB0aGUgbmVlZGVkIGxpc3RuZXJzIChrZXlib2FyZC9tb3VzZSlcbiAqL1xuXG5pbXBvcnQgRGVsYXllZEltYWdlTG9hZGVyIGZyb20gJ21vYmlsZS11aS9EZWxheWVkSW1hZ2VMb2FkZXInO1xuaW1wb3J0IHsgd2luZG93IH0gZnJvbSAnY29yZS9tb2JpbGUtd2Vidmlldyc7XG5pbXBvcnQgeyBoYW5kbGViYXJzIH0gZnJvbSAnY29yZS9jbGlxeic7XG5cbi8vVE9ETzogaW1wcm92ZSBsb2FkaW5nIG9mIHRoZXNlIHZpZXdzIVxuaW1wb3J0IHYxIGZyb20gJ21vYmlsZS11aS92aWV3cy9jdXJyZW5jeSc7XG5pbXBvcnQgdjIgZnJvbSAnbW9iaWxlLXVpL3ZpZXdzL2VudGl0eS1nZW5lcmljJztcbmltcG9ydCB2MyBmcm9tICdtb2JpbGUtdWkvdmlld3MvZ2VuZXJpYyc7XG5pbXBvcnQgdjQgZnJvbSAnbW9iaWxlLXVpL3ZpZXdzL2hxJztcbmltcG9ydCB2NiBmcm9tICdtb2JpbGUtdWkvdmlld3MvbG9jYWwtZGF0YS1zYyc7XG5pbXBvcnQgdjcgZnJvbSAnbW9iaWxlLXVpL3ZpZXdzL3N0b2Nrcyc7XG5pbXBvcnQgdjggZnJvbSAnbW9iaWxlLXVpL3ZpZXdzL3dlYXRoZXJBbGVydCc7XG5pbXBvcnQgdjkgZnJvbSAnbW9iaWxlLXVpL3ZpZXdzL3dlYXRoZXJFWic7XG5pbXBvcnQgdjEwIGZyb20gJ21vYmlsZS11aS92aWV3cy9saXZlVGlja2VyJztcblxudmFyIHJlc3VsdHNCb3ggPSBudWxsLFxuICAgIGN1cnJlbnRSZXN1bHRzID0gbnVsbCxcbiAgICBpbWdMb2FkZXIgPSBudWxsLFxuICAgIHByb2dyZXNzQmFySW50ZXJ2YWwgPSBudWxsLFxuICAgIFBFRUsgPSAyNSxcbiAgICBjdXJyZW50UmVzdWx0c0NvdW50ID0gMCxcbiAgICBGUkFNRSA9ICdmcmFtZSc7XG5cbnZhciBVSSA9IHtcbiAgICBDQVJEX1dJRFRIOiAwLFxuICAgIG5DYXJkc1BlclBhZ2U6IDEsXG4gICAgblBhZ2VzOiAxLFxuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy9jaGVjayBpZiBsb2FkaW5nIGlzIGRvbmVcbiAgICAgICAgaWYgKCFoYW5kbGViYXJzLnRwbENhY2hlLm1haW4pIHJldHVybjtcbiAgICAgICAgbGV0IGJveCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyZXN1bHRzJyk7XG4gICAgICAgIGJveC5pbm5lckhUTUwgPSBoYW5kbGViYXJzLnRwbENhY2hlLm1haW4oKTtcblxuICAgICAgICByZXN1bHRzQm94ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NsaXF6LXJlc3VsdHMnLCBib3gpO1xuICAgICAgICByZXN1bHRzQm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgcmVzdWx0Q2xpY2spO1xuICAgIH0sXG4gICAgc2V0RGltZW5zaW9uczogZnVuY3Rpb24gKCkge1xuICAgICAgVUkuQ0FSRF9XSURUSCA9IHdpbmRvdy5pbm5lcldpZHRoICAtICAyICogUEVFSztcbiAgICAgIFVJLkNBUkRfV0lEVEggLz0gVUkubkNhcmRzUGVyUGFnZTtcbiAgICB9LFxuICAgIHNldFRoZW1lOiBmdW5jdGlvbiAoaW5jb2duaXRvID0gZmFsc2UpIHtcbiAgICAgIHdpbmRvdy5kb2N1bWVudC5ib2R5LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IGluY29nbml0byA/ICcjNGE0YTRhJyA6ICcjRThFOEU4JztcbiAgICB9LFxuICAgIHNldE1vYmlsZUJhc2VkVXJsczogZnVuY3Rpb24gIChvKSB7XG4gICAgICBpZiAoIW8pIHJldHVybjtcbiAgICAgIGNvbnN0IHVybCA9IG8uZGF0YSAmJiBvLmRhdGEubW9iaWxlX3VybDtcbiAgICAgIGlmIChvLnZhbCkge1xuICAgICAgICBvLnZhbCA9IHVybCB8fCBvLnZhbDtcbiAgICAgIH1cbiAgICAgIGlmIChvLnVybCkge1xuICAgICAgICBvLnVybCA9IHVybCB8fCBvLnVybDtcbiAgICAgIH1cbiAgICAgIGlmIChvLnVybCAmJiBvLm1fdXJsKSB7XG4gICAgICAgIG8udXJsID0gby5tX3VybDtcbiAgICAgIH1cbiAgICAgIGZvciAobGV0IGkgaW4gbykge1xuICAgICAgICBpZiAodHlwZW9mKG9baV0pID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgVUkuc2V0TW9iaWxlQmFzZWRVcmxzKG9baV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICByZXN1bHRzOiBmdW5jdGlvbiAocikge1xuXG4gICAgICBVSS5zZXRNb2JpbGVCYXNlZFVybHMocik7XG4gICAgICBcbiAgICAgIHNldENhcmRDb3VudFBlclBhZ2Uod2luZG93LmlubmVyV2lkdGgpO1xuXG4gICAgICBVSS5zZXREaW1lbnNpb25zKCk7XG5cbiAgICAgIHZhciBlbmdpbmUgPSBDTElRWkVudmlyb25tZW50LmdldERlZmF1bHRTZWFyY2hFbmdpbmUoKTtcbiAgICAgIHZhciBkZXRhaWxzID0gQ2xpcXpVdGlscy5nZXREZXRhaWxzRnJvbVVybChlbmdpbmUudXJsKTtcbiAgICAgIHZhciBsb2dvID0gQ2xpcXpVdGlscy5nZXRMb2dvRGV0YWlscyhkZXRhaWxzKTtcblxuICAgICAgdmFyIGVuaGFuY2VkUmVzdWx0cyA9IGVuaGFuY2VSZXN1bHRzKHIuX3Jlc3VsdHMpO1xuXG4gICAgICBjdXJyZW50UmVzdWx0cyA9IHtcbiAgICAgICAgc2VhcmNoU3RyaW5nOiByLl9zZWFyY2hTdHJpbmcsXG4gICAgICAgIGZyYW1lV2lkdGg6IFVJLkNBUkRfV0lEVEgsXG4gICAgICAgIHJlc3VsdHM6IGVuaGFuY2VkUmVzdWx0cyxcbiAgICAgICAgaXNJbnN0YW50OiBmYWxzZSxcbiAgICAgICAgaXNNaXhlZDogdHJ1ZSxcbiAgICAgICAgZ29vZ2xlVGhpczoge1xuICAgICAgICAgIHRpdGxlOiBDbGlxelV0aWxzLmdldExvY2FsaXplZFN0cmluZygnbW9iaWxlX21vcmVfcmVzdWx0c190aXRsZScpLFxuICAgICAgICAgIGFjdGlvbjogQ2xpcXpVdGlscy5nZXRMb2NhbGl6ZWRTdHJpbmcoJ21vYmlsZV9tb3JlX3Jlc3VsdHNfYWN0aW9uJywgZW5naW5lLm5hbWUpLFxuICAgICAgICAgIGxlZnQ6IFVJLkNBUkRfV0lEVEggKiBlbmhhbmNlZFJlc3VsdHMubGVuZ3RoLFxuICAgICAgICAgIGZyYW1lV2lkdGg6IFVJLkNBUkRfV0lEVEgsXG4gICAgICAgICAgc2VhcmNoU3RyaW5nOiBlbmNvZGVVUklDb21wb25lbnQoci5fc2VhcmNoU3RyaW5nKSxcbiAgICAgICAgICBzZWFyY2hFbmdpbmVVcmw6IGVuZ2luZS51cmwsXG4gICAgICAgICAgbG9nbzogbG9nbyxcbiAgICAgICAgICBiYWNrZ3JvdW5kOiBsb2dvLmJhY2tncm91bmRDb2xvclxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgICB2YXIgcXVlcnkgPSBjdXJyZW50UmVzdWx0cy5zZWFyY2hTdHJpbmcgfHwgJyc7XG5cbiAgICAgICAgaWYgKGltZ0xvYWRlcikgaW1nTG9hZGVyLnN0b3AoKTtcblxuICAgICAgICAvLyBSZXN1bHRzIHRoYXQgYXJlIG5vdCByZWFkeSAoZXh0cmEgcmVzdWx0cywgZm9yIHdoaWNoIHdlIHJlY2VpdmVkIGEgY2FsbGJhY2tfdXJsKVxuICAgICAgICB2YXIgYXN5bmNSZXN1bHRzID0gY3VycmVudFJlc3VsdHMucmVzdWx0cy5maWx0ZXIoYXNzZXNzQXN5bmModHJ1ZSkpO1xuICAgICAgICBjdXJyZW50UmVzdWx0cy5yZXN1bHRzID0gY3VycmVudFJlc3VsdHMucmVzdWx0cy5maWx0ZXIoYXNzZXNzQXN5bmMoZmFsc2UpKTtcblxuICAgICAgICBcbiAgICAgICAgcmVkcmF3RHJvcGRvd24oaGFuZGxlYmFycy50cGxDYWNoZS5yZXN1bHRzKGN1cnJlbnRSZXN1bHRzKSwgcXVlcnkpO1xuXG4gICAgICAgIGlmIChhc3luY1Jlc3VsdHMubGVuZ3RoKSBsb2FkQXN5bmNSZXN1bHQoYXN5bmNSZXN1bHRzLCBxdWVyeSk7XG5cbiAgICAgICAgaW1nTG9hZGVyID0gbmV3IERlbGF5ZWRJbWFnZUxvYWRlcignI2NsaXF6LXJlc3VsdHMgaW1nW2RhdGEtc3JjXSwgI2NsaXF6LXJlc3VsdHMgZGl2W2RhdGEtc3R5bGVdLCAjY2xpcXotcmVzdWx0cyBzcGFuW2RhdGEtc3R5bGVdJyk7XG4gICAgICAgIGltZ0xvYWRlci5zdGFydCgpO1xuXG4gICAgICAgIGNyb3NzVHJhbnNmb3JtKHJlc3VsdHNCb3gsIDApO1xuXG4gICAgICAgIHNldFJlc3VsdE5hdmlnYXRpb24oY3VycmVudFJlc3VsdHMucmVzdWx0cyk7XG5cbiAgICAgICAgcmV0dXJuIGN1cnJlbnRSZXN1bHRzO1xuICAgIH0sXG4gICAgVklFV1M6IHt9LFxuICAgIGluaXRWaWV3cGFnZXI6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHZpZXdzID0ge30sXG4gICAgICAgICAgICBwYWdlU2hvd1RzID0gRGF0ZS5ub3coKSxcbiAgICAgICAgICAgIGlubmVyV2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICAgIG9mZnNldCA9IDA7XG5cbiAgICAgICAgY3Jvc3NUcmFuc2Zvcm0ocmVzdWx0c0JveCwgTWF0aC5taW4oKG9mZnNldCAqIGlubmVyV2lkdGgpLCAoaW5uZXJXaWR0aCAqIGN1cnJlbnRSZXN1bHRzQ291bnQpKSk7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBWaWV3UGFnZXIocmVzdWx0c0JveCwge1xuICAgICAgICAgIGRyYWdTaXplOiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgICAgICBwcmV2ZW50X2FsbF9uYXRpdmVfc2Nyb2xsaW5nOiBmYWxzZSxcbiAgICAgICAgICB2ZXJ0aWNhbDogZmFsc2UsXG4gICAgICAgICAgYW5pbV9kdXJhdGlvbjo0MDAsXG4gICAgICAgICAgdGlwcGluZ19wb2ludDowLjQsXG4gICAgICAgICAgb25QYWdlU2Nyb2xsIDogZnVuY3Rpb24gKHNjcm9sbEluZm8pIHtcbiAgICAgICAgICAgIG9mZnNldCA9IC1zY3JvbGxJbmZvLnRvdGFsT2Zmc2V0O1xuICAgICAgICAgICAgY3Jvc3NUcmFuc2Zvcm0ocmVzdWx0c0JveCwgKG9mZnNldCAqIFVJLkNBUkRfV0lEVEggKiBVSS5uQ2FyZHNQZXJQYWdlKSk7XG4gICAgICAgICAgfSxcblxuICAgICAgICAgIG9uUGFnZUNoYW5nZSA6IGZ1bmN0aW9uIChwYWdlKSB7XG4gICAgICAgICAgICBwYWdlID0gTWF0aC5hYnMocGFnZSk7XG4gICAgICAgICAgICBpZiAocGFnZSA9PT0gQ0xJUVpFbnZpcm9ubWVudC5jdXJyZW50UGFnZSB8fCAhVUkuaXNTZWFyY2goKSkgcmV0dXJuO1xuXG4gICAgICAgICAgICB2aWV3c1twYWdlXSA9ICh2aWV3c1twYWdlXSB8fCAwKSArIDE7XG5cblxuICAgICAgICAgICAgQ2xpcXpVdGlscy50ZWxlbWV0cnkoe1xuICAgICAgICAgICAgICB0eXBlOiAnYWN0aXZpdHknLFxuICAgICAgICAgICAgICBhY3Rpb246ICdzd2lwZScsXG4gICAgICAgICAgICAgIHN3aXBlX2RpcmVjdGlvbjpcbiAgICAgICAgICAgICAgICBwYWdlID4gQ0xJUVpFbnZpcm9ubWVudC5jdXJyZW50UGFnZSA/ICdyaWdodCcgOiAnbGVmdCcsXG4gICAgICAgICAgICAgIGN1cnJlbnRfcG9zaXRpb246IHBhZ2UsXG4gICAgICAgICAgICAgIHZpZXdzOiB2aWV3c1twYWdlXSxcbiAgICAgICAgICAgICAgcHJldl9wb3NpdGlvbjogQ0xJUVpFbnZpcm9ubWVudC5jdXJyZW50UGFnZSxcbiAgICAgICAgICAgICAgcHJldl9kaXNwbGF5X3RpbWU6IERhdGUubm93KCkgLSBwYWdlU2hvd1RzXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgcGFnZVNob3dUcyA9IERhdGUubm93KCk7XG5cbiAgICAgICAgICAgIENMSVFaRW52aXJvbm1lbnQuY3VycmVudFBhZ2UgPSBwYWdlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBoaWRlUmVzdWx0c0JveDogZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHJlc3VsdHNCb3guc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICB9LFxuICAgIHVwZGF0ZVNlYXJjaENhcmQ6IGZ1bmN0aW9uIChlbmdpbmUpIHtcbiAgICAgIHZhciBlbmdpbmVEaXYgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGVmYXVsdEVuZ2luZScpO1xuICAgICAgaWYgKGVuZ2luZURpdiAmJiBDbGlxekF1dG9jb21wbGV0ZS5sYXN0U2VhcmNoKSB7XG4gICAgICAgIGVuZ2luZURpdi5zZXRBdHRyaWJ1dGUoJ3VybCcsIGVuZ2luZS51cmwgKyBlbmNvZGVVUklDb21wb25lbnQoQ2xpcXpBdXRvY29tcGxldGUubGFzdFNlYXJjaCkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgc3RhcnRQcm9ncmVzc0JhcjogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHByb2dyZXNzQmFySW50ZXJ2YWwpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChwcm9ncmVzc0JhckludGVydmFsKTtcbiAgICAgIH1cbiAgICAgIHZhciBtdWx0aXBsaWVyID0gcGFyc2VJbnQoTWF0aC5jZWlsKHdpbmRvdy5pbm5lcldpZHRoLzEwMCkpLFxuICAgICAgcHJvZ3Jlc3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJvZ3Jlc3MnKSxcbiAgICAgIGkgPSAwO1xuICAgICAgcHJvZ3Jlc3NCYXJJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaSsrO1xuICAgICAgICBwcm9ncmVzcy5zdHlsZS53aWR0aCA9IChpKm11bHRpcGxpZXIpKydweCc7XG4gICAgICB9LDIwKTtcblxuICAgICAgc2V0VGltZW91dChVSS5zdG9wUHJvZ3Jlc3NCYXIsNDAwMCk7XG4gICAgfSxcblxuICAgIHN0b3BQcm9ncmVzc0JhcjogZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKHByb2dyZXNzQmFySW50ZXJ2YWwpIHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChwcm9ncmVzc0JhckludGVydmFsKTtcbiAgICAgIH1cbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcm9ncmVzcycpLnN0eWxlLndpZHRoID0gJzBweCc7XG4gICAgfSxcbiAgICBpc1NlYXJjaDogZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlc3VsdHNCb3ggJiYgcmVzdWx0c0JveC5zdHlsZS5kaXNwbGF5ID09PSAnYmxvY2snO1xuICAgIH1cbn07XG5cbmZ1bmN0aW9uIHNldENhcmRDb3VudFBlclBhZ2Uod2luZG93V2lkdGgpIHtcbiAgVUkubkNhcmRzUGVyUGFnZSA9IE1hdGguZmxvb3Iod2luZG93V2lkdGggLyAzMjApIHx8IDE7XG59XG5cblxuZnVuY3Rpb24gbG9hZEFzeW5jUmVzdWx0KHJlcywgcXVlcnkpIHtcbiAgICBmb3IgKHZhciBpIGluIHJlcykge1xuICAgICAgdmFyIHIgPSByZXNbaV07XG4gICAgICB2YXIgcXQgPSBxdWVyeSArIFwiOiBcIiArIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgQ2xpcXpVdGlscy5sb2cocixcIkxPQURJTkdBU1lOQ1wiKTtcbiAgICAgIENsaXF6VXRpbHMubG9nKHF1ZXJ5LFwibG9hZEFzeW5jUmVzdWx0XCIpO1xuICAgICAgdmFyIGxvb3BfY291bnQgPSAwO1xuICAgICAgdmFyIGFzeW5jX2NhbGxiYWNrID0gZnVuY3Rpb24gKHJlcSkge1xuICAgICAgICAgIENsaXF6VXRpbHMubG9nKHF1ZXJ5LFwiYXN5bmNfY2FsbGJhY2tcIik7XG4gICAgICAgICAgdmFyIHJlc3AgPSBudWxsO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNwID0gSlNPTi5wYXJzZShyZXEucmVzcG9uc2UpLnJlc3VsdHNbMF07XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhdGNoKGVycikge1xuICAgICAgICAgICAgcmVzLnNwbGljZShpLDEpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAocmVzcCAmJiAgQ2xpcXpBdXRvY29tcGxldGUubGFzdFNlYXJjaCA9PT0gcXVlcnkpIHtcblxuICAgICAgICAgICAgdmFyIGtpbmQgPSByLmRhdGEua2luZDtcbiAgICAgICAgICAgIGlmIChcIl9fY2FsbGJhY2tfdXJsX19cIiBpbiByZXNwLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiB0aGUgcmVzdWx0IGlzIGFnYWluIGEgcHJvbWlzZSwgcmV0cnkuXG4gICAgICAgICAgICAgICAgaWYgKGxvb3BfY291bnQgPCAxMCAvKnNtYXJ0Q2xpcXpNYXhBdHRlbXB0cyovKSB7XG4gICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgbG9vcF9jb3VudCArPSAxO1xuICAgICAgICAgICAgICAgICAgICBDbGlxelV0aWxzLmh0dHBHZXQocmVzcC5kYXRhLl9fY2FsbGJhY2tfdXJsX18sIGFzeW5jX2NhbGxiYWNrLCBhc3luY19jYWxsYmFjayk7XG4gICAgICAgICAgICAgICAgICB9LCAxMDAgLypzbWFydENsaXF6V2FpdFRpbWUqLyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCFjdXJyZW50UmVzdWx0cy5yZXN1bHRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgcmVkcmF3RHJvcGRvd24oaGFuZGxlYmFycy50cGxDYWNoZS5ub1Jlc3VsdChDbGlxelV0aWxzLmdldE5vUmVzdWx0cygpKSwgcXVlcnkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICByLmRhdGEgPSByZXNwLmRhdGE7XG4gICAgICAgICAgICAgIHIudXJsID0gcmVzcC51cmw7XG4gICAgICAgICAgICAgIHIuZGF0YS5raW5kID0ga2luZDtcbiAgICAgICAgICAgICAgci5kYXRhLnN1YlR5cGUgPSByZXNwLnN1YlR5cGU7XG4gICAgICAgICAgICAgIHIuZGF0YS50cmlnZ2VyX3VybHMgPSByZXNwLnRyaWdnZXJfdXJscztcbiAgICAgICAgICAgICAgci52ZXJ0aWNhbCA9IGdldFZlcnRpY2FsKHIpO1xuICAgICAgICAgICAgICByLnVybERldGFpbHMgPSBDbGlxelV0aWxzLmdldERldGFpbHNGcm9tVXJsKHIudXJsKTtcbiAgICAgICAgICAgICAgci5sb2dvID0gQ2xpcXpVdGlscy5nZXRMb2dvRGV0YWlscyhyLnVybERldGFpbHMpO1xuXG4gICAgICAgICAgICAgIGlmIChyZXN1bHRzQm94ICYmIENsaXF6QXV0b2NvbXBsZXRlLmxhc3RTZWFyY2ggPT09IHF1ZXJ5KSB7XG4gICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgYWxsIGV4aXN0aW5nIGV4dHJhIHJlc3VsdHNcbiAgICAgICAgICAgICAgICAgIGN1cnJlbnRSZXN1bHRzLnJlc3VsdHMgPSBjdXJyZW50UmVzdWx0cy5yZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocikgeyByZXR1cm4gci50eXBlICE9PSAnY2xpcXotZXh0cmEnOyB9ICk7XG4gICAgICAgICAgICAgICAgICAvLyBhZGQgdGhlIGN1cnJlbnQgb25lIG9uIHRvcCBvZiB0aGUgbGlzdFxuICAgICAgICAgICAgICAgICAgY3VycmVudFJlc3VsdHMucmVzdWx0cy51bnNoaWZ0KHIpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoY3VycmVudFJlc3VsdHMucmVzdWx0cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVkcmF3RHJvcGRvd24oaGFuZGxlYmFycy50cGxDYWNoZS5yZXN1bHRzKGN1cnJlbnRSZXN1bHRzKSwgcXVlcnkpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlZHJhd0Ryb3Bkb3duKGhhbmRsZWJhcnMudHBsQ2FjaGUubm9SZXN1bHQoQ2xpcXpVdGlscy5nZXROb1Jlc3VsdHMoKSksIHF1ZXJ5KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGltZ0xvYWRlciA9IG5ldyBEZWxheWVkSW1hZ2VMb2FkZXIoJyNjbGlxei1yZXN1bHRzIGltZ1tkYXRhLXNyY10sICNjbGlxei1yZXN1bHRzIGRpdltkYXRhLXN0eWxlXSwgI2NsaXF6LXJlc3VsdHMgc3BhbltkYXRhLXN0eWxlXScpO1xuICAgICAgICAgICAgICAgICAgaW1nTG9hZGVyLnN0YXJ0KCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gdG8gaGFuZGxlIGJyb2tlbiBwcm9taXNlcyAoZWcuIFdlYXRoZXIgYW5kIGZsaWdodHMpIG9uIG1vYmlsZVxuICAgICAgICAgIGVsc2UgaWYgKHIuZGF0YSAmJiByLmRhdGEuX19jYWxsYmFja191cmxfXykge1xuICAgICAgICAgICAgc2hpZnRSZXN1bHRzKCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgcmVzLnNwbGljZShpLDEpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50UmVzdWx0cy5yZXN1bHRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICByZWRyYXdEcm9wZG93bihoYW5kbGViYXJzLnRwbENhY2hlLm5vUmVzdWx0KENsaXF6VXRpbHMuZ2V0Tm9SZXN1bHRzKCkpLCBxdWVyeSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICB9O1xuICAgICAgQ2xpcXpVdGlscy5odHRwR2V0KHIuZGF0YS5fX2NhbGxiYWNrX3VybF9fLCBhc3luY19jYWxsYmFjaywgYXN5bmNfY2FsbGJhY2spO1xuICAgIH1cbn1cblxuXG5mdW5jdGlvbiBhc3Nlc3NBc3luYyhnZXRBc3luYykge1xuICAgIHJldHVybiBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgIHZhciBpc0FzeW5jID0gcmVzdWx0LnR5cGUgPT09ICdjbGlxei1leHRyYScgJiYgcmVzdWx0LmRhdGEgJiYgJ19fY2FsbGJhY2tfdXJsX18nIGluIHJlc3VsdC5kYXRhIDtcbiAgICAgICAgcmV0dXJuIGdldEFzeW5jID8gaXNBc3luYyA6ICFpc0FzeW5jO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHJlZHJhd0Ryb3Bkb3duKG5ld0hUTUwpIHtcbiAgICByZXN1bHRzQm94LnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuXG4gICAgcmVzdWx0c0JveC5pbm5lckhUTUwgPSBuZXdIVE1MO1xufVxuXG5mdW5jdGlvbiBnZXRWZXJ0aWNhbChyZXN1bHQpIHtcbiAgLy8gaWYgaGlzdG9yeSByZWNvcmRzIGFyZSBsZXNzIHRoYW4gMyBpdCBnb2VzIHRvIGdlbmVyaWNcbiAgbGV0IHRlbXBsYXRlO1xuICBpZiAocmVzdWx0LmRhdGEudGVtcGxhdGUgPT09ICdwYXR0ZXJuLWgzJykge1xuICAgIHRlbXBsYXRlID0gJ2hpc3RvcnknO1xuICB9IGVsc2UgaWYgKENMSVFaRW52aXJvbm1lbnQuVEVNUExBVEVTW3Jlc3VsdC5kYXRhLnN1cGVyVGVtcGxhdGVdKSB7XG4gICAgICB0ZW1wbGF0ZSA9IHJlc3VsdC5kYXRhLnN1cGVyVGVtcGxhdGU7XG4gIH0gZWxzZSBpZihDTElRWkVudmlyb25tZW50LlRFTVBMQVRFU1tyZXN1bHQuZGF0YS50ZW1wbGF0ZV0pIHtcbiAgICB0ZW1wbGF0ZSA9IHJlc3VsdC5kYXRhLnRlbXBsYXRlXG4gIH0gZWxzZSB7XG4gICAgdGVtcGxhdGUgPSAnZ2VuZXJpYyc7XG4gIH1cbiAgcmV0dXJuIHRlbXBsYXRlO1xufVxuXG5mdW5jdGlvbiBlbmhhbmNlUmVzdWx0cyhyZXN1bHRzKSB7XG4gIGxldCBlbmhhbmNlZFJlc3VsdHMgPSBbXTtcbiAgcmVzdWx0cy5mb3JFYWNoKChyLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IF90bXAgPSBnZXREZWJ1Z01zZyhyLmNvbW1lbnQgfHwgJycpO1xuICAgIGNvbnN0IHVybCA9IHIudmFsIHx8ICcnO1xuICAgIGNvbnN0IHVybERldGFpbHMgPSBDbGlxelV0aWxzLmdldERldGFpbHNGcm9tVXJsKHVybCk7XG5cbiAgICBlbmhhbmNlZFJlc3VsdHMucHVzaChlbmhhbmNlU3BlY2lmaWNSZXN1bHQoe1xuICAgICAgdHlwZTogci5zdHlsZSxcbiAgICAgIGxlZnQ6IChVSS5DQVJEX1dJRFRIICogaW5kZXgpLFxuICAgICAgZGF0YTogci5kYXRhIHx8IHt9LFxuICAgICAgdXJsLFxuICAgICAgdXJsRGV0YWlscyxcbiAgICAgIGxvZ286IENsaXF6VXRpbHMuZ2V0TG9nb0RldGFpbHModXJsRGV0YWlscyksXG4gICAgICB0aXRsZTogX3RtcFswXSxcbiAgICAgIGRlYnVnOiBfdG1wWzFdXG4gICAgfSkpO1xuICB9KTtcblxuICBsZXQgZmlsdGVyZWRSZXN1bHRzID0gZW5oYW5jZWRSZXN1bHRzLmZpbHRlcihmdW5jdGlvbiAocikgeyByZXR1cm4gIShyLmRhdGEgJiYgci5kYXRhLmFkdWx0KTsgfSk7XG5cbiAgLy8gaWYgdGhlcmUgbm8gcmVzdWx0cyBhZnRlciBhZHVsdCBmaWx0ZXIgLSBzaG93IG5vIHJlc3VsdHMgZW50cnlcbiAgaWYgKCFmaWx0ZXJlZFJlc3VsdHMubGVuZ3RoKSB7XG4gICAgZmlsdGVyZWRSZXN1bHRzLnB1c2goQ2xpcXpVdGlscy5nZXROb1Jlc3VsdHMoKSk7XG4gICAgZmlsdGVyZWRSZXN1bHRzWzBdLnZlcnRpY2FsID0gJ25vUmVzdWx0JztcbiAgfVxuXG4gIHJldHVybiBmaWx0ZXJlZFJlc3VsdHM7XG59XG5cbi8vIGRlYnVnIG1lc3NhZ2UgYXJlIGF0IHRoZSBlbmQgb2YgdGhlIHRpdGxlIGxpa2UgdGhpczogXCJ0aXRsZSAoZGVidWcpIVwiXG5mdW5jdGlvbiBnZXREZWJ1Z01zZyhmdWxsVGl0bGUpIHtcbiAgICAvLyByZWdleCBtYXRjaGVzIHR3byBwYXJ0czpcbiAgICAvLyAxKSB0aGUgdGl0bGUsIGNhbiBiZSBhbnl0aGluZyAoW1xcc1xcU10gaXMgbW9yZSBpbmNsdXNpdmUgdGhhbiAnLicgYXMgaXQgaW5jbHVkZXMgbmV3bGluZSlcbiAgICAvLyBmb2xsb3dlZCBieTpcbiAgICAvLyAyKSBhIGRlYnVnIHN0cmluZyBsaWtlIHRoaXMgXCIgKGRlYnVnKSFcIlxuICAgIGlmIChmdWxsVGl0bGUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBbbnVsbCwgbnVsbF07XG4gICAgfVxuICAgIGNvbnN0IHIgPSBmdWxsVGl0bGUubWF0Y2goL14oW1xcc1xcU10rKSBcXCgoLiopXFwpISQvKTtcbiAgICBpZiAociAmJiByLmxlbmd0aCA+PSAzKSB7XG4gICAgICByZXR1cm4gW3JbMV0sIHJbMl1dO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIHJldHVybiBbZnVsbFRpdGxlLCBudWxsXTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGVuaGFuY2VTcGVjaWZpY1Jlc3VsdChyKSB7XG4gIGNvbnN0IGNvbnRlbnRBcmVhID0ge1xuICAgIHdpZHRoOiBVSS5DQVJEX1dJRFRILFxuICAgIGhlaWdodDogd2luZG93LnNjcmVlbi5oZWlnaHRcbiAgfTtcbiAgXG4gIGlmIChyLnN1YlR5cGUgJiYgSlNPTi5wYXJzZShyLnN1YlR5cGUpLmV6KSB7XG4gICAgICAvLyBJbmRpY2F0ZSB0aGF0IHRoaXMgaXMgYSBSSCByZXN1bHQuXG4gICAgICByLnR5cGUgPSAnY2xpcXotZXh0cmEnO1xuICB9XG5cbiAgY29uc3QgdGVtcGxhdGUgPSByLnZlcnRpY2FsID0gZ2V0VmVydGljYWwocik7XG5cbiAgY29uc3Qgc3BlY2lmaWNWaWV3ID0gVUkuVklFV1NbdGVtcGxhdGVdIHx8IFVJLlZJRVdTLmdlbmVyaWM7XG4gIHNwZWNpZmljVmlldy5lbmhhbmNlUmVzdWx0cyAmJiBzcGVjaWZpY1ZpZXcuZW5oYW5jZVJlc3VsdHMoci5kYXRhLCBjb250ZW50QXJlYSk7XG5cbiAgcmV0dXJuIHI7XG5cbn1cblxuZnVuY3Rpb24gY3Jvc3NUcmFuc2Zvcm0gKGVsZW1lbnQsIHgpIHtcbiAgdmFyIHBsYXRmb3JtcyA9IFsnJywgJy13ZWJraXQtJywgJy1tcy0nXTtcbiAgcGxhdGZvcm1zLmZvckVhY2goZnVuY3Rpb24gKHBsYXRmb3JtKSB7XG4gICAgZWxlbWVudC5zdHlsZVtwbGF0Zm9ybSArICd0cmFuc2Zvcm0nXSA9ICd0cmFuc2xhdGUzZCgnKyB4ICsncHgsIDBweCwgMHB4KSc7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRSZXN1bHRLaW5kKGVsKSB7XG4gICAgcmV0dXJuIGdldFJlc3VsdE9yQ2hpbGRBdHRyKGVsLCAna2luZCcpLnNwbGl0KCc7Jyk7XG59XG5cbi8vIGJ1YmJsZXMgdXAgbWF4aW11bSB0byB0aGUgcmVzdWx0IGNvbnRhaW5lclxuZnVuY3Rpb24gZ2V0UmVzdWx0T3JDaGlsZEF0dHIoZWwsIGF0dHIpIHtcbiAgaWYgKGVsID09PSBudWxsKSByZXR1cm4gJyc7XG4gIGlmIChlbC5jbGFzc05hbWUgPT09IEZSQU1FKSByZXR1cm4gZWwuZ2V0QXR0cmlidXRlKGF0dHIpIHx8ICcnO1xuICByZXR1cm4gZWwuZ2V0QXR0cmlidXRlKGF0dHIpIHx8IGdldFJlc3VsdE9yQ2hpbGRBdHRyKGVsLnBhcmVudEVsZW1lbnQsIGF0dHIpO1xufVxuXG5mdW5jdGlvbiByZXN1bHRDbGljayhldikge1xuICAgIHZhciBlbCA9IGV2LnRhcmdldCwgdXJsLFxuICAgICAgICBleHRyYSxcbiAgICAgICAgYWN0aW9uO1xuXG4gICAgd2hpbGUgKGVsKSB7XG4gICAgICAgIGV4dHJhID0gZXh0cmEgfHwgZWwuZ2V0QXR0cmlidXRlKCdleHRyYScpO1xuICAgICAgICB1cmwgPSBlbC5nZXRBdHRyaWJ1dGUoJ3VybCcpO1xuICAgICAgICBhY3Rpb24gPSBlbC5nZXRBdHRyaWJ1dGUoJ2NsaXF6LWFjdGlvbicpO1xuXG4gICAgICAgIGlmICh1cmwgJiYgdXJsICE9PSAnIycpIHtcblxuICAgICAgICAgICAgdmFyIGNhcmQgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjYXJkJylbQ0xJUVpFbnZpcm9ubWVudC5jdXJyZW50UGFnZV07XG4gICAgICAgICAgICB2YXIgY2FyZFBvc2l0aW9uID0gY2FyZC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICAgIHZhciBjb29yZGluYXRlID0gW2V2LmNsaWVudFggLSBjYXJkUG9zaXRpb24ubGVmdCwgZXYuY2xpZW50WSAtIGNhcmRQb3NpdGlvbi50b3AsIFVJLkNBUkRfV0lEVEhdO1xuXG4gICAgICAgICAgICB2YXIgc2lnbmFsID0ge1xuICAgICAgICAgICAgICAgIHR5cGU6ICdhY3Rpdml0eScsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAncmVzdWx0X2NsaWNrJyxcbiAgICAgICAgICAgICAgICBleHRyYTogZXh0cmEsXG4gICAgICAgICAgICAgICAgbW91c2U6IGNvb3JkaW5hdGUsXG4gICAgICAgICAgICAgICAgcG9zaXRpb25fdHlwZTogZ2V0UmVzdWx0S2luZChlbClcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIENsaXF6VXRpbHMudGVsZW1ldHJ5KHNpZ25hbCk7XG4gICAgICAgICAgICBDTElRWkVudmlyb25tZW50Lm9wZW5MaW5rKHdpbmRvdywgdXJsKTtcbiAgICAgICAgICAgIHJldHVybjtcblxuICAgICAgICB9IGVsc2UgaWYgKGFjdGlvbikge1xuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdzdG9wLWNsaWNrLWV2ZW50LXByb3BhZ2F0aW9uJzpcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2NvcHktY2FsYy1hbnN3ZXInOlxuICAgICAgICAgICAgICAgICAgICBDTElRWkVudmlyb25tZW50LmNvcHlSZXN1bHQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbGMtYW5zd2VyJykuaW5uZXJIVE1MKTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbGMtY29waWVkLW1zZycpLnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbGMtY29weS1tc2cnKS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChlbC5jbGFzc05hbWUgPT09IEZSQU1FKSBicmVhazsgLy8gZG8gbm90IGdvIGhpZ2hlciB0aGFuIGEgcmVzdWx0XG4gICAgICAgIGVsID0gZWwucGFyZW50RWxlbWVudDtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNoaWZ0UmVzdWx0cygpIHtcbiAgdmFyIGZyYW1lcyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoJ2ZyYW1lJyk7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZnJhbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGxlZnQgPSBmcmFtZXNbaV0uc3R5bGUubGVmdC5zdWJzdHJpbmcoMCwgZnJhbWVzW2ldLnN0eWxlLmxlZnQubGVuZ3RoIC0gMSk7XG4gICAgbGVmdCA9IHBhcnNlSW50KGxlZnQpO1xuICAgIGxlZnQgLT0gKGxlZnQgLyAoaSArIDEpKTtcbiAgICBDTElRWkVudmlyb25tZW50Lmxhc3RSZXN1bHRzW2ldICYmIChDTElRWkVudmlyb25tZW50Lmxhc3RSZXN1bHRzW2ldLmxlZnQgPSBsZWZ0KTtcbiAgICBmcmFtZXNbaV0uc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICB9XG4gIHNldFJlc3VsdE5hdmlnYXRpb24oQ0xJUVpFbnZpcm9ubWVudC5sYXN0UmVzdWx0cyk7XG59XG5cblxuZnVuY3Rpb24gc2V0UmVzdWx0TmF2aWdhdGlvbihyZXN1bHRzKSB7XG5cbiAgdmFyIHNob3dHb29nbGV0aGlzID0gMTtcbiAgaWYgKCFyZXN1bHRzWzBdIHx8IHJlc3VsdHNbMF0uZGF0YS50ZW1wbGF0ZSA9PT0gJ25vUmVzdWx0Jykge1xuICAgIHNob3dHb29nbGV0aGlzID0gMDtcbiAgfVxuXG4gIHJlc3VsdHNCb3guc3R5bGUud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aCArICdweCc7XG4gIHJlc3VsdHNCb3guc3R5bGUubWFyZ2luTGVmdCA9IFBFRUsgKyAncHgnO1xuXG5cbiAgdmFyIGxhc3RSZXN1bHRPZmZzZXQgPSByZXN1bHRzLmxlbmd0aCA/IHJlc3VsdHNbcmVzdWx0cy5sZW5ndGggLSAxXS5sZWZ0IHx8IDAgOiAwO1xuXG4gIGN1cnJlbnRSZXN1bHRzQ291bnQgPSBsYXN0UmVzdWx0T2Zmc2V0IC8gVUkuQ0FSRF9XSURUSCArIHNob3dHb29nbGV0aGlzICsgMTtcblxuICAvLyBnZXQgbnVtYmVyIG9mIHBhZ2VzIGFjY29yZGluZyB0byBudW1iZXIgb2YgY2FyZHMgcGVyIHBhZ2VcbiAgVUkublBhZ2VzID0gTWF0aC5jZWlsKGN1cnJlbnRSZXN1bHRzQ291bnQgLyBVSS5uQ2FyZHNQZXJQYWdlKTtcblxuICBpZiAoIUNMSVFaRW52aXJvbm1lbnQudnApIHtcbiAgICBDTElRWkVudmlyb25tZW50LnZwID0gVUkuaW5pdFZpZXdwYWdlcigpO1xuICB9XG5cbiAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJyZW5jeS10cGwnKSkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXJyZW5jeS10cGwnKS5wYXJlbnROb2RlLnJlbW92ZUF0dHJpYnV0ZSgndXJsJyk7XG4gIH1cblxufSAgXG5cbnZhciByZXNpemVUaW1lb3V0O1xud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGZ1bmN0aW9uICgpIHtcbiAgaWYgKCFVSS5pc1NlYXJjaCgpKSByZXR1cm47XG4gIGNsZWFyVGltZW91dChyZXNpemVUaW1lb3V0KTtcbiAgcmVzaXplVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgIGNvbnN0IGxhc3RuQ2FyZHNQZXJQYWdlID0gVUkubkNhcmRzUGVyUGFnZTtcbiAgICBzZXRDYXJkQ291bnRQZXJQYWdlKHdpbmRvdy5pbm5lcldpZHRoKTtcbiAgICBVSS5zZXREaW1lbnNpb25zKCk7XG4gICAgY29uc3QgZnJhbWVzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShGUkFNRSk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmcmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGxldCBsZWZ0ID0gVUkuQ0FSRF9XSURUSCAqIGk7XG4gICAgICBmcmFtZXNbaV0uc3R5bGUubGVmdCA9IGxlZnQgKyAncHgnO1xuICAgICAgQ0xJUVpFbnZpcm9ubWVudC5sYXN0UmVzdWx0c1tpXSAmJiAoQ0xJUVpFbnZpcm9ubWVudC5sYXN0UmVzdWx0c1tpXS5sZWZ0ID0gbGVmdCk7XG4gICAgICBmcmFtZXNbaV0uc3R5bGUud2lkdGggPSBVSS5DQVJEX1dJRFRIICsgJ3B4JztcbiAgICB9XG4gICAgc2V0UmVzdWx0TmF2aWdhdGlvbihDTElRWkVudmlyb25tZW50Lmxhc3RSZXN1bHRzKTtcbiAgICBDTElRWkVudmlyb25tZW50LmN1cnJlbnRQYWdlID0gTWF0aC5mbG9vcihDTElRWkVudmlyb25tZW50LmN1cnJlbnRQYWdlICogbGFzdG5DYXJkc1BlclBhZ2UgLyBVSS5uQ2FyZHNQZXJQYWdlKTtcbiAgICBDTElRWkVudmlyb25tZW50LnZwLmdvVG9JbmRleChDTElRWkVudmlyb25tZW50LmN1cnJlbnRQYWdlLCAwKTtcbiAgICB9LCAyMDApO1xuXG59KTtcblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Rpc2Nvbm5lY3RlZCcsIGZ1bmN0aW9uICgpIHtcbiAgbGV0IGVsZW0gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncmVjb25uZWN0aW5nJyk7XG4gIGVsZW0gJiYgKGVsZW0uaW5uZXJIVE1MID0gJzxoMz4nK0NsaXF6VXRpbHMuZ2V0TG9jYWxpemVkU3RyaW5nKCdtb2JpbGVfcmVjb25uZWN0aW5nX21zZycpKyc8L2gzPicpO1xufSk7XG5cbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdjb25uZWN0ZWQnLCBmdW5jdGlvbiAoKSB7XG4gIGxldCBlbGVtID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3JlY29ubmVjdGluZycpO1xuICBlbGVtICYmIChlbGVtLmlubmVySFRNTCA9ICcnKTtcbn0pO1xuXG5cblVJLmNsaWNrSGFuZGxlcnMgPSB7fTtcbk9iamVjdC5rZXlzKGhhbmRsZWJhcnMuVEVNUExBVEVTKS5jb25jYXQoaGFuZGxlYmFycy5NRVNTQUdFX1RFTVBMQVRFUykuY29uY2F0KGhhbmRsZWJhcnMuUEFSVElBTFMpLmZvckVhY2goZnVuY3Rpb24gKHRlbXBsYXRlTmFtZSkge1xuICBVSS5WSUVXU1t0ZW1wbGF0ZU5hbWVdID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdHJ5IHtcbiAgICBsZXQgbW9kdWxlID0gU3lzdGVtLmdldCgnbW9iaWxlLXVpL3ZpZXdzLycgKyB0ZW1wbGF0ZU5hbWUpO1xuICAgIGlmIChtb2R1bGUpIHtcbiAgICAgIFVJLlZJRVdTW3RlbXBsYXRlTmFtZV0gPSBuZXcgbW9kdWxlLmRlZmF1bHQod2luZG93KTtcblxuICAgICAgaWYgKFVJLlZJRVdTW3RlbXBsYXRlTmFtZV0uZXZlbnRzICYmIFVJLlZJRVdTW3RlbXBsYXRlTmFtZV0uZXZlbnRzLmNsaWNrKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKFVJLlZJRVdTW3RlbXBsYXRlTmFtZV0uZXZlbnRzLmNsaWNrKS5mb3JFYWNoKGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICAgICAgICAgIFVJLmNsaWNrSGFuZGxlcnNbc2VsZWN0b3JdID0gVUkuVklFV1NbdGVtcGxhdGVOYW1lXS5ldmVudHMuY2xpY2tbc2VsZWN0b3JdO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH0gY2F0Y2ggKGV4KSB7XG4gICAgQ2xpcXpVdGlscy5sb2coZXgsICdVSScpO1xuICB9XG59KTtcblxuZXhwb3J0IGRlZmF1bHQgVUk7XG4gICAgIl19