System.register('mobile-freshtab/news', ['mobile-touch/longpress', 'core/templates', 'core/utils'], function (_export) {
  /* global CustomEvent, window, document, osAPI */

  'use strict';

  var LongPress, CliqzHandlebars, CliqzUtils, DEPENDENCY_STATUS, topSitesList, tempBlockedTopSites, newsVersion, displayedTopSitesCount, TOPSITES_LIMIT, News;

  function displayTopSites(list) {
    var isEditMode = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

    var blockedTopSites = CliqzUtils.getLocalStorage().getObject('blockedTopSites', []);

    list = deduplicateTopsites(list);

    list = list.filter(function (item) {
      return blockedTopSites.indexOf(item.mainDomain) === -1;
    });

    list = list.filter(function (item) {
      return tempBlockedTopSites.indexOf(item.mainDomain) === -1;
    });

    displayedTopSitesCount = Math.min(list.length, TOPSITES_LIMIT);

    list = list.map(function (r) {
      var details = CliqzUtils.getDetailsFromUrl(r.url);
      var logo = CliqzUtils.getLogoDetails(details);
      return {
        title: r.title,
        displayUrl: details.domain || r.title,
        url: r.url,
        text: logo.text,
        backgroundColor: logo.backgroundColor,
        buttonsClass: logo.buttonsClass,
        style: logo.style,
        mainDomain: r.mainDomain,
        baseDomain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[0],
        domain: r.url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1]
      };
    });

    var isEmpty = list.length ? false : true;

    list = list.concat(Array(TOPSITES_LIMIT).fill(''));
    list = list.splice(0, TOPSITES_LIMIT);

    var topSites = CliqzHandlebars.tplCache.topsites;
    var div = document.getElementById('topSites');
    var theme = CliqzUtils.getPref('incognito', false) === 'true' ? 'incognito' : 'standard';
    div.innerHTML = topSites({ isEmpty: isEmpty, isEditMode: isEditMode, list: list, theme: theme });

    CliqzUtils.addEventListenerToElements('#doneEditTopsites', 'click', function (_) {
      var delete_count = tempBlockedTopSites.length;
      var blockedTopSites = CliqzUtils.getLocalStorage().getObject('blockedTopSites', []);
      CliqzUtils.getLocalStorage().setObject('blockedTopSites', blockedTopSites.concat(tempBlockedTopSites));
      tempBlockedTopSites = [];
      displayTopSites(topSitesList);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'confirm_delete',
        count: displayedTopSitesCount,
        delete_count: delete_count
      });
    });

    CliqzUtils.addEventListenerToElements('#cancelEditTopsites', 'click', function (_ref) {
      var element = _ref.target;

      var delete_count = tempBlockedTopSites.length;
      tempBlockedTopSites = [];
      displayTopSites(topSitesList);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'cancel_delete',
        count: displayedTopSitesCount,
        delete_count: delete_count
      });
    });

    CliqzUtils.addEventListenerToElements('.blockTopsite', 'click', function (_ref2) {
      var element = _ref2.target;

      tempBlockedTopSites.push(this.getAttribute('mainDomain'));
      displayTopSites(topSitesList, true);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target: 'delete_topsite',
        count: displayedTopSitesCount,
        index: element.dataset.index
      });
    });

    function onLongpress(element) {
      displayTopSites(topSitesList, true);
      CliqzUtils.telemetry({
        type: 'home',
        action: 'longpress',
        target: 'topsite',
        count: displayedTopSitesCount,
        index: element.dataset.index
      });
    }

    function onTap(element) {
      osAPI.openLink(element.getAttribute('url'));
      CliqzUtils.telemetry({
        type: 'home',
        action: 'click',
        target_type: 'topsites',
        target_index: element.dataset.index
      });
    }

    new LongPress('.topSitesLink', onLongpress, onTap);
  }

  function deduplicateTopsites(list) {
    var domains = {};
    return list.filter(function (item) {
      return !domains[item.mainDomain] && (domains[item.mainDomain] = true);
    });
  }

  function log() {
    CliqzUtils.log(arguments, 'News');
  }
  return {
    setters: [function (_mobileTouchLongpress) {
      LongPress = _mobileTouchLongpress['default'];
    }, function (_coreTemplates) {
      CliqzHandlebars = _coreTemplates['default'];
    }, function (_coreUtils) {
      CliqzUtils = _coreUtils['default'];
    }],
    execute: function () {
      DEPENDENCY_STATUS = {
        NOT_LOADED: 'NOT_LOADED',
        LOADED: 'LOADED',
        GIVE_UP: 'GIVE_UP',
        RETRY_LIMIT: 20,
        retryCount: {}
      };
      topSitesList = [];
      tempBlockedTopSites = [];
      TOPSITES_LIMIT = 5;
      News = {
        GENERIC_NEWS_URL: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map&bmresult=rotated-top-news.cliqz.com&lang=de,en&locale=de',
        _recentHistory: {},
        getNews: function getNews() {
          log('loading news');

          var method = 'GET',
              callback = function callback(data) {
            try {
              var sResponse = JSON.parse(data.responseText);
              newsVersion = sResponse.results[0].news_version;
              News.displayTopNews(sResponse.results[0].articles);
            } catch (e) {
              log(e);
            }
          },
              onerror = function onerror() {
            log('news error', arguments);
            setTimeout(News.getNews, 1500);
          },
              timeout = function timeout() {
            log('timeout error', arguments);
            News.getNews();
          },
              data = null;
          CliqzUtils.httpHandler(method, News.GENERIC_NEWS_URL, callback, onerror, timeout, data);
        },
        displayTopNews: function displayTopNews(top_news) {
          if (!top_news) {
            return;
          }

          top_news = top_news.map(function (r) {
            var details = CliqzUtils.getDetailsFromUrl(r.url);
            var logo = CliqzUtils.getLogoDetails(details);
            return {
              title: r.title,
              description: r.description,
              short_title: r.short_title || r.title,
              displayUrl: details.domain || r.title,
              url: r.url,
              type: r.type,
              text: logo.text,
              backgroundColor: logo.backgroundColor,
              buttonsClass: logo.buttonsClass,
              style: logo.style
            };
          });
          top_news = top_news.splice(0, 2);
          var dependencyStatus = News.getDependencyStatus('topnews');
          if (dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
            return setTimeout(News.displayTopNews, 100, top_news);
          } else if (dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
            return;
          }
          var topNews = CliqzHandlebars.tplCache.topnews;
          var div = document.getElementById('topNews');
          div.innerHTML = topNews(top_news);
          CliqzUtils.addEventListenerToElements('.topNewsLink', 'click', function () {
            CliqzUtils.telemetry({
              type: 'home',
              action: 'click',
              target_type: 'topnews',
              target_index: this.dataset.index
            });
          });
          window.dispatchEvent(new CustomEvent('newsLoadingDone'));

          CliqzUtils.telemetry({
            'type': 'home',
            'action': 'display',
            'historysites': displayedTopSitesCount,
            'topnews_version': newsVersion
          });
        },

        getRecentHistory: function getRecentHistory(history) {
          history.results.forEach(function (result) {
            return News._recentHistory[result.url] = true;
          });
        },
        startPageHandler: function startPageHandler(list) {
          var dependencyStatus = News.getDependencyStatus('topsites');
          if (dependencyStatus === DEPENDENCY_STATUS.NOT_LOADED) {
            return setTimeout(News.startPageHandler, 100, list);
          } else if (dependencyStatus === DEPENDENCY_STATUS.GIVE_UP) {
            return;
          }

          News.getNews();

          topSitesList = [];
          var domain = undefined,
              domainArr = undefined,
              mainDomain = undefined;
          for (var i = 0; i < list.length; i++) {
            domain = list[i].url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i)[1];
            domainArr = domain.split('.');
            mainDomain = domainArr[domainArr.length - 2].substr(0, 10);
            mainDomain = mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
            list[i].mainDomain = mainDomain;
            topSitesList.push(list[i]);
          }

          displayTopSites(topSitesList);
        },
        // wait for logos, templates, and locale to be loaded
        getDependencyStatus: function getDependencyStatus(template) {
          if (DEPENDENCY_STATUS.retryCount[template] === undefined) {
            DEPENDENCY_STATUS.retryCount[template] = 0;
          }
          if (!CliqzUtils.BRANDS_DATABASE.buttons || !CliqzHandlebars.tplCache[template]) {
            return DEPENDENCY_STATUS.retryCount[template]++ < DEPENDENCY_STATUS.RETRY_LIMIT ? DEPENDENCY_STATUS.NOT_LOADED : DEPENDENCY_STATUS.GIVE_UP;
          }
          DEPENDENCY_STATUS.retryCount[template] = 0;
          return DEPENDENCY_STATUS.LOADED;
        }
      };

      _export('default', News);
    }
  };
});