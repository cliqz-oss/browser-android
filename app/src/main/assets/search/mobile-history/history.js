System.register('mobile-history/history', ['core/cliqz', 'core/templates', 'mobile-history/webview'], function (_export) {
  /* global osAPI, math */

  'use strict';var utils, handlebars, document, Hammer, historyTimer, allHistory, allFavorites, History;

  function showHistory(history) {
    clearTimeout(historyTimer);

    allHistory = history;
    var queries = utils.getLocalStorage().getObject('recentQueries', []).reverse();

    history.forEach(function (item) {
      item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
    });

    var historyWithLogos = addLogos(history);
    var data = mixHistoryWithQueries(queries, historyWithLogos);
    History.displayData(data, History.showOnlyFavorite);
  }

  function showFavorites(favorites) {
    clearTimeout(historyTimer);

    allFavorites = favorites;

    favorites.forEach(function (item) {
      item.domain = item.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
    });

    var favoritesWithLogos = addLogos(favorites);

    History.displayData(favoritesWithLogos, History.showOnlyFavorite);
  }

  function addLogos(list) {
    return list.map(function (item) {
      var details = utils.getDetailsFromUrl(item.url);
      item.logo = utils.getLogoDetails(details);
      return item;
    });
  }

  function sendShowTelemetry(data, type) {
    var queryCount = data.filter(function (item) {
      return item.query;
    }).length,
        urlCount = data.filter(function (item) {
      return item.url;
    }).length;
    utils.telemetry({
      type: type,
      action: 'show',
      active_day_count: data.length - queryCount - urlCount,
      query_count: queryCount,
      url_count: urlCount
    });
  }

  function mixHistoryWithQueries(queries, history) {
    var data = [];
    var hi = 0;
    var qi = 0;
    var date = '';
    while (true) {
      if (hi >= history.length || qi >= queries.length) {
        break;
      }

      if (history[hi].timestamp <= queries[qi].timestamp) {
        if (getDateFromTimestamp(history[hi].timestamp) !== date) {
          data.push({ date: getDateFromTimestamp(history[hi].timestamp) });
          date = getDateFromTimestamp(history[hi].timestamp);
        }
        data.push(history[hi]);

        hi++;
      } else {
        if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
          data.push({ date: getDateFromTimestamp(queries[qi].timestamp) });
          date = getDateFromTimestamp(queries[qi].timestamp);
        }
        data.push(queries[qi]);
        qi++;
      }
    }
    while (hi < history.length) {
      if (getDateFromTimestamp(history[hi].timestamp) !== date) {
        data.push({ date: getDateFromTimestamp(history[hi].timestamp) });
        date = getDateFromTimestamp(history[hi].timestamp);
      }
      data.push(history[hi]);
      hi++;
    }
    while (qi < queries.length) {
      if (getDateFromTimestamp(queries[qi].timestamp) !== date) {
        data.push({ date: getDateFromTimestamp(queries[qi].timestamp) });
        date = getDateFromTimestamp(queries[qi].timestamp);
      }
      data.push(queries[qi]);
      qi++;
    }

    return data;
  }

  function displayData(data) {
    var isFavorite = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    if (!handlebars.tplCache['conversations']) {
      return setTimeout(History.displayData, 100, data);
    }

    var template = isFavorite ? 'favorites' : 'conversations';
    document.body.innerHTML = handlebars.tplCache[template]({ data: data });

    var B = document.body,
        H = document.documentElement;

    var height = undefined;

    if (typeof document.height !== 'undefined') {
      height = document.height; // For webkit browsers
    } else {
        height = Math.max(B.scrollHeight, B.offsetHeight, H.clientHeight, H.scrollHeight, H.offsetHeight);
      }

    document.body.scrollTop = height + 100;

    attachListeners(document.getElementById('container'));

    var type = isFavorite ? 'favorites' : 'history';
    History.sendShowTelemetry(data, type);
  }

  function getDateFromTimestamp(time) {
    var d = new Date(time);

    var days = d.getDate();
    days = days > 9 ? days : '0' + days;

    var months = d.getMonth() + 1;
    months = months > 9 ? months : '0' + months;

    var year = d.getFullYear();

    var formatedDate = days + '.' + months + '.' + year;
    return formatedDate;
  }
  function removeQuery(id) {
    var queries = utils.getLocalStorage().getObject('recentQueries', []);

    queries = queries.filter(function (query) {
      return id !== query.id;
    });
    utils.getLocalStorage().setObject('recentQueries', queries);
  }

  function removeHistoryItem(id) {
    allHistory = allHistory.filter(function (history) {
      return id !== history.id;
    });
    osAPI.removeHistoryItems([id]);
  }

  function removeItem(item) {
    var id = parseInt(item.dataset.id);
    item.getAttribute('class').indexOf('question') >= 0 ? removeQuery(id) : removeHistoryItem(id);
  }

  function unfavoriteItem(item) {
    var url = item.dataset.ref;
    var title = item.dataset.title;
    osAPI.setFavorites([{ title: title, url: url }], false);
  }

  function init(onlyFavorites) {
    migrateQueries();
    History.showOnlyFavorite = onlyFavorites;
    update();
  }

  function update() {
    var callback = History.showOnlyFavorite ? showFavorites : showHistory;
    historyTimer = setTimeout(callback, 500, []);
    History.showOnlyFavorite ? osAPI.getFavorites('History.showFavorites') : osAPI.getHistoryItems('History.showHistory');
  }

  function clearHistory() {
    utils.getLocalStorage().setObject('recentQueries', []);
  }

  function clearFavorites() {
    utils.getLocalStorage().setObject('favoriteQueries', []);
  }

  function onElementClick(event) {
    var element = event.srcEvent.currentTarget;
    var tab = History.showOnlyFavorite ? 'favorites' : 'history';
    var targetType = element.getAttribute('class');
    if (targetType.indexOf('question') >= 0) {
      osAPI.notifyQuery(element.dataset.ref);
      sendClickTelemetry(event.target, 'query', tab);
    } else {
      osAPI.openLink(element.dataset.ref);
      sendClickTelemetry(event.target, 'site', tab);
    }
  }

  function crossTransform(element, x) {
    var platforms = ['', '-webkit-', '-ms-'];
    platforms.forEach(function (platform) {
      element.style[platform + 'transform'] = 'translate3d(' + x + 'px, 0px, 0px)';
    });
  }

  function isElementDate(element) {
    return !element.dataset.timestamp;
  }

  function attachListeners(list) {
    var listItems = list.getElementsByTagName("li");

    for (var i = 0; i < listItems.length; i++) {
      if (!isElementDate(listItems[i])) {
        new Hammer(listItems[i]).on('pan', onSwipe);
        new Hammer(listItems[i]).on('panend', onSwipeEnd);
        new Hammer(listItems[i]).on('tap', onElementClick);
      }
    }
  }

  function removeDomElement(element) {
    var prev = element.previousElementSibling;
    var next = element.nextElementSibling;
    if (prev && isElementDate(prev)) {
      if (!next || isElementDate(next)) {
        element.parentElement.removeChild(prev);
      }
    }
    element.parentElement.removeChild(element);
  }

  function onSwipe(e) {
    crossTransform(e.srcEvent.currentTarget, e.deltaX);
  }
  function onSwipeEnd(e) {
    var element = e.srcEvent.currentTarget;
    var tab = History.showOnlyFavorite ? 'favorites' : 'history';
    var targetType = element.getAttribute('class').indexOf('question') >= 0 ? 'query' : 'site';
    var direction = e.direction === 4 ? 'right' : 'left';
    if (math.abs(e.velocityX) < -1 || math.abs(e.deltaX) > 150) {
      History.showOnlyFavorite ? unfavoriteItem(element) : removeItem(element);
      removeDomElement(element);
      sendSwipeTelemetry(targetType, tab, direction);
    } else {
      crossTransform(element, 0);
    }
  }

  function sendClickTelemetry(element, targetType, tab) {
    utils.telemetry({
      type: tab,
      action: 'click',
      target_type: targetType,
      element: element.dataset.name
    });
  }

  function sendSwipeTelemetry(targetType, tab, direction) {
    utils.telemetry({
      type: tab,
      action: 'swipe_' + direction,
      target: targetType
    });
  }

  /**
    This function is for migration of history and favorite queries
    to extension version Mobile Extension 3.5.2
  **/
  function migrateQueries() {
    if (utils.getLocalStorage().getItem('isFavoritesRefactored')) {
      return;
    }
    var queries = utils.getLocalStorage().getObject('recentQueries', []);
    var favoriteQueries = utils.getLocalStorage().getObject('favoriteQueries', []);
    queries = queries.map(function (query) {
      if (query.favorite) {
        favoriteQueries.unshift({ query: query.query, timestamp: query.timestamp });
      }
      delete query.favorite;
      return query;
    });
    utils.getLocalStorage().setObject('recentQueries', queries);
    utils.getLocalStorage().setObject('favoriteQueries', favoriteQueries);
    utils.getLocalStorage().setItem('isFavoritesRefactored', true);
  }

  return {
    setters: [function (_coreCliqz) {
      utils = _coreCliqz.utils;
    }, function (_coreTemplates) {
      handlebars = _coreTemplates['default'];
    }, function (_mobileHistoryWebview) {
      document = _mobileHistoryWebview.document;
      Hammer = _mobileHistoryWebview.Hammer;
    }],
    execute: function () {
      allHistory = [];
      allFavorites = [];
      History = {
        init: init,
        update: update,
        showHistory: showHistory,
        showFavorites: showFavorites,
        clearHistory: clearHistory,
        clearFavorites: clearFavorites,
        displayData: displayData,
        sendShowTelemetry: sendShowTelemetry,
        showOnlyFavorite: false
      };

      _export('default', History);
    }
  };
});