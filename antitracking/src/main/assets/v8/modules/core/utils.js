System.register('core/utils', ['platform/environment'], function (_export) {
  'use strict';

  var CLIQZEnvironment, CliqzLanguage, VERTICAL_ENCODINGS, COLOURS, LOGOS, BRANDS_DATABASE, brand_loaded, MINUTE, ipv4_part, ipv4_regex, ipv6_regex, CliqzUtils;

  var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

  return {
    setters: [function (_platformEnvironment) {
      CLIQZEnvironment = _platformEnvironment['default'];
    }],
    execute: function () {
      VERTICAL_ENCODINGS = {
        'people': 'p',
        'news': 'n',
        'video': 'v',
        'hq': 'h',
        'bm': 'm',
        'recipeRD': 'r',
        'game': 'g',
        'movie': 'o'
      };
      COLOURS = ['#ffce6d', '#ff6f69', '#96e397', '#5c7ba1', '#bfbfbf', '#3b5598', '#fbb44c', '#00b2e5', '#b3b3b3', '#99cccc', '#ff0027', '#999999'];
      LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'];
      BRANDS_DATABASE = { domains: {}, palette: ["999"] };
      brand_loaded = false;
      MINUTE = 60 * 1e3;
      ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])";
      ipv4_regex = new RegExp("^" + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "([:]([0-9])+)?$");
      ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");
      CliqzUtils = {
        LANGS: { 'de': 'de', 'en': 'en', 'fr': 'fr' },
        RESULTS_PROVIDER: 'https://newbeta.cliqz.com/api/v1/results?q=',
        RICH_HEADER: 'https://newbeta.cliqz.com/api/v1/rich-header?path=/map',
        RESULTS_PROVIDER_LOG: 'https://newbeta.cliqz.com/api/v1/logging?q=',
        RESULTS_PROVIDER_PING: 'https://newbeta.cliqz.com/ping',
        CONFIG_PROVIDER: 'https://newbeta.cliqz.com/api/v1/config',
        SAFE_BROWSING: 'https://safe-browsing.cliqz.com',
        TUTORIAL_URL: 'https://cliqz.com/home/onboarding',
        UNINSTALL: 'https://cliqz.com/home/offboarding',
        FEEDBACK: 'https://cliqz.com/feedback/',
        SYSTEM_BASE_URL: CLIQZEnvironment.SYSTEM_BASE_URL,
        PREFERRED_LANGUAGE: null,

        BRANDS_DATABASE: BRANDS_DATABASE,

        //will be updated from the mixer config endpoint every time new logos are generated
        BRANDS_DATABASE_VERSION: 1457952995848,
        GEOLOC_WATCH_ID: null, // The ID of the geolocation watcher (function that updates cached geolocation on change)
        VERTICAL_TEMPLATES: {
          'n': 'news',
          'p': 'people',
          'v': 'video',
          'h': 'hq',
          'r': 'recipe',
          'g': 'cpgame_movie',
          'o': 'cpgame_movie'
        },
        hm: null,
        TEMPLATES_PATH: CLIQZEnvironment.TEMPLATES_PATH,
        TEMPLATES: CLIQZEnvironment.TEMPLATES,
        MESSAGE_TEMPLATES: CLIQZEnvironment.MESSAGE_TEMPLATES,
        PARTIALS: CLIQZEnvironment.PARTIALS,
        SKIN_PATH: CLIQZEnvironment.SKIN_PATH,
        LOCALE_PATH: CLIQZEnvironment.LOCALE_PATH,
        RERANKERS: CLIQZEnvironment.RERANKERS,
        MIN_QUERY_LENGHT_FOR_EZ: CLIQZEnvironment.MIN_QUERY_LENGHT_FOR_EZ,

        init: function init(options) {
          options = options || {};

          if (!options.lang) {
            return Promise.reject("lang missing");
          }
          CliqzUtils.importModule('core/gzip').then(function (gzip) {
            CLIQZEnvironment.gzip = gzip;
          })['catch'](function () {
            //no gzip, do nothing
          });

          // FIXME: `import CliqzLanguage from "platform/language";` does not work
          CliqzUtils.importModule('platform/language').then(function (language) {
            CliqzLanguage = language['default'];
          })['catch'](function () {
            CliqzUtils.log('error: cannot load CliqzLanguage');
          });

          // cutting cyclic dependency
          CLIQZEnvironment.getLogoDetails = CliqzUtils.getLogoDetails.bind(CliqzUtils);
          CLIQZEnvironment.getDetailsFromUrl = CliqzUtils.getDetailsFromUrl.bind(CliqzUtils);
          CLIQZEnvironment.getLocalizedString = CliqzUtils.getLocalizedString.bind(CliqzUtils);
          CLIQZEnvironment.SKIN_PATH = CliqzUtils.SKIN_PATH;

          if (!brand_loaded) {
            brand_loaded = true;

            var config = this.getPref("config_logoVersion"),
                dev = this.getPref("brands-database-version");

            if (dev) this.BRANDS_DATABASE_VERSION = dev;else if (config) this.BRANDS_DATABASE_VERSION = config;

            var retryPattern = [60 * MINUTE, 10 * MINUTE, 5 * MINUTE, 2 * MINUTE, MINUTE];

            (function getLogoDB(url) {

              CliqzUtils && CliqzUtils.httpGet(url, function (req) {
                CliqzUtils.BRANDS_DATABASE = BRANDS_DATABASE = JSON.parse(req.response);
              }, function () {
                var retry = retryPattern.pop();
                if (retry) CliqzUtils.setTimeout(getLogoDB, retry, url);
              }, MINUTE / 2);
            })(CLIQZEnvironment.getBrandsDBUrl(this.BRANDS_DATABASE_VERSION));
          }

          CliqzUtils.log('Initialized', 'CliqzUtils');

          CliqzUtils.setLang(options.lang);
        },

        setLang: function setLang(lang) {
          CliqzUtils.PREFERRED_LANGUAGE = lang;
          CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
        },

        initPlatform: function initPlatform(System) {
          System.baseURL = CLIQZEnvironment.SYSTEM_BASE_URL;
          CliqzUtils.System = System;
        },

        importModule: function importModule(moduleName) {
          return CliqzUtils.System['import'](moduleName);
        },

        callAction: function callAction(moduleName, actionName, args) {
          var module = CliqzUtils.System.get(moduleName + "/background");
          var action = module['default'].actions[actionName];
          return action.apply(null, args);
        },

        isNumber: function isNumber(n) {
          /*
          NOTE: this function can't recognize numbers in the form such as: "1.2B", but it can for "1e4". See specification for isFinite()
           */
          return !isNaN(parseFloat(n)) && isFinite(n);
        },

        //returns the type only if it is known
        getKnownType: function getKnownType(type) {
          return VERTICAL_ENCODINGS.hasOwnProperty(type) && type;
        },

        /**
         * Construct a uri from a url
         * @param {string}  aUrl - url
         * @param {string}  aOriginCharset - optional character set for the URI
         * @param {nsIURI}  aBaseURI - base URI for the spec
         */
        makeUri: CLIQZEnvironment.makeUri,

        //move this out of CliqzUtils!
        setSupportInfo: function setSupportInfo(status) {
          var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
              host = 'firefox',
              hostVersion = '';

          //check if the prefs exist and if they are string
          if (prefs.getPrefType('distribution.id') == 32 && prefs.getPrefType('distribution.version') == 32) {
            host = prefs.getCharPref('distribution.id');
            hostVersion = prefs.getCharPref('distribution.version');
          }
          var info = JSON.stringify({
            version: CliqzUtils.extensionVersion,
            host: host,
            hostVersion: hostVersion,
            status: status != undefined ? status : "active"
          }),
              sites = ["http://cliqz.com", "https://cliqz.com"];

          sites.forEach(function (url) {
            var ls = CLIQZEnvironment.getLocalStorage(url);

            if (ls) ls.setItem("extension-info", info);
          });
        },
        getLogoDetails: function getLogoDetails(urlDetails) {
          var base = urlDetails.name,
              baseCore = base.replace(/[-]/g, ""),
              check = function check(host, rule) {
            var address = host.lastIndexOf(base),
                parseddomain = host.substr(0, address) + "$" + host.substr(address + base.length);

            return parseddomain.indexOf(rule) != -1;
          },
              result = {},
              domains = BRANDS_DATABASE.domains;

          if (base.length == 0) return result;

          if (base == "IP") result = { text: "IP", backgroundColor: "9077e3" };else if (domains[base]) {
            for (var i = 0, imax = domains[base].length; i < imax; i++) {
              var rule = domains[base][i]; // r = rule, b = background-color, l = logo, t = text, c = color

              if (i == imax - 1 || check(urlDetails.host, rule.r)) {
                result = {
                  backgroundColor: rule.b ? rule.b : null,
                  backgroundImage: rule.l ? "url(https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/logos/" + base + "/" + rule.r + ".svg)" : "",
                  text: rule.t,
                  color: rule.c ? "" : "#fff"
                };

                break;
              }
            }
          }
          result.text = result.text || (baseCore.length > 1 ? baseCore[0].toUpperCase() + baseCore[1].toLowerCase() : "");
          result.backgroundColor = result.backgroundColor || BRANDS_DATABASE.palette[base.split("").reduce(function (a, b) {
            return a + b.charCodeAt(0);
          }, 0) % BRANDS_DATABASE.palette.length];
          var colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor),
              buttonClass = BRANDS_DATABASE.buttons && colorID != -1 && BRANDS_DATABASE.buttons[colorID] ? BRANDS_DATABASE.buttons[colorID] : 10;

          result.buttonsClass = "cliqz-brands-button-" + buttonClass;
          result.style = "background-color: #" + result.backgroundColor + ";color:" + (result.color || '#fff') + ";";

          if (result.backgroundImage) result.style += "background-image:" + result.backgroundImage + "; text-indent: -10em;";

          return result;
        },
        httpHandler: function httpHandler() {
          var errorHandler = arguments[3]; // see httpGet or httpPost arguments
          try {
            return CLIQZEnvironment.httpHandler.apply(CLIQZEnvironment, arguments);
          } catch (e) {
            if (errorHandler) {
              errorHandler(e);
            } else {
              CliqzUtils.log(e, "httpHandler failed");
            }
          }
        },
        httpGet: function httpGet(url, callback, onerror, timeout, _, sync) {
          return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout, _, sync);
        },
        httpPost: function httpPost(url, callback, data, onerror, timeout) {
          return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
        },
        getLocalStorage: CLIQZEnvironment.getLocalStorage,
        /**
         * Loads a resource URL from the xpi.
         *
         * Wraps httpGet in a try-catch clause. We need to do this, because when
         * trying to load a non-existing file from an xpi via xmlhttprequest, Firefox
         * throws a NS_ERROR_FILE_NOT_FOUND exception instead of calling the onerror
         * function.
         *
         * @see https://bugzilla.mozilla.org/show_bug.cgi?id=827243 (probably).
         */
        loadResource: function loadResource(url, callback, onerror) {
          try {
            return CliqzUtils.httpGet(url, callback, onerror, 3000);
          } catch (e) {
            CliqzUtils.log("Could not load resource " + url + " from the xpi", "CliqzUtils.httpHandler");
            onerror && onerror();
          }
        },
        openTabInWindow: CLIQZEnvironment.openTabInWindow,
        /**
         * Get a value from preferences db
         * @param {string}  pref - preference identifier
         * @param {*=}      defautlValue - returned value in case pref is not defined
         * @param {string=} prefix - prefix for pref
         */
        getPref: CLIQZEnvironment.getPref,
        /**
         * Set a value in preferences db
         * @param {string}  pref - preference identifier
         * @param {*=}      defautlValue - returned value in case pref is not defined
         * @param {string=} prefix - prefix for pref
         */
        setPref: CLIQZEnvironment.setPref,
        /**
         * Check if there is a value in preferences db
         * @param {string}  pref - preference identifier
         * @param {string=} prefix - prefix for pref
         */
        hasPref: CLIQZEnvironment.hasPref,
        /**
         * Clear value in preferences db
         * @param {string}  pref - preference identifier
         * @param {string=} prefix - prefix for pref
         */
        clearPref: CLIQZEnvironment.clearPref,
        log: CLIQZEnvironment.log,
        getDay: function getDay() {
          return Math.floor(new Date().getTime() / 86400000);
        },
        //creates a random 'len' long string from the input space
        rand: function rand(len, _space) {
          var ret = '',
              i,
              space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
              sLen = space.length;

          for (i = 0; i < len; i++) ret += space.charAt(Math.floor(Math.random() * sLen));

          return ret;
        },
        hash: function hash(s) {
          return s.split('').reduce(function (a, b) {
            return (a << 4) - a + b.charCodeAt(0) & 0xEFFFFFF;
          }, 0);
        },
        cleanMozillaActions: function cleanMozillaActions(url) {
          if (url.indexOf("moz-action:") == 0) {
            var _url$match = url.match(/^moz-action:([^,]+),(.*)$/);

            var _url$match2 = _slicedToArray(_url$match, 3);

            var action = _url$match2[1];
            var url = _url$match2[2];

            //url = url.match(/^moz-action:([^,]+),(.*)$/)[2];
          }
          return [action, url];
        },
        cleanUrlProtocol: function cleanUrlProtocol(url, cleanWWW) {
          if (!url) return '';

          var protocolPos = url.indexOf('://');

          // removes protocol http(s), ftp, ...
          if (protocolPos != -1 && protocolPos <= 6) url = url.split('://')[1];

          // removes the www.
          if (cleanWWW && url.toLowerCase().indexOf('www.') == 0) url = url.slice(4);

          return url;
        },
        getDetailsFromUrl: function getDetailsFromUrl(originalUrl) {
          var _CliqzUtils$cleanMozillaActions = CliqzUtils.cleanMozillaActions(originalUrl);

          var _CliqzUtils$cleanMozillaActions2 = _slicedToArray(_CliqzUtils$cleanMozillaActions, 2);

          var action = _CliqzUtils$cleanMozillaActions2[0];
          var originalUrl = _CliqzUtils$cleanMozillaActions2[1];

          // exclude protocol
          var url = originalUrl,
              name = '',
              tld = '',
              subdomains = [],
              path = '',
              query = '',
              fragment = '',
              ssl = originalUrl.indexOf('https') == 0;

          // remove scheme
          url = CliqzUtils.cleanUrlProtocol(url, false);
          var scheme = originalUrl.replace(url, '').replace('//', '');

          // separate hostname from path, etc. Could be separated from rest by /, ? or #
          var host = url.split(/[\/\#\?]/)[0].toLowerCase();
          var path = url.replace(host, '');

          // separate username:password@ from host
          var userpass_host = host.split('@');
          if (userpass_host.length > 1) host = userpass_host[1];

          // Parse Port number
          var port = "";

          var isIPv4 = ipv4_regex.test(host);
          var isIPv6 = ipv6_regex.test(host);

          var indexOfColon = host.indexOf(":");
          if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
            port = host.substr(indexOfColon + 1);
            host = host.substr(0, indexOfColon);
          } else if (isIPv6) {
            // If an IPv6 address has a port number, it will be right after a closing bracket ] : format [ip_v6]:port
            var endOfIP = host.indexOf(']:');
            if (endOfIP >= 0) {
              port = host.split(']:')[1];
              host = host.split(']:')[0].replace('[', '').replace(']', '');
            }
          }

          // extract query and fragment from url
          var query = '';
          var query_idx = path.indexOf('?');
          if (query_idx != -1) {
            query = path.substr(query_idx + 1);
          }

          var fragment = '';
          var fragment_idx = path.indexOf('#');
          if (fragment_idx != -1) {
            fragment = path.substr(fragment_idx + 1);
          }

          // remove query and fragment from path
          path = path.replace('?' + query, '');
          path = path.replace('#' + fragment, '');
          query = query.replace('#' + fragment, '');

          // extra - all path, query and fragment
          var extra = path;
          if (query) extra += "?" + query;
          if (fragment) extra += "#" + fragment;

          isIPv4 = ipv4_regex.test(host);
          isIPv6 = ipv6_regex.test(host);
          var isLocalhost = CliqzUtils.isLocalhost(host, isIPv4, isIPv6);

          // find parts of hostname
          if (!isIPv4 && !isIPv6 && !isLocalhost) {
            try {
              tld = CLIQZEnvironment.tldExtractor(host);

              // Get the domain name w/o subdomains and w/o TLD
              name = host.slice(0, -(tld.length + 1)).split('.').pop(); // +1 for the '.'

              // Get subdomains
              var name_tld = name + "." + tld;
              subdomains = host.slice(0, -name_tld.length).split(".").slice(0, -1);

              //remove www if exists
              // TODO: I don't think this is the right place to do this.
              //       Disabled for now, but check there are no issues.
              // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
            } catch (e) {
              name = "";
              host = "";
              //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
            }
          } else {
              name = isLocalhost ? "localhost" : "IP";
            }

          // remove www from beginning, we need cleanHost in the friendly url
          var cleanHost = host;
          if (host.toLowerCase().indexOf('www.') == 0) {
            cleanHost = host.slice(4);
          }

          var friendly_url = cleanHost + extra;
          //remove trailing slash from the end
          friendly_url = CliqzUtils.stripTrailingSlash(friendly_url);

          //Handle case where we have only tld for example http://cliqznas
          if (cleanHost === tld) {
            name = tld;
          }

          var urlDetails = {
            scheme: scheme,
            name: name,
            domain: tld ? name + '.' + tld : '',
            tld: tld,
            subdomains: subdomains,
            path: path,
            query: query,
            fragment: fragment,
            extra: extra,
            host: host,
            cleanHost: cleanHost,
            ssl: ssl,
            port: port,
            friendly_url: friendly_url
          };

          return urlDetails;
        },
        stripTrailingSlash: function stripTrailingSlash(str) {
          if (str.substr(-1) === '/') {
            return str.substr(0, str.length - 1);
          }
          return str;
        },
        _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
        isUrl: function isUrl(input) {
          //step 1 remove eventual protocol
          var protocolPos = input.indexOf('://');
          if (protocolPos != -1 && protocolPos <= 6) {
            input = input.slice(protocolPos + 3);
          }
          //step2 remove path & everything after
          input = input.split('/')[0];
          //step3 run the regex
          return CliqzUtils._isUrlRegExp.test(input);
        },

        // Chechks if the given string is a valid IPv4 addres
        isIPv4: function isIPv4(input) {
          var ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; // numbers 0 - 255
          var ipv4_regex = new RegExp("^" + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "\\." + ipv4_part + "([:]([0-9])+)?$"); // port number
          return ipv4_regex.test(input);
        },

        isIPv6: function isIPv6(input) {

          // Currently using a simple regex for "what looks like an IPv6 address" for readability
          var ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");
          return ipv6_regex.test(input);

          /* A better (more precise) regex to validate IPV6 addresses from StackOverflow:
          link: http://stackoverflow.com/questions/53497/regular-expression-that-matches-valid-ipv6-addresses
           var ipv6_regex = new RegExp("(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:)"
          + "{1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,"
          + "4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a"
          + "-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}"
          + "|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])"
          + "|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))");
          */
        },

        isLocalhost: function isLocalhost(host, isIPv4, isIPv6) {
          if (host == "localhost") return true;
          if (isIPv4 && host.substr(0, 3) == "127") return true;
          if (isIPv6 && host == "::1") return true;

          return false;
        },

        // checks if a value represents an url which is a seach engine
        isSearch: function isSearch(value) {
          if (CliqzUtils.isUrl(value)) {
            return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true : false;
          }
          return false;
        },
        // checks if a string is a complete url
        isCompleteUrl: function isCompleteUrl(input) {
          var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
          if (!pattern.test(input)) {
            return false;
          } else {
            return true;
          }
        },
        // extract query term from search engine result page URLs
        extractQueryFromUrl: function extractQueryFromUrl(url) {
          // Google
          if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
            url = url.substring(url.lastIndexOf('q=') + 2).split('&')[0];
            // Bing
          } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
              url = url.substring(url.indexOf('q=') + 2).split('&')[0];
              // Yahoo
            } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
                url = url.substring(url.indexOf('p=') + 2).split('&')[0];
              } else {
                url = null;
              }
          var decoded = url ? decodeURIComponent(url.replace(/\+/g, ' ')) : null;
          if (decoded) return decoded;else return url;
        },
        // Remove clutter (http, www) from urls
        generalizeUrl: function generalizeUrl(url, skipCorrection) {
          if (!url) {
            return '';
          }
          var val = url.toLowerCase();
          var cleanParts = CliqzUtils.cleanUrlProtocol(val, false).split('/'),
              host = cleanParts[0],
              pathLength = 0,
              SYMBOLS = /,|\./g;
          if (!skipCorrection) {
            if (cleanParts.length > 1) {
              pathLength = ('/' + cleanParts.slice(1).join('/')).length;
            }
            if (host.indexOf('www') === 0 && host.length > 4) {
              // only fix symbols in host
              if (SYMBOLS.test(host[3]) && host[4] != ' ')
                // replace only issues in the host name, not ever in the path
                val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') + (pathLength ? val.substr(-pathLength) : '');
            }
          }
          url = CliqzUtils.cleanUrlProtocol(val, true);
          return url[url.length - 1] == '/' ? url.slice(0, -1) : url;
        },
        // Remove clutter from urls that prevents pattern detection, e.g. checksum
        simplifyUrl: function simplifyUrl(url) {
          var q;
          // Google redirect urls
          if (url.search(/http(s?):\/\/www\.google\..*\/url\?.*url=.*/i) === 0) {
            // Return target URL instead
            url = url.substring(url.lastIndexOf('url=')).split('&')[0];
            url = url.substr(4);
            return decodeURIComponent(url);

            // Remove clutter from Google searches
          } else if (url.search(/http(s?):\/\/www\.google\..*\/.*q=.*/i) === 0) {
              q = url.substring(url.lastIndexOf('q=')).split('&')[0];
              if (q != 'q=') {
                // tbm defines category (images/news/...)
                var param = url.indexOf('#') != -1 ? url.substr(url.indexOf('#')) : url.substr(url.indexOf('?'));
                var tbm = param.indexOf('tbm=') != -1 ? '&' + param.substring(param.lastIndexOf('tbm=')).split('&')[0] : '';
                var page = param.indexOf('start=') != -1 ? '&' + param.substring(param.lastIndexOf('start=')).split('&')[0] : '';
                return 'https://www.google.com/search?' + q + tbm /*+ page*/;
              } else {
                  return url;
                }
              // Bing
            } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
                q = url.substring(url.indexOf('q=')).split('&')[0];
                if (q != 'q=') {
                  if (url.indexOf('search?') != -1) return url.substr(0, url.indexOf('search?')) + 'search?' + q;else return url.substr(0, url.indexOf('/?')) + '/?' + q;
                } else {
                  return url;
                }
                // Yahoo redirect
              } else if (url.search(/http(s?):\/\/r.search\.yahoo\.com\/.*/i) === 0) {
                  url = url.substring(url.lastIndexOf('/RU=')).split('/RK=')[0];
                  url = url.substr(4);
                  return decodeURIComponent(url);
                  // Yahoo
                } else if (url.search(/http(s?):\/\/.*search\.yahoo\.com\/search.*p=.*/i) === 0) {
                    var p = url.substring(url.indexOf('p=')).split('&')[0];
                    if (p != 'p=' && url.indexOf(';') != -1) {
                      return url.substr(0, url.indexOf(';')) + '?' + p;
                    } else {
                      return url;
                    }
                  } else {
                    return url;
                  }
        },
        // establishes the connection
        pingCliqzResults: function pingCliqzResults() {
          CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
        },
        getBackendResults: function getBackendResults(q, callback) {},
        getCliqzResults: function getCliqzResults(q, callback) {
          CliqzUtils._sessionSeq++;

          // if the user sees the results more than 500ms we consider that he starts a new query
          if (CliqzUtils._queryLastDraw && Date.now() > CliqzUtils._queryLastDraw + 500) {
            CliqzUtils._queryCount++;
          }
          CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
          CliqzUtils._queryLastLength = q.length;

          var url = CliqzUtils.RESULTS_PROVIDER + encodeURIComponent(q) + CliqzUtils.encodeSessionParams() + CliqzLanguage.stateToQueryString() + CliqzUtils.encodeLocale() + CliqzUtils.encodeResultOrder() + CliqzUtils.encodeCountry() + CliqzUtils.encodeFilter() + CliqzUtils.encodeLocation() + CliqzUtils.encodeResultCount(7) + CliqzUtils.disableWikiDedup();

          var req = CliqzUtils.httpGet(url, function (res) {
            callback && callback(res, q);
          });
        },
        // IP driven configuration
        fetchAndStoreConfig: function fetchAndStoreConfig(callback) {
          CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER, function (res) {
            if (res && res.response) {
              try {
                var config = JSON.parse(res.response);
                for (var k in config) {
                  CliqzUtils.setPref('config_' + k, config[k]);
                }
              } catch (e) {}
            }

            callback();
          }, callback, //on error the callback still needs to be called
          2000);
        },
        encodeLocale: function encodeLocale() {
          // send browser language to the back-end
          return '&locale=' + (CliqzUtils.PREFERRED_LANGUAGE || "");
        },
        encodeCountry: function encodeCountry() {
          //international results not supported
          return '&force_country=true';
        },
        disableWikiDedup: function disableWikiDedup() {
          // disable wikipedia deduplication on the backend side
          var doDedup = CliqzUtils.getPref("languageDedup", false);
          if (doDedup) return '&ddl=0';else return "";
        },
        encodeFilter: function encodeFilter() {
          var data = {
            'conservative': 3,
            'moderate': 0,
            'liberal': 1
          },
              state = data[CliqzUtils.getPref('adultContentFilter', 'moderate')];

          return '&adult=' + state;
        },
        encodeResultCount: function encodeResultCount(count) {
          var doDedup = CliqzUtils.getPref("languageDedup", false);
          count = count || 5;
          if (doDedup) return '&count=' + count;else return "";
        },
        encodeResultType: function encodeResultType(type) {
          if (type.indexOf('action') !== -1) return ['T'];else if (type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);else if (type.indexOf('cliqz-pattern') == 0) return ['C'];else if (type === 'cliqz-extra') return ['X'];else if (type === 'cliqz-series') return ['S'];else if (type.indexOf('bookmark') == 0 || type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));else if (type.indexOf('favicon') == 0 || type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

          // cliqz type = "cliqz-custom sources-X"
          else if (type.indexOf('cliqz-custom') == 0) return type.substr(21);

          return type; //should never happen
        },
        //eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
        isPrivateResultType: function isPrivateResultType(type) {
          var onlyType = type[0].split('|')[0];
          return 'HBTCS'.indexOf(onlyType) != -1 && type.length == 1;
        },
        // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
        encodeCliqzResultType: function encodeCliqzResultType(type) {
          var pos = type.indexOf('sources-');
          if (pos != -1) return CliqzUtils.encodeSources(type.substr(pos + 8));else return [];
        },
        // random ID generated at each urlbar focus
        _searchSession: '',
        // number of sequences in each session
        _sessionSeq: 0,
        _queryLastLength: null,
        _queryLastDraw: null,
        // number of queries in search session
        _queryCount: null,
        setSearchSession: function setSearchSession(rand) {
          CliqzUtils._searchSession = rand;
          CliqzUtils._sessionSeq = 0;
          CliqzUtils._queryCount = 0;
          CliqzUtils._queryLastLength = 0;
          CliqzUtils._queryLastDraw = 0;
        },
        encodeSessionParams: function encodeSessionParams() {
          if (CliqzUtils._searchSession.length) {
            return '&s=' + encodeURIComponent(CliqzUtils._searchSession) + '&n=' + CliqzUtils._sessionSeq + '&qc=' + CliqzUtils._queryCount;
          } else return '';
        },

        encodeLocation: function encodeLocation(specifySource, lat, lng) {
          var qs = ['&loc_pref=', CliqzUtils.getPref('share_location', 'ask')].join('');

          if (CliqzUtils.USER_LAT && CliqzUtils.USER_LNG || lat && lng) {
            qs += ['&loc=', lat || CliqzUtils.USER_LAT, ',', lng || CliqzUtils.USER_LNG, specifySource ? ',U' : ''].join('');
          }

          return qs;
        },
        encodeSources: function encodeSources(sources) {
          return sources.toLowerCase().split(', ').map(function (s) {
            if (s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
              return 'd';else return VERTICAL_ENCODINGS[s] || s;
          });
        },
        isPrivate: CLIQZEnvironment.isPrivate,
        telemetry: CLIQZEnvironment.telemetry,
        resultTelemetry: function resultTelemetry(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
          CliqzUtils.setResultOrder(resultOrder);
          var params = encodeURIComponent(query) + (queryAutocompleted ? '&a=' + encodeURIComponent(queryAutocompleted) : '') + '&i=' + resultIndex + (resultUrl ? '&u=' + encodeURIComponent(resultUrl) : '') + CliqzUtils.encodeSessionParams() + CliqzUtils.encodeResultOrder() + (extra ? '&e=' + extra : '');
          CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER_LOG + params);
          CliqzUtils.setResultOrder('');
          CliqzUtils.log(params, 'Utils.resultTelemetry');
        },
        _resultOrder: '',
        setResultOrder: function setResultOrder(resultOrder) {
          CliqzUtils._resultOrder = resultOrder;
        },
        encodeResultOrder: function encodeResultOrder() {
          return CliqzUtils._resultOrder && CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(JSON.stringify(CliqzUtils._resultOrder)) : '';
        },
        setInterval: CLIQZEnvironment.setInterval,
        setTimeout: CLIQZEnvironment.setTimeout,
        clearTimeout: CLIQZEnvironment.clearTimeout,
        clearInterval: CLIQZEnvironment.clearTimeout,
        Promise: CLIQZEnvironment.Promise,
        locale: {},
        currLocale: null,
        loadLocale: function loadLocale(lang_locale) {
          var locales = {
            "en-US": "en"
          };
          lang_locale = locales[lang_locale] || lang_locale;

          if (!CliqzUtils.locale.hasOwnProperty(lang_locale) && !CliqzUtils.locale.hasOwnProperty('default')) {
            try {
              CliqzUtils.getLocaleFile(encodeURIComponent(lang_locale), lang_locale);
            } catch (e) {
              var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
              try {
                CliqzUtils.getLocaleFile(loc, lang_locale);
              } catch (e) {
                try {
                  CliqzUtils.getLocaleFile('de', 'default');
                } catch (e) {}
              }
            }
          }
        },
        getLocaleFile: function getLocaleFile(locale_path, locale_key) {
          function callback(req) {
            if (CliqzUtils) {
              if (locale_key !== 'default') {
                CliqzUtils.currLocale = locale_key;
              }
              CliqzUtils.locale[locale_key] = JSON.parse(req.response);
            }
          }
          function onerror(err) {}
          var url = CLIQZEnvironment.LOCALE_PATH + locale_path + '/cliqz.json';
          var response = CliqzUtils.httpGet(url, callback, onerror, 3000, null, true);
          if (response.readyState !== 2) {
            throw "Error";
          }
          return response;
        },
        getLanguageFromLocale: function getLanguageFromLocale(locale) {
          return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
        },
        getLanguage: function getLanguage(win) {
          return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
        },
        getLocalizedString: function getLocalizedString(key, substitutions) {
          if (!key) return '';

          var str = key,
              localMessages;

          if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale] && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
            str = CliqzUtils.locale[CliqzUtils.currLocale][key].message;
            localMessages = CliqzUtils.locale[CliqzUtils.currLocale];
          } else if (CliqzUtils.locale['default'] && CliqzUtils.locale['default'][key]) {
            str = CliqzUtils.locale['default'][key].message;
            localMessages = CliqzUtils.locale['default'];
          }

          if (!substitutions) {
            substitutions = [];
          }
          if (!Array.isArray(substitutions)) {
            substitutions = [substitutions];
          }

          function replacer(matched, index, dollarSigns) {
            if (index) {
              index = parseInt(index, 10) - 1;
              return index in substitutions ? substitutions[index] : "";
            } else {
              // For any series of contiguous `$`s, the first is dropped, and
              // the rest remain in the output string.
              return dollarSigns;
            }
          }
          return str.replace(/\$(?:([1-9]\d*)|(\$+))/g, replacer);
        },
        // gets all the elements with the class 'cliqz-locale' and adds
        // the localized string - key attribute - as content
        localizeDoc: function localizeDoc(doc) {
          var locale = doc.getElementsByClassName('cliqz-locale');
          for (var i = 0; i < locale.length; i++) {
            var el = locale[i];
            el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
          }
        },
        extensionRestart: function extensionRestart(changes) {
          var enumerator = Services.wm.getEnumerator('navigator:browser');
          while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            if (win.CLIQZ && win.CLIQZ.Core) {
              win.CLIQZ.Core.unload(true);
            }
          }

          changes && changes();

          var corePromises = [];
          enumerator = Services.wm.getEnumerator('navigator:browser');
          while (enumerator.hasMoreElements()) {
            var win = enumerator.getNext();
            if (win.CLIQZ && win.CLIQZ.Core) {
              corePromises.push(win.CLIQZ.Core.init());
            }
          }

          return Promise.all(corePromises);
        },
        isWindows: function isWindows() {
          return CLIQZEnvironment.OS.indexOf("win") === 0;
        },
        isMac: function isMac() {
          return CLIQZEnvironment.OS.indexOf("darwin") === 0;
        },
        isLinux: function isLinux() {
          return CLIQZEnvironment.OS.indexOf("linux") === 0;
        },
        getWindow: CLIQZEnvironment.getWindow,
        getWindowID: CLIQZEnvironment.getWindowID,
        hasClass: function hasClass(element, className) {
          return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
        },
        /**
         * Bind functions contexts to a specified object.
         * @param {Object} from - An object, whose function properties will be processed.
         * @param {Object} to - An object, which will be the context (this) of processed functions.
         */
        bindObjectFunctions: function bindObjectFunctions(from, to) {
          for (var funcName in from) {
            var func = from[funcName];
            if (!from.hasOwnProperty(funcName)) continue;
            // Can't compare with prototype of object from a different module.
            if (typeof func != "function") continue;
            from[funcName] = func.bind(to);
          }
        },
        tryDecodeURIComponent: function tryDecodeURIComponent(s) {
          // avoide error from decodeURIComponent('%2')
          try {
            return decodeURIComponent(s);
          } catch (e) {
            return s;
          }
        },
        tryEncodeURIComponent: function tryEncodeURIComponent(s) {
          try {
            return encodeURIComponent(s);
          } catch (e) {
            return s;
          }
        },
        parseQueryString: function parseQueryString(qstr) {
          var query = {};
          var a = (qstr || '').split('&');
          for (var i in a) {
            var b = a[i].split('=');
            query[CliqzUtils.tryDecodeURIComponent(b[0])] = CliqzUtils.tryDecodeURIComponent(b[1]);
          }

          return query;
        },
        roundToDecimal: function roundToDecimal(number, digits) {
          var multiplier = Math.pow(10, digits);
          return Math.round(number * multiplier) / multiplier;
        },
        getAdultFilterState: function getAdultFilterState() {
          var data = {
            'conservative': {
              name: CliqzUtils.getLocalizedString('always'),
              selected: false
            },
            'moderate': {
              name: CliqzUtils.getLocalizedString('always_ask'),
              selected: false
            },
            'liberal': {
              name: CliqzUtils.getLocalizedString('never'),
              selected: false
            }
          };

          data[CliqzUtils.getPref('adultContentFilter', 'moderate')].selected = true;

          return data;
        },
        getNoResults: CLIQZEnvironment.getNoResults,
        disableCliqzResults: CLIQZEnvironment.disableCliqzResults,
        enableCliqzResults: CLIQZEnvironment.enableCliqzResults,
        getParameterByName: function getParameterByName(name, location) {
          name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
          var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
              results = regex.exec(location.search);
          return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        },
        addEventListenerToElements: CLIQZEnvironment.addEventListenerToElements,
        search: CLIQZEnvironment.search,
        distance: CLIQZEnvironment.distance,
        getDefaultSearchEngine: CLIQZEnvironment.getDefaultSearchEngine,
        copyResult: CLIQZEnvironment.copyResult,
        openLink: CLIQZEnvironment.openLink,
        openPopup: CLIQZEnvironment.openPopup,
        isOnPrivateTab: CLIQZEnvironment.isOnPrivateTab,
        getCliqzPrefs: CLIQZEnvironment.getCliqzPrefs,
        isDefaultBrowser: CLIQZEnvironment.isDefaultBrowser,
        initHomepage: CLIQZEnvironment.initHomepage,
        setDefaultSearchEngine: CLIQZEnvironment.setDefaultSearchEngine,
        isUnknownTemplate: CLIQZEnvironment.isUnknownTemplate,
        historySearch: CLIQZEnvironment.historySearch,
        getEngineByName: CLIQZEnvironment.getEngineByName,
        addEngineWithDetails: CLIQZEnvironment.addEngineWithDetails,
        getEngineByAlias: CLIQZEnvironment.getEngineByAlias,
        getSearchEngines: CLIQZEnvironment.getSearchEngines,
        updateAlias: CLIQZEnvironment.updateAlias,
        openLink: CLIQZEnvironment.openLink,
        promiseHttpHandler: CLIQZEnvironment.promiseHttpHandler,
        registerResultProvider: function registerResultProvider(o) {
          CLIQZEnvironment.CliqzResultProviders = o.ResultProviders;
          CLIQZEnvironment.Result = o.Result;
        },
        onRenderComplete: function onRenderComplete(query, box) {
          if (!CLIQZEnvironment.onRenderComplete) return;

          var linkNodes = box.querySelectorAll("[url]:not(.cqz-result-box):not(.entity-story):not([hidden]), [href]:not([hidden])");
          var urls = [].map.call(linkNodes, function (node) {
            return node.getAttribute("url") || node.getAttribute("href");
          }).filter(function (url) {
            return !!url;
          });

          CLIQZEnvironment.onRenderComplete(query, urls);
        }
      };

      _export('default', CliqzUtils);
    }
  };
});
// numbers 0 - 255
// port number
//# sourceMappingURL=data:application/json;base64,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QUFZLENBQUMsTUFBTSxDQUFDLENBQUM7V0FDOUQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFBLEdBQUc7bUJBQUksQ0FBQyxDQUFDLEdBQUc7V0FBQSxDQUFDLENBQUM7O0FBRXhCLDBCQUFnQixDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztTQUNoRDtPQUNGOzt5QkFFYyxVQUFVIiwiZmlsZSI6ImNvcmUvdXRpbHMuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgQ0xJUVpFbnZpcm9ubWVudCBmcm9tIFwicGxhdGZvcm0vZW52aXJvbm1lbnRcIjtcblxudmFyIENsaXF6TGFuZ3VhZ2U7XG5cbnZhciBWRVJUSUNBTF9FTkNPRElOR1MgPSB7XG4gICAgJ3Blb3BsZSc6J3AnLFxuICAgICduZXdzJzonbicsXG4gICAgJ3ZpZGVvJzondicsXG4gICAgJ2hxJzonaCcsXG4gICAgJ2JtJzogJ20nLFxuICAgICdyZWNpcGVSRCc6ICdyJyxcbiAgICAnZ2FtZSc6ICdnJyxcbiAgICAnbW92aWUnOiAnbydcbn07XG5cbnZhciBDT0xPVVJTID0gWycjZmZjZTZkJywnI2ZmNmY2OScsJyM5NmUzOTcnLCcjNWM3YmExJywnI2JmYmZiZicsJyMzYjU1OTgnLCcjZmJiNDRjJywnIzAwYjJlNScsJyNiM2IzYjMnLCcjOTljY2NjJywnI2ZmMDAyNycsJyM5OTk5OTknXSxcbiAgICBMT0dPUyA9IFsnd2lraXBlZGlhJywgJ2dvb2dsZScsICdmYWNlYm9vaycsICd5b3V0dWJlJywgJ2R1Y2tkdWNrZ28nLCAnc3Rlcm5lZnJlc3NlcicsICd6YWxhbmRvJywgJ2JpbGQnLCAnd2ViJywgJ2ViYXknLCAnZ214JywgJ2FtYXpvbicsICd0LW9ubGluZScsICd3aXdvJywgJ3d3ZScsICd3ZWlnaHR3YXRjaGVycycsICdycC1vbmxpbmUnLCAnd21hZ2F6aW5lJywgJ2NoaXAnLCAnc3BpZWdlbCcsICd5YWhvbycsICdwYXlwYWwnLCAnaW1kYicsICd3aWtpYScsICdtc24nLCAnYXV0b2JpbGQnLCAnZGFpbHltb3Rpb24nLCAnaG0nLCAnaG90bWFpbCcsICd6ZWl0JywgJ2JhaG4nLCAnc29mdG9uaWMnLCAnaGFuZGVsc2JsYXR0JywgJ3N0ZXJuJywgJ2NubicsICdtb2JpbGUnLCAnYWV0dicsICdwb3N0YmFuaycsICdka2InLCAnYmluZycsICdhZG9iZScsICdiYmMnLCAnbmlrZScsICdzdGFyYnVja3MnLCAndGVjaGNydW5jaCcsICd2ZXZvJywgJ3RpbWUnLCAndHdpdHRlcicsICd3ZWF0aGVydW5kZXJncm91bmQnLCAneGluZycsICd5ZWxwJywgJ3lhbmRleCcsICd3ZWF0aGVyJywgJ2ZsaWNrciddLFxuICAgIEJSQU5EU19EQVRBQkFTRSA9IHsgZG9tYWluczoge30sIHBhbGV0dGU6IFtcIjk5OVwiXSB9LCBicmFuZF9sb2FkZWQgPSBmYWxzZSxcbiAgICBNSU5VVEUgPSA2MCoxZTMsXG4gICAgaXB2NF9wYXJ0ID0gXCIwKihbMC05XXxbMS05XVswLTldfDFbMC05XXsyfXwyWzAtNF1bMC05XXwyNVswLTVdKVwiLCAvLyBudW1iZXJzIDAgLSAyNTVcbiAgICBpcHY0X3JlZ2V4ID0gbmV3IFJlZ0V4cChcIl5cIiArIGlwdjRfcGFydCArIFwiXFxcXC5cIisgaXB2NF9wYXJ0ICsgXCJcXFxcLlwiKyBpcHY0X3BhcnQgKyBcIlxcXFwuXCIrIGlwdjRfcGFydCArIFwiKFs6XShbMC05XSkrKT8kXCIpLCAvLyBwb3J0IG51bWJlclxuICAgIGlwdjZfcmVnZXggPSBuZXcgUmVnRXhwKFwiXlxcXFxbPygoWzAtOV18W2EtZl18W0EtRl0pKls6Ll0rKFswLTldfFthLWZdfFtBLUZdKStbOi5dKikrW1xcXFxdXT8oWzpdWzAtOV0rKT8kXCIpO1xuXG5cbnZhciBDbGlxelV0aWxzID0ge1xuICBMQU5HUzogICAgICAgICAgICAgICAgICAgICAgICAgIHsnZGUnOidkZScsICdlbic6J2VuJywgJ2ZyJzonZnInfSxcbiAgUkVTVUxUU19QUk9WSURFUjogICAgICAgICAgICAgICAnaHR0cHM6Ly9uZXdiZXRhLmNsaXF6LmNvbS9hcGkvdjEvcmVzdWx0cz9xPScsXG4gIFJJQ0hfSEVBREVSOiAgICAgICAgICAgICAgICAgICAgJ2h0dHBzOi8vbmV3YmV0YS5jbGlxei5jb20vYXBpL3YxL3JpY2gtaGVhZGVyP3BhdGg9L21hcCcsXG4gIFJFU1VMVFNfUFJPVklERVJfTE9HOiAgICAgICAgICAgJ2h0dHBzOi8vbmV3YmV0YS5jbGlxei5jb20vYXBpL3YxL2xvZ2dpbmc/cT0nLFxuICBSRVNVTFRTX1BST1ZJREVSX1BJTkc6ICAgICAgICAgICdodHRwczovL25ld2JldGEuY2xpcXouY29tL3BpbmcnLFxuICBDT05GSUdfUFJPVklERVI6ICAgICAgICAgICAgICAgICdodHRwczovL25ld2JldGEuY2xpcXouY29tL2FwaS92MS9jb25maWcnLFxuICBTQUZFX0JST1dTSU5HOiAgICAgICAgICAgICAgICAgICdodHRwczovL3NhZmUtYnJvd3NpbmcuY2xpcXouY29tJyxcbiAgVFVUT1JJQUxfVVJMOiAgICAgICAgICAgICAgICAgICAnaHR0cHM6Ly9jbGlxei5jb20vaG9tZS9vbmJvYXJkaW5nJyxcbiAgVU5JTlNUQUxMOiAgICAgICAgICAgICAgICAgICAgICAnaHR0cHM6Ly9jbGlxei5jb20vaG9tZS9vZmZib2FyZGluZycsXG4gIEZFRURCQUNLOiAgICAgICAgICAgICAgICAgICAgICAgJ2h0dHBzOi8vY2xpcXouY29tL2ZlZWRiYWNrLycsXG4gIFNZU1RFTV9CQVNFX1VSTDogICAgICAgICAgICAgICAgQ0xJUVpFbnZpcm9ubWVudC5TWVNURU1fQkFTRV9VUkwsXG4gIFBSRUZFUlJFRF9MQU5HVUFHRTogICAgICAgICAgICAgbnVsbCxcblxuICBCUkFORFNfREFUQUJBU0U6IEJSQU5EU19EQVRBQkFTRSxcblxuICAvL3dpbGwgYmUgdXBkYXRlZCBmcm9tIHRoZSBtaXhlciBjb25maWcgZW5kcG9pbnQgZXZlcnkgdGltZSBuZXcgbG9nb3MgYXJlIGdlbmVyYXRlZFxuICBCUkFORFNfREFUQUJBU0VfVkVSU0lPTjogMTQ1Nzk1Mjk5NTg0OCxcbiAgR0VPTE9DX1dBVENIX0lEOiAgICAgICAgICAgICAgICBudWxsLCAvLyBUaGUgSUQgb2YgdGhlIGdlb2xvY2F0aW9uIHdhdGNoZXIgKGZ1bmN0aW9uIHRoYXQgdXBkYXRlcyBjYWNoZWQgZ2VvbG9jYXRpb24gb24gY2hhbmdlKVxuICBWRVJUSUNBTF9URU1QTEFURVM6IHtcbiAgICAgICAgJ24nOiAnbmV3cycgICAgLFxuICAgICAgICAncCc6ICdwZW9wbGUnICAsXG4gICAgICAgICd2JzogJ3ZpZGVvJyAgICxcbiAgICAgICAgJ2gnOiAnaHEnICAgICAgLFxuICAgICAgICAncic6ICdyZWNpcGUnICxcbiAgICAgICAgJ2cnOiAnY3BnYW1lX21vdmllJyxcbiAgICAgICAgJ28nOiAnY3BnYW1lX21vdmllJ1xuICAgIH0sXG4gIGhtOiBudWxsLFxuICBURU1QTEFURVNfUEFUSDogQ0xJUVpFbnZpcm9ubWVudC5URU1QTEFURVNfUEFUSCxcbiAgVEVNUExBVEVTOiBDTElRWkVudmlyb25tZW50LlRFTVBMQVRFUyxcbiAgTUVTU0FHRV9URU1QTEFURVM6IENMSVFaRW52aXJvbm1lbnQuTUVTU0FHRV9URU1QTEFURVMsXG4gIFBBUlRJQUxTOiBDTElRWkVudmlyb25tZW50LlBBUlRJQUxTLFxuICBTS0lOX1BBVEg6IENMSVFaRW52aXJvbm1lbnQuU0tJTl9QQVRILFxuICBMT0NBTEVfUEFUSDogQ0xJUVpFbnZpcm9ubWVudC5MT0NBTEVfUEFUSCxcbiAgUkVSQU5LRVJTOiBDTElRWkVudmlyb25tZW50LlJFUkFOS0VSUyxcbiAgTUlOX1FVRVJZX0xFTkdIVF9GT1JfRVo6IENMSVFaRW52aXJvbm1lbnQuTUlOX1FVRVJZX0xFTkdIVF9GT1JfRVosXG5cbiAgaW5pdDogZnVuY3Rpb24ob3B0aW9ucyl7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cbiAgICBpZiAoIW9wdGlvbnMubGFuZykge1xuICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KFwibGFuZyBtaXNzaW5nXCIpO1xuICAgIH1cbiAgICBDbGlxelV0aWxzLmltcG9ydE1vZHVsZSgnY29yZS9nemlwJykudGhlbihmdW5jdGlvbihnemlwKSB7XG4gICAgICBDTElRWkVudmlyb25tZW50Lmd6aXAgPSBnemlwO1xuICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vbm8gZ3ppcCwgZG8gbm90aGluZ1xuICAgIH0pO1xuXG4gICAgLy8gRklYTUU6IGBpbXBvcnQgQ2xpcXpMYW5ndWFnZSBmcm9tIFwicGxhdGZvcm0vbGFuZ3VhZ2VcIjtgIGRvZXMgbm90IHdvcmtcbiAgICBDbGlxelV0aWxzLmltcG9ydE1vZHVsZSgncGxhdGZvcm0vbGFuZ3VhZ2UnKS50aGVuKGZ1bmN0aW9uKGxhbmd1YWdlKSB7XG4gICAgICBDbGlxekxhbmd1YWdlID0gbGFuZ3VhZ2UuZGVmYXVsdDtcbiAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICBDbGlxelV0aWxzLmxvZygnZXJyb3I6IGNhbm5vdCBsb2FkIENsaXF6TGFuZ3VhZ2UnKTtcbiAgICB9KTtcblxuICAgIC8vIGN1dHRpbmcgY3ljbGljIGRlcGVuZGVuY3lcbiAgICBDTElRWkVudmlyb25tZW50LmdldExvZ29EZXRhaWxzID0gQ2xpcXpVdGlscy5nZXRMb2dvRGV0YWlscy5iaW5kKENsaXF6VXRpbHMpO1xuICAgIENMSVFaRW52aXJvbm1lbnQuZ2V0RGV0YWlsc0Zyb21VcmwgPSBDbGlxelV0aWxzLmdldERldGFpbHNGcm9tVXJsLmJpbmQoQ2xpcXpVdGlscyk7XG4gICAgQ0xJUVpFbnZpcm9ubWVudC5nZXRMb2NhbGl6ZWRTdHJpbmcgPSBDbGlxelV0aWxzLmdldExvY2FsaXplZFN0cmluZy5iaW5kKENsaXF6VXRpbHMpO1xuICAgIENMSVFaRW52aXJvbm1lbnQuU0tJTl9QQVRIID0gQ2xpcXpVdGlscy5TS0lOX1BBVEg7XG5cbiAgICBpZighYnJhbmRfbG9hZGVkKXtcbiAgICAgIGJyYW5kX2xvYWRlZCA9IHRydWU7XG5cbiAgICAgIHZhciBjb25maWcgPSB0aGlzLmdldFByZWYoXCJjb25maWdfbG9nb1ZlcnNpb25cIiksIGRldiA9IHRoaXMuZ2V0UHJlZihcImJyYW5kcy1kYXRhYmFzZS12ZXJzaW9uXCIpO1xuXG4gICAgICBpZiAoZGV2KSB0aGlzLkJSQU5EU19EQVRBQkFTRV9WRVJTSU9OID0gZGV2XG4gICAgICBlbHNlIGlmIChjb25maWcpIHRoaXMuQlJBTkRTX0RBVEFCQVNFX1ZFUlNJT04gPSBjb25maWdcblxuICAgICAgdmFyIHJldHJ5UGF0dGVybiA9IFs2MCpNSU5VVEUsIDEwKk1JTlVURSwgNSpNSU5VVEUsIDIqTUlOVVRFLCBNSU5VVEVdO1xuXG4gICAgICAoZnVuY3Rpb24gZ2V0TG9nb0RCKHVybCl7XG5cbiAgICAgICAgICBDbGlxelV0aWxzICYmIENsaXF6VXRpbHMuaHR0cEdldCh1cmwsXG4gICAgICAgICAgZnVuY3Rpb24ocmVxKXtcbiAgICAgICAgICAgIENsaXF6VXRpbHMuQlJBTkRTX0RBVEFCQVNFID0gIEJSQU5EU19EQVRBQkFTRSA9IEpTT04ucGFyc2UocmVxLnJlc3BvbnNlKTsgfSxcbiAgICAgICAgICBmdW5jdGlvbigpe1xuICAgICAgICAgICAgdmFyIHJldHJ5ID0gcmV0cnlQYXR0ZXJuLnBvcCgpO1xuICAgICAgICAgICAgaWYocmV0cnkpIENsaXF6VXRpbHMuc2V0VGltZW91dChnZXRMb2dvREIsIHJldHJ5LCB1cmwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICAsIE1JTlVURS8yKTtcbiAgICAgIH0pKENMSVFaRW52aXJvbm1lbnQuZ2V0QnJhbmRzREJVcmwodGhpcy5CUkFORFNfREFUQUJBU0VfVkVSU0lPTikpO1xuICAgIH1cblxuICAgIENsaXF6VXRpbHMubG9nKCdJbml0aWFsaXplZCcsICdDbGlxelV0aWxzJyk7XG5cbiAgICBDbGlxelV0aWxzLnNldExhbmcob3B0aW9ucy5sYW5nKTtcbiAgfSxcblxuICBzZXRMYW5nOiBmdW5jdGlvbiAobGFuZykge1xuICAgICBDbGlxelV0aWxzLlBSRUZFUlJFRF9MQU5HVUFHRSA9IGxhbmc7XG4gICAgIENsaXF6VXRpbHMubG9hZExvY2FsZShDbGlxelV0aWxzLlBSRUZFUlJFRF9MQU5HVUFHRSk7XG4gIH0sXG5cbiAgaW5pdFBsYXRmb3JtOiBmdW5jdGlvbihTeXN0ZW0pIHtcbiAgICBTeXN0ZW0uYmFzZVVSTCA9IENMSVFaRW52aXJvbm1lbnQuU1lTVEVNX0JBU0VfVVJMO1xuICAgIENsaXF6VXRpbHMuU3lzdGVtID0gU3lzdGVtO1xuICB9LFxuXG4gIGltcG9ydE1vZHVsZTogZnVuY3Rpb24obW9kdWxlTmFtZSkge1xuICAgIHJldHVybiBDbGlxelV0aWxzLlN5c3RlbS5pbXBvcnQobW9kdWxlTmFtZSlcbiAgfSxcblxuICBjYWxsQWN0aW9uKG1vZHVsZU5hbWUsIGFjdGlvbk5hbWUsIGFyZ3MpIHtcbiAgICB2YXIgbW9kdWxlID0gQ2xpcXpVdGlscy5TeXN0ZW0uZ2V0KG1vZHVsZU5hbWUrXCIvYmFja2dyb3VuZFwiKTtcbiAgICB2YXIgYWN0aW9uID0gbW9kdWxlLmRlZmF1bHQuYWN0aW9uc1thY3Rpb25OYW1lXTtcbiAgICByZXR1cm4gYWN0aW9uLmFwcGx5KG51bGwsIGFyZ3MpO1xuICB9LFxuXG4gIGlzTnVtYmVyOiBmdW5jdGlvbihuKXtcbiAgICAgIC8qXG4gICAgICBOT1RFOiB0aGlzIGZ1bmN0aW9uIGNhbid0IHJlY29nbml6ZSBudW1iZXJzIGluIHRoZSBmb3JtIHN1Y2ggYXM6IFwiMS4yQlwiLCBidXQgaXQgY2FuIGZvciBcIjFlNFwiLiBTZWUgc3BlY2lmaWNhdGlvbiBmb3IgaXNGaW5pdGUoKVxuICAgICAgICovXG4gICAgICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQobikpICYmIGlzRmluaXRlKG4pO1xuICB9LFxuXG4gIC8vcmV0dXJucyB0aGUgdHlwZSBvbmx5IGlmIGl0IGlzIGtub3duXG4gIGdldEtub3duVHlwZTogZnVuY3Rpb24odHlwZSl7XG4gICAgcmV0dXJuIFZFUlRJQ0FMX0VOQ09ESU5HUy5oYXNPd25Qcm9wZXJ0eSh0eXBlKSAmJiB0eXBlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYSB1cmkgZnJvbSBhIHVybFxuICAgKiBAcGFyYW0ge3N0cmluZ30gIGFVcmwgLSB1cmxcbiAgICogQHBhcmFtIHtzdHJpbmd9ICBhT3JpZ2luQ2hhcnNldCAtIG9wdGlvbmFsIGNoYXJhY3RlciBzZXQgZm9yIHRoZSBVUklcbiAgICogQHBhcmFtIHtuc0lVUkl9ICBhQmFzZVVSSSAtIGJhc2UgVVJJIGZvciB0aGUgc3BlY1xuICAgKi9cbiAgbWFrZVVyaTogQ0xJUVpFbnZpcm9ubWVudC5tYWtlVXJpLFxuXG4gIC8vbW92ZSB0aGlzIG91dCBvZiBDbGlxelV0aWxzIVxuICBzZXRTdXBwb3J0SW5mbzogZnVuY3Rpb24oc3RhdHVzKXtcbiAgICB2YXIgcHJlZnMgPSBDb21wb25lbnRzLmNsYXNzZXNbJ0Btb3ppbGxhLm9yZy9wcmVmZXJlbmNlcy1zZXJ2aWNlOzEnXS5nZXRTZXJ2aWNlKENvbXBvbmVudHMuaW50ZXJmYWNlcy5uc0lQcmVmQnJhbmNoKSxcbiAgICAgICAgaG9zdCA9ICdmaXJlZm94JywgaG9zdFZlcnNpb249Jyc7XG5cbiAgICAvL2NoZWNrIGlmIHRoZSBwcmVmcyBleGlzdCBhbmQgaWYgdGhleSBhcmUgc3RyaW5nXG4gICAgaWYocHJlZnMuZ2V0UHJlZlR5cGUoJ2Rpc3RyaWJ1dGlvbi5pZCcpID09IDMyICYmIHByZWZzLmdldFByZWZUeXBlKCdkaXN0cmlidXRpb24udmVyc2lvbicpID09IDMyKXtcbiAgICAgIGhvc3QgPSBwcmVmcy5nZXRDaGFyUHJlZignZGlzdHJpYnV0aW9uLmlkJyk7XG4gICAgICBob3N0VmVyc2lvbiA9IHByZWZzLmdldENoYXJQcmVmKCdkaXN0cmlidXRpb24udmVyc2lvbicpO1xuICAgIH1cbiAgICB2YXIgaW5mbyA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICB2ZXJzaW9uOiBDbGlxelV0aWxzLmV4dGVuc2lvblZlcnNpb24sXG4gICAgICAgICAgaG9zdDogaG9zdCxcbiAgICAgICAgICBob3N0VmVyc2lvbjogaG9zdFZlcnNpb24sXG4gICAgICAgICAgc3RhdHVzOiBzdGF0dXMgIT0gdW5kZWZpbmVkID8gc3RhdHVzIDogXCJhY3RpdmVcIlxuICAgICAgICB9KSxcbiAgICAgICAgc2l0ZXMgPSBbXCJodHRwOi8vY2xpcXouY29tXCIsXCJodHRwczovL2NsaXF6LmNvbVwiXVxuXG4gICAgc2l0ZXMuZm9yRWFjaChmdW5jdGlvbih1cmwpe1xuICAgICAgICB2YXIgbHMgPSBDTElRWkVudmlyb25tZW50LmdldExvY2FsU3RvcmFnZSh1cmwpXG5cbiAgICAgICAgaWYgKGxzKSBscy5zZXRJdGVtKFwiZXh0ZW5zaW9uLWluZm9cIixpbmZvKVxuICAgIH0pXG4gIH0sXG4gIGdldExvZ29EZXRhaWxzOiBmdW5jdGlvbih1cmxEZXRhaWxzKXtcbiAgICB2YXIgYmFzZSA9IHVybERldGFpbHMubmFtZSxcbiAgICAgICAgYmFzZUNvcmUgPSBiYXNlLnJlcGxhY2UoL1stXS9nLCBcIlwiKSxcbiAgICAgICAgY2hlY2sgPSBmdW5jdGlvbihob3N0LHJ1bGUpe1xuICAgICAgICAgIHZhciBhZGRyZXNzID0gaG9zdC5sYXN0SW5kZXhPZihiYXNlKSwgcGFyc2VkZG9tYWluID0gaG9zdC5zdWJzdHIoMCxhZGRyZXNzKSArIFwiJFwiICsgaG9zdC5zdWJzdHIoYWRkcmVzcyArIGJhc2UubGVuZ3RoKVxuXG4gICAgICAgICAgcmV0dXJuIHBhcnNlZGRvbWFpbi5pbmRleE9mKHJ1bGUpICE9IC0xXG4gICAgICAgIH0sXG4gICAgICAgIHJlc3VsdCA9IHt9LFxuICAgICAgICBkb21haW5zID0gQlJBTkRTX0RBVEFCQVNFLmRvbWFpbnM7XG5cblxuXG4gICAgaWYoYmFzZS5sZW5ndGggPT0gMClcbiAgICAgIHJldHVybiByZXN1bHQ7XG5cbiAgICBpZiAoYmFzZSA9PSBcIklQXCIpIHJlc3VsdCA9IHsgdGV4dDogXCJJUFwiLCBiYWNrZ3JvdW5kQ29sb3I6IFwiOTA3N2UzXCIgfVxuXG4gICAgZWxzZSBpZiAoZG9tYWluc1tiYXNlXSkge1xuICAgICAgZm9yICh2YXIgaT0wLGltYXg9ZG9tYWluc1tiYXNlXS5sZW5ndGg7aTxpbWF4O2krKykge1xuICAgICAgICB2YXIgcnVsZSA9IGRvbWFpbnNbYmFzZV1baV0gLy8gciA9IHJ1bGUsIGIgPSBiYWNrZ3JvdW5kLWNvbG9yLCBsID0gbG9nbywgdCA9IHRleHQsIGMgPSBjb2xvclxuXG4gICAgICAgIGlmIChpID09IGltYXggLSAxIHx8IGNoZWNrKHVybERldGFpbHMuaG9zdCxydWxlLnIpKSB7XG4gICAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgYmFja2dyb3VuZENvbG9yOiBydWxlLmI/cnVsZS5iOm51bGwsXG4gICAgICAgICAgICBiYWNrZ3JvdW5kSW1hZ2U6IHJ1bGUubD9cInVybChodHRwczovL2Nkbi5jbGlxei5jb20vYnJhbmRzLWRhdGFiYXNlL2RhdGFiYXNlL1wiICsgdGhpcy5CUkFORFNfREFUQUJBU0VfVkVSU0lPTiArIFwiL2xvZ29zL1wiICsgYmFzZSArIFwiL1wiICsgcnVsZS5yICsgXCIuc3ZnKVwiOlwiXCIsXG4gICAgICAgICAgICB0ZXh0OiBydWxlLnQsXG4gICAgICAgICAgICBjb2xvcjogcnVsZS5jP1wiXCI6XCIjZmZmXCJcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBicmVha1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdC50ZXh0ID0gcmVzdWx0LnRleHQgfHwgKGJhc2VDb3JlLmxlbmd0aCA+IDEgPyAoKGJhc2VDb3JlWzBdLnRvVXBwZXJDYXNlKCkgKyBiYXNlQ29yZVsxXS50b0xvd2VyQ2FzZSgpKSkgOiBcIlwiKVxuICAgIHJlc3VsdC5iYWNrZ3JvdW5kQ29sb3IgPSByZXN1bHQuYmFja2dyb3VuZENvbG9yIHx8IEJSQU5EU19EQVRBQkFTRS5wYWxldHRlW2Jhc2Uuc3BsaXQoXCJcIikucmVkdWNlKGZ1bmN0aW9uKGEsYil7IHJldHVybiBhICsgYi5jaGFyQ29kZUF0KDApIH0sMCkgJSBCUkFORFNfREFUQUJBU0UucGFsZXR0ZS5sZW5ndGhdXG4gICAgdmFyIGNvbG9ySUQgPSBCUkFORFNfREFUQUJBU0UucGFsZXR0ZS5pbmRleE9mKHJlc3VsdC5iYWNrZ3JvdW5kQ29sb3IpLFxuICAgICAgICBidXR0b25DbGFzcyA9IEJSQU5EU19EQVRBQkFTRS5idXR0b25zICYmIGNvbG9ySUQgIT0gLTEgJiYgQlJBTkRTX0RBVEFCQVNFLmJ1dHRvbnNbY29sb3JJRF0/QlJBTkRTX0RBVEFCQVNFLmJ1dHRvbnNbY29sb3JJRF06MTBcblxuICAgIHJlc3VsdC5idXR0b25zQ2xhc3MgPSBcImNsaXF6LWJyYW5kcy1idXR0b24tXCIgKyBidXR0b25DbGFzc1xuICAgIHJlc3VsdC5zdHlsZSA9IFwiYmFja2dyb3VuZC1jb2xvcjogI1wiICsgcmVzdWx0LmJhY2tncm91bmRDb2xvciArIFwiO2NvbG9yOlwiICsgKHJlc3VsdC5jb2xvciB8fCAnI2ZmZicpICsgXCI7XCJcblxuXG4gICAgaWYgKHJlc3VsdC5iYWNrZ3JvdW5kSW1hZ2UpIHJlc3VsdC5zdHlsZSArPSBcImJhY2tncm91bmQtaW1hZ2U6XCIgKyByZXN1bHQuYmFja2dyb3VuZEltYWdlICsgXCI7IHRleHQtaW5kZW50OiAtMTBlbTtcIlxuXG4gICAgcmV0dXJuIHJlc3VsdFxuICB9LFxuICBodHRwSGFuZGxlcjogZnVuY3Rpb24gKCkge1xuICAgIHZhciBlcnJvckhhbmRsZXIgPSBhcmd1bWVudHNbM107IC8vIHNlZSBodHRwR2V0IG9yIGh0dHBQb3N0IGFyZ3VtZW50c1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gQ0xJUVpFbnZpcm9ubWVudC5odHRwSGFuZGxlci5hcHBseShDTElRWkVudmlyb25tZW50LCBhcmd1bWVudHMpO1xuICAgIH0gY2F0Y2goZSkge1xuICAgICAgaWYoZXJyb3JIYW5kbGVyKSB7XG4gICAgICAgIGVycm9ySGFuZGxlcihlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIENsaXF6VXRpbHMubG9nKGUsIFwiaHR0cEhhbmRsZXIgZmFpbGVkXCIpO1xuICAgICAgfVxuICAgIH1cbiAgfSxcbiAgaHR0cEdldDogZnVuY3Rpb24odXJsLCBjYWxsYmFjaywgb25lcnJvciwgdGltZW91dCwgXywgc3luYyl7XG4gICAgcmV0dXJuIENsaXF6VXRpbHMuaHR0cEhhbmRsZXIoJ0dFVCcsIHVybCwgY2FsbGJhY2ssIG9uZXJyb3IsIHRpbWVvdXQsIF8sIHN5bmMpO1xuICB9LFxuICBodHRwUG9zdDogZnVuY3Rpb24odXJsLCBjYWxsYmFjaywgZGF0YSwgb25lcnJvciwgdGltZW91dCkge1xuICAgIHJldHVybiBDbGlxelV0aWxzLmh0dHBIYW5kbGVyKCdQT1NUJywgdXJsLCBjYWxsYmFjaywgb25lcnJvciwgdGltZW91dCwgZGF0YSk7XG4gIH0sXG4gIGdldExvY2FsU3RvcmFnZTogQ0xJUVpFbnZpcm9ubWVudC5nZXRMb2NhbFN0b3JhZ2UsXG4gIC8qKlxuICAgKiBMb2FkcyBhIHJlc291cmNlIFVSTCBmcm9tIHRoZSB4cGkuXG4gICAqXG4gICAqIFdyYXBzIGh0dHBHZXQgaW4gYSB0cnktY2F0Y2ggY2xhdXNlLiBXZSBuZWVkIHRvIGRvIHRoaXMsIGJlY2F1c2Ugd2hlblxuICAgKiB0cnlpbmcgdG8gbG9hZCBhIG5vbi1leGlzdGluZyBmaWxlIGZyb20gYW4geHBpIHZpYSB4bWxodHRwcmVxdWVzdCwgRmlyZWZveFxuICAgKiB0aHJvd3MgYSBOU19FUlJPUl9GSUxFX05PVF9GT1VORCBleGNlcHRpb24gaW5zdGVhZCBvZiBjYWxsaW5nIHRoZSBvbmVycm9yXG4gICAqIGZ1bmN0aW9uLlxuICAgKlxuICAgKiBAc2VlIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTgyNzI0MyAocHJvYmFibHkpLlxuICAgKi9cbiAgbG9hZFJlc291cmNlOiBmdW5jdGlvbih1cmwsIGNhbGxiYWNrLCBvbmVycm9yKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIENsaXF6VXRpbHMuaHR0cEdldCh1cmwsIGNhbGxiYWNrLCBvbmVycm9yLCAzMDAwKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBDbGlxelV0aWxzLmxvZyhcIkNvdWxkIG5vdCBsb2FkIHJlc291cmNlIFwiICsgdXJsICsgXCIgZnJvbSB0aGUgeHBpXCIsXG4gICAgICAgICAgICAgICAgICAgICBcIkNsaXF6VXRpbHMuaHR0cEhhbmRsZXJcIik7XG4gICAgICBvbmVycm9yICYmIG9uZXJyb3IoKTtcbiAgICB9XG4gIH0sXG4gIG9wZW5UYWJJbldpbmRvdzogQ0xJUVpFbnZpcm9ubWVudC5vcGVuVGFiSW5XaW5kb3csXG4gIC8qKlxuICAgKiBHZXQgYSB2YWx1ZSBmcm9tIHByZWZlcmVuY2VzIGRiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSAgcHJlZiAtIHByZWZlcmVuY2UgaWRlbnRpZmllclxuICAgKiBAcGFyYW0geyo9fSAgICAgIGRlZmF1dGxWYWx1ZSAtIHJldHVybmVkIHZhbHVlIGluIGNhc2UgcHJlZiBpcyBub3QgZGVmaW5lZFxuICAgKiBAcGFyYW0ge3N0cmluZz19IHByZWZpeCAtIHByZWZpeCBmb3IgcHJlZlxuICAgKi9cbiAgZ2V0UHJlZjogQ0xJUVpFbnZpcm9ubWVudC5nZXRQcmVmLFxuICAvKipcbiAgICogU2V0IGEgdmFsdWUgaW4gcHJlZmVyZW5jZXMgZGJcbiAgICogQHBhcmFtIHtzdHJpbmd9ICBwcmVmIC0gcHJlZmVyZW5jZSBpZGVudGlmaWVyXG4gICAqIEBwYXJhbSB7Kj19ICAgICAgZGVmYXV0bFZhbHVlIC0gcmV0dXJuZWQgdmFsdWUgaW4gY2FzZSBwcmVmIGlzIG5vdCBkZWZpbmVkXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gcHJlZml4IC0gcHJlZml4IGZvciBwcmVmXG4gICAqL1xuICBzZXRQcmVmOiBDTElRWkVudmlyb25tZW50LnNldFByZWYsXG4gIC8qKlxuICAgKiBDaGVjayBpZiB0aGVyZSBpcyBhIHZhbHVlIGluIHByZWZlcmVuY2VzIGRiXG4gICAqIEBwYXJhbSB7c3RyaW5nfSAgcHJlZiAtIHByZWZlcmVuY2UgaWRlbnRpZmllclxuICAgKiBAcGFyYW0ge3N0cmluZz19IHByZWZpeCAtIHByZWZpeCBmb3IgcHJlZlxuICAgKi9cbiAgaGFzUHJlZjogQ0xJUVpFbnZpcm9ubWVudC5oYXNQcmVmLFxuICAvKipcbiAgICogQ2xlYXIgdmFsdWUgaW4gcHJlZmVyZW5jZXMgZGJcbiAgICogQHBhcmFtIHtzdHJpbmd9ICBwcmVmIC0gcHJlZmVyZW5jZSBpZGVudGlmaWVyXG4gICAqIEBwYXJhbSB7c3RyaW5nPX0gcHJlZml4IC0gcHJlZml4IGZvciBwcmVmXG4gICAqL1xuICBjbGVhclByZWY6IENMSVFaRW52aXJvbm1lbnQuY2xlYXJQcmVmLFxuICBsb2c6IENMSVFaRW52aXJvbm1lbnQubG9nLFxuICBnZXREYXk6IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKG5ldyBEYXRlKCkuZ2V0VGltZSgpIC8gODY0MDAwMDApO1xuICB9LFxuICAvL2NyZWF0ZXMgYSByYW5kb20gJ2xlbicgbG9uZyBzdHJpbmcgZnJvbSB0aGUgaW5wdXQgc3BhY2VcbiAgcmFuZDogZnVuY3Rpb24obGVuLCBfc3BhY2Upe1xuICAgICAgdmFyIHJldCA9ICcnLCBpLFxuICAgICAgICAgIHNwYWNlID0gX3NwYWNlIHx8ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OScsXG4gICAgICAgICAgc0xlbiA9IHNwYWNlLmxlbmd0aDtcblxuICAgICAgZm9yKGk9MDsgaSA8IGxlbjsgaSsrIClcbiAgICAgICAgICByZXQgKz0gc3BhY2UuY2hhckF0KE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHNMZW4pKTtcblxuICAgICAgcmV0dXJuIHJldDtcbiAgfSxcbiAgaGFzaDogZnVuY3Rpb24ocyl7XG4gICAgcmV0dXJuIHMuc3BsaXQoJycpLnJlZHVjZShmdW5jdGlvbihhLGIpeyByZXR1cm4gKCgoYTw8NCktYSkrYi5jaGFyQ29kZUF0KDApKSAmIDB4RUZGRkZGRn0sIDApXG4gIH0sXG4gIGNsZWFuTW96aWxsYUFjdGlvbnM6IGZ1bmN0aW9uKHVybCl7XG4gICAgaWYodXJsLmluZGV4T2YoXCJtb3otYWN0aW9uOlwiKSA9PSAwKSB7XG4gICAgICAgIHZhciBbLCBhY3Rpb24sIHVybF0gPSB1cmwubWF0Y2goL15tb3otYWN0aW9uOihbXixdKyksKC4qKSQvKTtcbiAgICAgICAgLy91cmwgPSB1cmwubWF0Y2goL15tb3otYWN0aW9uOihbXixdKyksKC4qKSQvKVsyXTtcbiAgICB9XG4gICAgcmV0dXJuIFthY3Rpb24sIHVybF07XG4gIH0sXG4gIGNsZWFuVXJsUHJvdG9jb2w6IGZ1bmN0aW9uKHVybCwgY2xlYW5XV1cpe1xuICAgIGlmKCF1cmwpIHJldHVybiAnJztcblxuICAgIHZhciBwcm90b2NvbFBvcyA9IHVybC5pbmRleE9mKCc6Ly8nKTtcblxuICAgIC8vIHJlbW92ZXMgcHJvdG9jb2wgaHR0cChzKSwgZnRwLCAuLi5cbiAgICBpZihwcm90b2NvbFBvcyAhPSAtMSAmJiBwcm90b2NvbFBvcyA8PSA2KVxuICAgICAgdXJsID0gdXJsLnNwbGl0KCc6Ly8nKVsxXTtcblxuICAgIC8vIHJlbW92ZXMgdGhlIHd3dy5cbiAgICBpZihjbGVhbldXVyAmJiB1cmwudG9Mb3dlckNhc2UoKS5pbmRleE9mKCd3d3cuJykgPT0gMClcbiAgICAgIHVybCA9IHVybC5zbGljZSg0KTtcblxuICAgIHJldHVybiB1cmw7XG4gIH0sXG4gIGdldERldGFpbHNGcm9tVXJsOiBmdW5jdGlvbihvcmlnaW5hbFVybCl7XG4gICAgdmFyIFthY3Rpb24sIG9yaWdpbmFsVXJsXSA9IENsaXF6VXRpbHMuY2xlYW5Nb3ppbGxhQWN0aW9ucyhvcmlnaW5hbFVybCk7XG4gICAgLy8gZXhjbHVkZSBwcm90b2NvbFxuICAgIHZhciB1cmwgPSBvcmlnaW5hbFVybCxcbiAgICAgICAgbmFtZSA9ICcnLFxuICAgICAgICB0bGQgPSAnJyxcbiAgICAgICAgc3ViZG9tYWlucyA9IFtdLFxuICAgICAgICBwYXRoID0gJycsXG4gICAgICAgIHF1ZXJ5ID0nJyxcbiAgICAgICAgZnJhZ21lbnQgPSAnJyxcbiAgICAgICAgc3NsID0gb3JpZ2luYWxVcmwuaW5kZXhPZignaHR0cHMnKSA9PSAwO1xuXG4gICAgLy8gcmVtb3ZlIHNjaGVtZVxuICAgIHVybCA9IENsaXF6VXRpbHMuY2xlYW5VcmxQcm90b2NvbCh1cmwsIGZhbHNlKTtcbiAgICB2YXIgc2NoZW1lID0gb3JpZ2luYWxVcmwucmVwbGFjZSh1cmwsICcnKS5yZXBsYWNlKCcvLycsICcnKTtcblxuICAgIC8vIHNlcGFyYXRlIGhvc3RuYW1lIGZyb20gcGF0aCwgZXRjLiBDb3VsZCBiZSBzZXBhcmF0ZWQgZnJvbSByZXN0IGJ5IC8sID8gb3IgI1xuICAgIHZhciBob3N0ID0gdXJsLnNwbGl0KC9bXFwvXFwjXFw/XS8pWzBdLnRvTG93ZXJDYXNlKCk7XG4gICAgdmFyIHBhdGggPSB1cmwucmVwbGFjZShob3N0LCcnKTtcblxuICAgIC8vIHNlcGFyYXRlIHVzZXJuYW1lOnBhc3N3b3JkQCBmcm9tIGhvc3RcbiAgICB2YXIgdXNlcnBhc3NfaG9zdCA9IGhvc3Quc3BsaXQoJ0AnKTtcbiAgICBpZih1c2VycGFzc19ob3N0Lmxlbmd0aCA+IDEpXG4gICAgICBob3N0ID0gdXNlcnBhc3NfaG9zdFsxXTtcblxuICAgIC8vIFBhcnNlIFBvcnQgbnVtYmVyXG4gICAgdmFyIHBvcnQgPSBcIlwiO1xuXG4gICAgdmFyIGlzSVB2NCA9IGlwdjRfcmVnZXgudGVzdChob3N0KTtcbiAgICB2YXIgaXNJUHY2ID0gaXB2Nl9yZWdleC50ZXN0KGhvc3QpO1xuXG5cbiAgICB2YXIgaW5kZXhPZkNvbG9uID0gaG9zdC5pbmRleE9mKFwiOlwiKTtcbiAgICBpZiAoKCFpc0lQdjYgfHwgaXNJUHY0KSAmJiBpbmRleE9mQ29sb24gPj0gMCkge1xuICAgICAgcG9ydCA9IGhvc3Quc3Vic3RyKGluZGV4T2ZDb2xvbisxKTtcbiAgICAgIGhvc3QgPSBob3N0LnN1YnN0cigwLGluZGV4T2ZDb2xvbik7XG4gICAgfVxuICAgIGVsc2UgaWYgKGlzSVB2Nikge1xuICAgICAgLy8gSWYgYW4gSVB2NiBhZGRyZXNzIGhhcyBhIHBvcnQgbnVtYmVyLCBpdCB3aWxsIGJlIHJpZ2h0IGFmdGVyIGEgY2xvc2luZyBicmFja2V0IF0gOiBmb3JtYXQgW2lwX3Y2XTpwb3J0XG4gICAgICB2YXIgZW5kT2ZJUCA9IGhvc3QuaW5kZXhPZignXTonKTtcbiAgICAgIGlmIChlbmRPZklQID49IDApIHtcbiAgICAgICAgcG9ydCA9IGhvc3Quc3BsaXQoJ106JylbMV07XG4gICAgICAgIGhvc3QgPSBob3N0LnNwbGl0KCddOicpWzBdLnJlcGxhY2UoJ1snLCcnKS5yZXBsYWNlKCddJywnJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZXh0cmFjdCBxdWVyeSBhbmQgZnJhZ21lbnQgZnJvbSB1cmxcbiAgICB2YXIgcXVlcnkgPSAnJztcbiAgICB2YXIgcXVlcnlfaWR4ID0gcGF0aC5pbmRleE9mKCc/Jyk7XG4gICAgaWYocXVlcnlfaWR4ICE9IC0xKSB7XG4gICAgICBxdWVyeSA9IHBhdGguc3Vic3RyKHF1ZXJ5X2lkeCsxKTtcbiAgICB9XG5cbiAgICB2YXIgZnJhZ21lbnQgPSAnJztcbiAgICB2YXIgZnJhZ21lbnRfaWR4ID0gcGF0aC5pbmRleE9mKCcjJyk7XG4gICAgaWYoZnJhZ21lbnRfaWR4ICE9IC0xKSB7XG4gICAgICBmcmFnbWVudCA9IHBhdGguc3Vic3RyKGZyYWdtZW50X2lkeCsxKTtcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgcXVlcnkgYW5kIGZyYWdtZW50IGZyb20gcGF0aFxuICAgIHBhdGggPSBwYXRoLnJlcGxhY2UoJz8nICsgcXVlcnksICcnKTtcbiAgICBwYXRoID0gcGF0aC5yZXBsYWNlKCcjJyArIGZyYWdtZW50LCAnJyk7XG4gICAgcXVlcnkgPSBxdWVyeS5yZXBsYWNlKCcjJyArIGZyYWdtZW50LCAnJyk7XG5cbiAgICAvLyBleHRyYSAtIGFsbCBwYXRoLCBxdWVyeSBhbmQgZnJhZ21lbnRcbiAgICB2YXIgZXh0cmEgPSBwYXRoO1xuICAgIGlmKHF1ZXJ5KVxuICAgICAgZXh0cmEgKz0gXCI/XCIgKyBxdWVyeTtcbiAgICBpZihmcmFnbWVudClcbiAgICAgIGV4dHJhICs9IFwiI1wiICsgZnJhZ21lbnQ7XG5cbiAgICBpc0lQdjQgPSBpcHY0X3JlZ2V4LnRlc3QoaG9zdCk7XG4gICAgaXNJUHY2ID0gaXB2Nl9yZWdleC50ZXN0KGhvc3QpO1xuICAgIHZhciBpc0xvY2FsaG9zdCA9IENsaXF6VXRpbHMuaXNMb2NhbGhvc3QoaG9zdCwgaXNJUHY0LCBpc0lQdjYpO1xuXG4gICAgLy8gZmluZCBwYXJ0cyBvZiBob3N0bmFtZVxuICAgIGlmICghaXNJUHY0ICYmICFpc0lQdjYgJiYgIWlzTG9jYWxob3N0KSB7XG4gICAgICB0cnkge1xuICAgICAgICB0bGQgPSBDTElRWkVudmlyb25tZW50LnRsZEV4dHJhY3Rvcihob3N0KTtcblxuICAgICAgICAvLyBHZXQgdGhlIGRvbWFpbiBuYW1lIHcvbyBzdWJkb21haW5zIGFuZCB3L28gVExEXG4gICAgICAgIG5hbWUgPSBob3N0LnNsaWNlKDAsIC0odGxkLmxlbmd0aCsxKSkuc3BsaXQoJy4nKS5wb3AoKTsgLy8gKzEgZm9yIHRoZSAnLidcblxuICAgICAgICAvLyBHZXQgc3ViZG9tYWluc1xuICAgICAgICB2YXIgbmFtZV90bGQgPSBuYW1lICsgXCIuXCIgKyB0bGQ7XG4gICAgICAgIHN1YmRvbWFpbnMgPSBob3N0LnNsaWNlKDAsIC1uYW1lX3RsZC5sZW5ndGgpLnNwbGl0KFwiLlwiKS5zbGljZSgwLCAtMSk7XG5cbiAgICAgICAgLy9yZW1vdmUgd3d3IGlmIGV4aXN0c1xuICAgICAgICAvLyBUT0RPOiBJIGRvbid0IHRoaW5rIHRoaXMgaXMgdGhlIHJpZ2h0IHBsYWNlIHRvIGRvIHRoaXMuXG4gICAgICAgIC8vICAgICAgIERpc2FibGVkIGZvciBub3csIGJ1dCBjaGVjayB0aGVyZSBhcmUgbm8gaXNzdWVzLlxuICAgICAgICAvLyBob3N0ID0gaG9zdC5pbmRleE9mKCd3d3cuJykgPT0gMCA/IGhvc3Quc2xpY2UoNCkgOiBob3N0O1xuICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgbmFtZSA9IFwiXCI7XG4gICAgICAgIGhvc3QgPSBcIlwiO1xuICAgICAgICAvL0NsaXF6VXRpbHMubG9nKCdXQVJOSU5HIEZhaWxlZCBmb3I6ICcgKyBvcmlnaW5hbFVybCwgJ0NsaXF6VXRpbHMuZ2V0RGV0YWlsc0Zyb21VcmwnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBuYW1lID0gaXNMb2NhbGhvc3QgPyBcImxvY2FsaG9zdFwiIDogXCJJUFwiO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSB3d3cgZnJvbSBiZWdpbm5pbmcsIHdlIG5lZWQgY2xlYW5Ib3N0IGluIHRoZSBmcmllbmRseSB1cmxcbiAgICB2YXIgY2xlYW5Ib3N0ID0gaG9zdDtcbiAgICBpZihob3N0LnRvTG93ZXJDYXNlKCkuaW5kZXhPZignd3d3LicpID09IDApIHtcbiAgICAgIGNsZWFuSG9zdCA9IGhvc3Quc2xpY2UoNCk7XG4gICAgfVxuXG4gICAgdmFyIGZyaWVuZGx5X3VybCA9IGNsZWFuSG9zdCArIGV4dHJhO1xuICAgIC8vcmVtb3ZlIHRyYWlsaW5nIHNsYXNoIGZyb20gdGhlIGVuZFxuICAgIGZyaWVuZGx5X3VybCA9IENsaXF6VXRpbHMuc3RyaXBUcmFpbGluZ1NsYXNoKGZyaWVuZGx5X3VybCk7XG5cbiAgICAvL0hhbmRsZSBjYXNlIHdoZXJlIHdlIGhhdmUgb25seSB0bGQgZm9yIGV4YW1wbGUgaHR0cDovL2NsaXF6bmFzXG4gICAgaWYoY2xlYW5Ib3N0ID09PSB0bGQpIHtcbiAgICAgIG5hbWUgPSB0bGQ7XG4gICAgfVxuXG4gICAgdmFyIHVybERldGFpbHMgPSB7XG4gICAgICAgICAgICAgIHNjaGVtZTogc2NoZW1lLFxuICAgICAgICAgICAgICBuYW1lOiBuYW1lLFxuICAgICAgICAgICAgICBkb21haW46IHRsZCA/IG5hbWUgKyAnLicgKyB0bGQgOiAnJyxcbiAgICAgICAgICAgICAgdGxkOiB0bGQsXG4gICAgICAgICAgICAgIHN1YmRvbWFpbnM6IHN1YmRvbWFpbnMsXG4gICAgICAgICAgICAgIHBhdGg6IHBhdGgsXG4gICAgICAgICAgICAgIHF1ZXJ5OiBxdWVyeSxcbiAgICAgICAgICAgICAgZnJhZ21lbnQ6IGZyYWdtZW50LFxuICAgICAgICAgICAgICBleHRyYTogZXh0cmEsXG4gICAgICAgICAgICAgIGhvc3Q6IGhvc3QsXG4gICAgICAgICAgICAgIGNsZWFuSG9zdDogY2xlYW5Ib3N0LFxuICAgICAgICAgICAgICBzc2w6IHNzbCxcbiAgICAgICAgICAgICAgcG9ydDogcG9ydCxcbiAgICAgICAgICAgICAgZnJpZW5kbHlfdXJsOiBmcmllbmRseV91cmxcbiAgICAgICAgfTtcblxuICAgIHJldHVybiB1cmxEZXRhaWxzO1xuICB9LFxuICBzdHJpcFRyYWlsaW5nU2xhc2g6IGZ1bmN0aW9uKHN0cikge1xuICAgIGlmKHN0ci5zdWJzdHIoLTEpID09PSAnLycpIHtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoMCwgc3RyLmxlbmd0aCAtIDEpO1xuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9LFxuICBfaXNVcmxSZWdFeHA6IC9eKChbYS16XFxkXShbYS16XFxkLV0qW2EtelxcZF0pKVxcLikrW2Etel17Mix9KFxcOlxcZCspPyQvaSxcbiAgaXNVcmw6IGZ1bmN0aW9uKGlucHV0KXtcbiAgICAvL3N0ZXAgMSByZW1vdmUgZXZlbnR1YWwgcHJvdG9jb2xcbiAgICB2YXIgcHJvdG9jb2xQb3MgPSBpbnB1dC5pbmRleE9mKCc6Ly8nKTtcbiAgICBpZihwcm90b2NvbFBvcyAhPSAtMSAmJiBwcm90b2NvbFBvcyA8PSA2KXtcbiAgICAgIGlucHV0ID0gaW5wdXQuc2xpY2UocHJvdG9jb2xQb3MrMylcbiAgICB9XG4gICAgLy9zdGVwMiByZW1vdmUgcGF0aCAmIGV2ZXJ5dGhpbmcgYWZ0ZXJcbiAgICBpbnB1dCA9IGlucHV0LnNwbGl0KCcvJylbMF07XG4gICAgLy9zdGVwMyBydW4gdGhlIHJlZ2V4XG4gICAgcmV0dXJuIENsaXF6VXRpbHMuX2lzVXJsUmVnRXhwLnRlc3QoaW5wdXQpO1xuICB9LFxuXG5cbiAgLy8gQ2hlY2hrcyBpZiB0aGUgZ2l2ZW4gc3RyaW5nIGlzIGEgdmFsaWQgSVB2NCBhZGRyZXNcbiAgaXNJUHY0OiBmdW5jdGlvbihpbnB1dCkge1xuICAgIHZhciBpcHY0X3BhcnQgPSBcIjAqKFswLTldfFsxLTldWzAtOV18MVswLTldezJ9fDJbMC00XVswLTldfDI1WzAtNV0pXCI7IC8vIG51bWJlcnMgMCAtIDI1NVxuICAgIHZhciBpcHY0X3JlZ2V4ID0gbmV3IFJlZ0V4cChcIl5cIiArIGlwdjRfcGFydCArIFwiXFxcXC5cIisgaXB2NF9wYXJ0ICsgXCJcXFxcLlwiKyBpcHY0X3BhcnQgKyBcIlxcXFwuXCIrIGlwdjRfcGFydFxuICAgICsgXCIoWzpdKFswLTldKSspPyRcIik7IC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIGlwdjRfcmVnZXgudGVzdChpbnB1dCk7XG4gIH0sXG5cbiAgaXNJUHY2OiBmdW5jdGlvbihpbnB1dCkge1xuXG4gICAgLy8gQ3VycmVudGx5IHVzaW5nIGEgc2ltcGxlIHJlZ2V4IGZvciBcIndoYXQgbG9va3MgbGlrZSBhbiBJUHY2IGFkZHJlc3NcIiBmb3IgcmVhZGFiaWxpdHlcbiAgICB2YXIgaXB2Nl9yZWdleCA9IG5ldyBSZWdFeHAoXCJeXFxcXFs/KChbMC05XXxbYS1mXXxbQS1GXSkqWzouXSsoWzAtOV18W2EtZl18W0EtRl0pK1s6Ll0qKStbXFxcXF1dPyhbOl1bMC05XSspPyRcIilcbiAgICByZXR1cm4gaXB2Nl9yZWdleC50ZXN0KGlucHV0KTtcblxuICAgIC8qIEEgYmV0dGVyIChtb3JlIHByZWNpc2UpIHJlZ2V4IHRvIHZhbGlkYXRlIElQVjYgYWRkcmVzc2VzIGZyb20gU3RhY2tPdmVyZmxvdzpcbiAgICBsaW5rOiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzUzNDk3L3JlZ3VsYXItZXhwcmVzc2lvbi10aGF0LW1hdGNoZXMtdmFsaWQtaXB2Ni1hZGRyZXNzZXNcblxuICAgIHZhciBpcHY2X3JlZ2V4ID0gbmV3IFJlZ0V4cChcIigoWzAtOWEtZkEtRl17MSw0fTopezcsN31bMC05YS1mQS1GXXsxLDR9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw3fTp8KFswLTlhLWZBLUZdezEsNH06KVwiXG4gICAgKyBcInsxLDZ9OlswLTlhLWZBLUZdezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDV9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDJ9fChbMC05YS1mQS1GXXsxLDR9Oil7MSw0fSg6WzAtOWEtZkEtRl17MSxcIlxuICAgICsgXCI0fSl7MSwzfXwoWzAtOWEtZkEtRl17MSw0fTopezEsM30oOlswLTlhLWZBLUZdezEsNH0pezEsNH18KFswLTlhLWZBLUZdezEsNH06KXsxLDJ9KDpbMC05YS1mQS1GXXsxLDR9KXsxLDV9fFswLTlhXCJcbiAgICArIFwiLWZBLUZdezEsNH06KCg6WzAtOWEtZkEtRl17MSw0fSl7MSw2fSl8OigoOlswLTlhLWZBLUZdezEsNH0pezEsN318Oil8ZmU4MDooOlswLTlhLWZBLUZdezAsNH0pezAsNH0lWzAtOWEtekEtWl17MSx9XCJcbiAgICArIFwifDo6KGZmZmYoOjB7MSw0fSl7MCwxfTopezAsMX0oKDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVxcXFwuKXszLDN9KDI1WzAtNV18KDJbMC00XXwxezAsMX1bMC05XSl7MCwxfVswLTldKVwiXG4gICAgKyBcInwoWzAtOWEtZkEtRl17MSw0fTopezEsNH06KCgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSlcXFxcLil7MywzfSgyNVswLTVdfCgyWzAtNF18MXswLDF9WzAtOV0pezAsMX1bMC05XSkpXCIpO1xuICAgICovXG4gIH0sXG5cbiAgaXNMb2NhbGhvc3Q6IGZ1bmN0aW9uKGhvc3QsIGlzSVB2NCwgaXNJUHY2KSB7XG4gICAgaWYgKGhvc3QgPT0gXCJsb2NhbGhvc3RcIikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGlzSVB2NCAmJiBob3N0LnN1YnN0cigwLDMpID09IFwiMTI3XCIpIHJldHVybiB0cnVlO1xuICAgIGlmIChpc0lQdjYgJiYgaG9zdCA9PSBcIjo6MVwiKSByZXR1cm4gdHJ1ZTtcblxuICAgIHJldHVybiBmYWxzZTtcblxuICB9LFxuXG4gIC8vIGNoZWNrcyBpZiBhIHZhbHVlIHJlcHJlc2VudHMgYW4gdXJsIHdoaWNoIGlzIGEgc2VhY2ggZW5naW5lXG4gIGlzU2VhcmNoOiBmdW5jdGlvbih2YWx1ZSl7XG4gICAgaWYoQ2xpcXpVdGlscy5pc1VybCh2YWx1ZSkpe1xuICAgICAgIHJldHVybiBDbGlxelV0aWxzLmdldERldGFpbHNGcm9tVXJsKHZhbHVlKS5ob3N0LmluZGV4T2YoJ2dvb2dsZScpID09PSAwID8gdHJ1ZTogZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcbiAgLy8gY2hlY2tzIGlmIGEgc3RyaW5nIGlzIGEgY29tcGxldGUgdXJsXG4gIGlzQ29tcGxldGVVcmw6IGZ1bmN0aW9uKGlucHV0KXtcbiAgICB2YXIgcGF0dGVybiA9IC8oZnRwfGh0dHB8aHR0cHMpOlxcL1xcLyhcXHcrOnswLDF9XFx3KkApPyhcXFMrKSg6WzAtOV0rKT8oXFwvfFxcLyhbXFx3IyE6Lj8rPSYlQCFcXC1cXC9dKSk/LztcbiAgICBpZighcGF0dGVybi50ZXN0KGlucHV0KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0sXG4gIC8vIGV4dHJhY3QgcXVlcnkgdGVybSBmcm9tIHNlYXJjaCBlbmdpbmUgcmVzdWx0IHBhZ2UgVVJMc1xuICBleHRyYWN0UXVlcnlGcm9tVXJsOiBmdW5jdGlvbih1cmwpIHtcbiAgICAvLyBHb29nbGVcbiAgICBpZiAodXJsLnNlYXJjaCgvaHR0cChzPyk6XFwvXFwvd3d3XFwuZ29vZ2xlXFwuLipcXC8uKnE9LiovaSkgPT09IDApIHtcbiAgICAgIHVybCA9IHVybC5zdWJzdHJpbmcodXJsLmxhc3RJbmRleE9mKCdxPScpICsgMikuc3BsaXQoJyYnKVswXTtcbiAgICAvLyBCaW5nXG4gICAgfSBlbHNlIGlmICh1cmwuc2VhcmNoKC9odHRwKHM/KTpcXC9cXC93d3dcXC5iaW5nXFwuLipcXC8uKnE9LiovaSkgPT09IDApIHtcbiAgICAgIHVybCA9IHVybC5zdWJzdHJpbmcodXJsLmluZGV4T2YoJ3E9JykgKyAyKS5zcGxpdCgnJicpWzBdO1xuICAgIC8vIFlhaG9vXG4gICAgfSBlbHNlIGlmICh1cmwuc2VhcmNoKC9odHRwKHM/KTpcXC9cXC8uKnNlYXJjaFxcLnlhaG9vXFwuY29tXFwvc2VhcmNoLipwPS4qL2kpID09PSAwKSB7XG4gICAgICB1cmwgPSB1cmwuc3Vic3RyaW5nKHVybC5pbmRleE9mKCdwPScpICsgMikuc3BsaXQoJyYnKVswXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdXJsID0gbnVsbDtcbiAgICB9XG4gICAgdmFyIGRlY29kZWQgPSB1cmwgPyBkZWNvZGVVUklDb21wb25lbnQodXJsLnJlcGxhY2UoL1xcKy9nLCcgJykpIDogbnVsbDtcbiAgICBpZiAoZGVjb2RlZCkgcmV0dXJuIGRlY29kZWQ7XG4gICAgZWxzZSByZXR1cm4gdXJsO1xuICB9LFxuICAvLyBSZW1vdmUgY2x1dHRlciAoaHR0cCwgd3d3KSBmcm9tIHVybHNcbiAgZ2VuZXJhbGl6ZVVybDogZnVuY3Rpb24odXJsLCBza2lwQ29ycmVjdGlvbikge1xuICAgIGlmICghdXJsKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHZhciB2YWwgPSB1cmwudG9Mb3dlckNhc2UoKTtcbiAgICB2YXIgY2xlYW5QYXJ0cyA9IENsaXF6VXRpbHMuY2xlYW5VcmxQcm90b2NvbCh2YWwsIGZhbHNlKS5zcGxpdCgnLycpLFxuICAgICAgaG9zdCA9IGNsZWFuUGFydHNbMF0sXG4gICAgICBwYXRoTGVuZ3RoID0gMCxcbiAgICAgIFNZTUJPTFMgPSAvLHxcXC4vZztcbiAgICBpZiAoIXNraXBDb3JyZWN0aW9uKSB7XG4gICAgICBpZiAoY2xlYW5QYXJ0cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIHBhdGhMZW5ndGggPSAoJy8nICsgY2xlYW5QYXJ0cy5zbGljZSgxKS5qb2luKCcvJykpLmxlbmd0aDtcbiAgICAgIH1cbiAgICAgIGlmIChob3N0LmluZGV4T2YoJ3d3dycpID09PSAwICYmIGhvc3QubGVuZ3RoID4gNCkge1xuICAgICAgICAvLyBvbmx5IGZpeCBzeW1ib2xzIGluIGhvc3RcbiAgICAgICAgaWYgKFNZTUJPTFMudGVzdChob3N0WzNdKSAmJiBob3N0WzRdICE9ICcgJylcbiAgICAgICAgLy8gcmVwbGFjZSBvbmx5IGlzc3VlcyBpbiB0aGUgaG9zdCBuYW1lLCBub3QgZXZlciBpbiB0aGUgcGF0aFxuICAgICAgICAgIHZhbCA9IHZhbC5zdWJzdHIoMCwgdmFsLmxlbmd0aCAtIHBhdGhMZW5ndGgpLnJlcGxhY2UoU1lNQk9MUywgJy4nKSArXG4gICAgICAgICAgKHBhdGhMZW5ndGggPyB2YWwuc3Vic3RyKC1wYXRoTGVuZ3RoKSA6ICcnKTtcbiAgICAgIH1cbiAgICB9XG4gICAgdXJsID0gQ2xpcXpVdGlscy5jbGVhblVybFByb3RvY29sKHZhbCwgdHJ1ZSk7XG4gICAgcmV0dXJuIHVybFt1cmwubGVuZ3RoIC0gMV0gPT0gJy8nID8gdXJsLnNsaWNlKDAsLTEpIDogdXJsO1xuICB9LFxuICAvLyBSZW1vdmUgY2x1dHRlciBmcm9tIHVybHMgdGhhdCBwcmV2ZW50cyBwYXR0ZXJuIGRldGVjdGlvbiwgZS5nLiBjaGVja3N1bVxuICBzaW1wbGlmeVVybDogZnVuY3Rpb24odXJsKSB7XG4gICAgdmFyIHE7XG4gICAgLy8gR29vZ2xlIHJlZGlyZWN0IHVybHNcbiAgICBpZiAodXJsLnNlYXJjaCgvaHR0cChzPyk6XFwvXFwvd3d3XFwuZ29vZ2xlXFwuLipcXC91cmxcXD8uKnVybD0uKi9pKSA9PT0gMCkge1xuICAgICAgLy8gUmV0dXJuIHRhcmdldCBVUkwgaW5zdGVhZFxuICAgICAgdXJsID0gdXJsLnN1YnN0cmluZyh1cmwubGFzdEluZGV4T2YoJ3VybD0nKSkuc3BsaXQoJyYnKVswXTtcbiAgICAgIHVybCA9IHVybC5zdWJzdHIoNCk7XG4gICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHVybCk7XG5cbiAgICAgIC8vIFJlbW92ZSBjbHV0dGVyIGZyb20gR29vZ2xlIHNlYXJjaGVzXG4gICAgfSBlbHNlIGlmICh1cmwuc2VhcmNoKC9odHRwKHM/KTpcXC9cXC93d3dcXC5nb29nbGVcXC4uKlxcLy4qcT0uKi9pKSA9PT0gMCkge1xuICAgICAgcSA9IHVybC5zdWJzdHJpbmcodXJsLmxhc3RJbmRleE9mKCdxPScpKS5zcGxpdCgnJicpWzBdO1xuICAgICAgaWYgKHEgIT0gJ3E9Jykge1xuICAgICAgICAvLyB0Ym0gZGVmaW5lcyBjYXRlZ29yeSAoaW1hZ2VzL25ld3MvLi4uKVxuICAgICAgICB2YXIgcGFyYW0gPSB1cmwuaW5kZXhPZignIycpICE9IC0xID8gdXJsLnN1YnN0cih1cmwuaW5kZXhPZignIycpKSA6IHVybC5zdWJzdHIodXJsLmluZGV4T2YoJz8nKSk7XG4gICAgICAgIHZhciB0Ym0gPSBwYXJhbS5pbmRleE9mKCd0Ym09JykgIT0gLTEgPyAoJyYnICsgcGFyYW0uc3Vic3RyaW5nKHBhcmFtLmxhc3RJbmRleE9mKCd0Ym09JykpLnNwbGl0KCcmJylbMF0pIDogJyc7XG4gICAgICAgIHZhciBwYWdlID0gcGFyYW0uaW5kZXhPZignc3RhcnQ9JykgIT0gLTEgPyAoJyYnICsgcGFyYW0uc3Vic3RyaW5nKHBhcmFtLmxhc3RJbmRleE9mKCdzdGFydD0nKSkuc3BsaXQoJyYnKVswXSkgOiAnJztcbiAgICAgICAgcmV0dXJuICdodHRwczovL3d3dy5nb29nbGUuY29tL3NlYXJjaD8nICsgcSArIHRibSAvKisgcGFnZSovO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgIH1cbiAgICAgIC8vIEJpbmdcbiAgICB9IGVsc2UgaWYgKHVybC5zZWFyY2goL2h0dHAocz8pOlxcL1xcL3d3d1xcLmJpbmdcXC4uKlxcLy4qcT0uKi9pKSA9PT0gMCkge1xuICAgICAgcSA9IHVybC5zdWJzdHJpbmcodXJsLmluZGV4T2YoJ3E9JykpLnNwbGl0KCcmJylbMF07XG4gICAgICBpZiAocSAhPSAncT0nKSB7XG4gICAgICAgIGlmICh1cmwuaW5kZXhPZignc2VhcmNoPycpICE9IC0xKVxuICAgICAgICAgIHJldHVybiB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKCdzZWFyY2g/JykpICsgJ3NlYXJjaD8nICsgcTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKCcvPycpKSArICcvPycgKyBxO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHVybDtcbiAgICAgIH1cbiAgICAgIC8vIFlhaG9vIHJlZGlyZWN0XG4gICAgfSBlbHNlIGlmICh1cmwuc2VhcmNoKC9odHRwKHM/KTpcXC9cXC9yLnNlYXJjaFxcLnlhaG9vXFwuY29tXFwvLiovaSkgPT09IDApIHtcbiAgICAgIHVybCA9IHVybC5zdWJzdHJpbmcodXJsLmxhc3RJbmRleE9mKCcvUlU9JykpLnNwbGl0KCcvUks9JylbMF07XG4gICAgICB1cmwgPSB1cmwuc3Vic3RyKDQpO1xuICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudCh1cmwpO1xuICAgICAgLy8gWWFob29cbiAgICB9IGVsc2UgaWYgKHVybC5zZWFyY2goL2h0dHAocz8pOlxcL1xcLy4qc2VhcmNoXFwueWFob29cXC5jb21cXC9zZWFyY2guKnA9LiovaSkgPT09IDApIHtcbiAgICAgIHZhciBwID0gdXJsLnN1YnN0cmluZyh1cmwuaW5kZXhPZigncD0nKSkuc3BsaXQoJyYnKVswXTtcbiAgICAgIGlmIChwICE9ICdwPScgJiYgdXJsLmluZGV4T2YoJzsnKSAhPSAtMSkge1xuICAgICAgICByZXR1cm4gdXJsLnN1YnN0cigwLCB1cmwuaW5kZXhPZignOycpKSArICc/JyArIHA7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdXJsO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdXJsO1xuICAgIH1cbiAgfSxcbiAgLy8gZXN0YWJsaXNoZXMgdGhlIGNvbm5lY3Rpb25cbiAgcGluZ0NsaXF6UmVzdWx0czogZnVuY3Rpb24oKXtcbiAgICBDbGlxelV0aWxzLmh0dHBIYW5kbGVyKCdIRUFEJywgQ2xpcXpVdGlscy5SRVNVTFRTX1BST1ZJREVSX1BJTkcpO1xuICB9LFxuICBnZXRCYWNrZW5kUmVzdWx0czogIGZ1bmN0aW9uKHEsIGNhbGxiYWNrKXtcbiAgICBcbiAgfSxcbiAgZ2V0Q2xpcXpSZXN1bHRzOiBmdW5jdGlvbihxLCBjYWxsYmFjayl7XG4gICAgQ2xpcXpVdGlscy5fc2Vzc2lvblNlcSsrO1xuXG4gICAgLy8gaWYgdGhlIHVzZXIgc2VlcyB0aGUgcmVzdWx0cyBtb3JlIHRoYW4gNTAwbXMgd2UgY29uc2lkZXIgdGhhdCBoZSBzdGFydHMgYSBuZXcgcXVlcnlcbiAgICBpZihDbGlxelV0aWxzLl9xdWVyeUxhc3REcmF3ICYmIChEYXRlLm5vdygpID4gQ2xpcXpVdGlscy5fcXVlcnlMYXN0RHJhdyArIDUwMCkpe1xuICAgICAgQ2xpcXpVdGlscy5fcXVlcnlDb3VudCsrO1xuICAgIH1cbiAgICBDbGlxelV0aWxzLl9xdWVyeUxhc3REcmF3ID0gMDsgLy8gcmVzZXQgbGFzdCBEcmF3IC0gd2FpdCBmb3IgdGhlIGFjdHVhbCBkcmF3XG4gICAgQ2xpcXpVdGlscy5fcXVlcnlMYXN0TGVuZ3RoID0gcS5sZW5ndGg7XG5cbiAgICB2YXIgdXJsID0gQ2xpcXpVdGlscy5SRVNVTFRTX1BST1ZJREVSICtcbiAgICAgICAgICAgICAgZW5jb2RlVVJJQ29tcG9uZW50KHEpICtcbiAgICAgICAgICAgICAgQ2xpcXpVdGlscy5lbmNvZGVTZXNzaW9uUGFyYW1zKCkgK1xuICAgICAgICAgICAgICBDbGlxekxhbmd1YWdlLnN0YXRlVG9RdWVyeVN0cmluZygpICtcbiAgICAgICAgICAgICAgQ2xpcXpVdGlscy5lbmNvZGVMb2NhbGUoKSArXG4gICAgICAgICAgICAgIENsaXF6VXRpbHMuZW5jb2RlUmVzdWx0T3JkZXIoKSArXG4gICAgICAgICAgICAgIENsaXF6VXRpbHMuZW5jb2RlQ291bnRyeSgpICtcbiAgICAgICAgICAgICAgQ2xpcXpVdGlscy5lbmNvZGVGaWx0ZXIoKSArXG4gICAgICAgICAgICAgIENsaXF6VXRpbHMuZW5jb2RlTG9jYXRpb24oKSArXG4gICAgICAgICAgICAgIENsaXF6VXRpbHMuZW5jb2RlUmVzdWx0Q291bnQoNykgK1xuICAgICAgICAgICAgICBDbGlxelV0aWxzLmRpc2FibGVXaWtpRGVkdXAoKTtcblxuICAgIHZhciByZXEgPSBDbGlxelV0aWxzLmh0dHBHZXQodXJsLCBmdW5jdGlvbiAocmVzKSB7XG4gICAgICBjYWxsYmFjayAmJiBjYWxsYmFjayhyZXMsIHEpO1xuICAgIH0pO1xuICB9LFxuICAvLyBJUCBkcml2ZW4gY29uZmlndXJhdGlvblxuICBmZXRjaEFuZFN0b3JlQ29uZmlnOiBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgQ2xpcXpVdGlscy5odHRwR2V0KENsaXF6VXRpbHMuQ09ORklHX1BST1ZJREVSLFxuICAgICAgZnVuY3Rpb24ocmVzKXtcbiAgICAgICAgaWYocmVzICYmIHJlcy5yZXNwb25zZSl7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHZhciBjb25maWcgPSBKU09OLnBhcnNlKHJlcy5yZXNwb25zZSk7XG4gICAgICAgICAgICBmb3IodmFyIGsgaW4gY29uZmlnKXtcbiAgICAgICAgICAgICAgQ2xpcXpVdGlscy5zZXRQcmVmKCdjb25maWdfJyArIGssIGNvbmZpZ1trXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaChlKXt9XG4gICAgICAgIH1cblxuICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgfSxcbiAgICAgIGNhbGxiYWNrLCAvL29uIGVycm9yIHRoZSBjYWxsYmFjayBzdGlsbCBuZWVkcyB0byBiZSBjYWxsZWRcbiAgICAgIDIwMDBcbiAgICApO1xuICB9LFxuICBlbmNvZGVMb2NhbGU6IGZ1bmN0aW9uKCkge1xuICAgIC8vIHNlbmQgYnJvd3NlciBsYW5ndWFnZSB0byB0aGUgYmFjay1lbmRcbiAgICByZXR1cm4gJyZsb2NhbGU9JysgKENsaXF6VXRpbHMuUFJFRkVSUkVEX0xBTkdVQUdFIHx8IFwiXCIpO1xuICB9LFxuICBlbmNvZGVDb3VudHJ5OiBmdW5jdGlvbigpIHtcbiAgICAvL2ludGVybmF0aW9uYWwgcmVzdWx0cyBub3Qgc3VwcG9ydGVkXG4gICAgcmV0dXJuICcmZm9yY2VfY291bnRyeT10cnVlJztcbiAgfSxcbiAgZGlzYWJsZVdpa2lEZWR1cDogZnVuY3Rpb24oKSB7XG4gICAgLy8gZGlzYWJsZSB3aWtpcGVkaWEgZGVkdXBsaWNhdGlvbiBvbiB0aGUgYmFja2VuZCBzaWRlXG4gICAgdmFyIGRvRGVkdXAgPSBDbGlxelV0aWxzLmdldFByZWYoXCJsYW5ndWFnZURlZHVwXCIsIGZhbHNlKTtcbiAgICBpZiAoZG9EZWR1cCkgcmV0dXJuICcmZGRsPTAnO1xuICAgIGVsc2UgcmV0dXJuIFwiXCJcbiAgfSxcbiAgZW5jb2RlRmlsdGVyOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgICdjb25zZXJ2YXRpdmUnOiAzLFxuICAgICAgJ21vZGVyYXRlJzogMCxcbiAgICAgICdsaWJlcmFsJzogMVxuICAgIH0sXG4gICAgc3RhdGUgPSBkYXRhW0NsaXF6VXRpbHMuZ2V0UHJlZignYWR1bHRDb250ZW50RmlsdGVyJywgJ21vZGVyYXRlJyldO1xuXG4gICAgcmV0dXJuICcmYWR1bHQ9JytzdGF0ZTtcbiAgfSxcbiAgZW5jb2RlUmVzdWx0Q291bnQ6IGZ1bmN0aW9uKGNvdW50KSB7XG4gICAgdmFyIGRvRGVkdXAgPSBDbGlxelV0aWxzLmdldFByZWYoXCJsYW5ndWFnZURlZHVwXCIsIGZhbHNlKTtcbiAgICBjb3VudCA9IGNvdW50IHx8IDU7XG4gICAgaWYgKGRvRGVkdXApIHJldHVybiAnJmNvdW50PScgKyBjb3VudDtcbiAgICBlbHNlIHJldHVybiBcIlwiXG4gIH0sXG4gIGVuY29kZVJlc3VsdFR5cGU6IGZ1bmN0aW9uKHR5cGUpe1xuICAgIGlmKHR5cGUuaW5kZXhPZignYWN0aW9uJykgIT09IC0xKSByZXR1cm4gWydUJ107XG4gICAgZWxzZSBpZih0eXBlLmluZGV4T2YoJ2NsaXF6LXJlc3VsdHMnKSA9PSAwKSByZXR1cm4gQ2xpcXpVdGlscy5lbmNvZGVDbGlxelJlc3VsdFR5cGUodHlwZSk7XG4gICAgZWxzZSBpZih0eXBlLmluZGV4T2YoJ2NsaXF6LXBhdHRlcm4nKSA9PSAwKSByZXR1cm4gWydDJ107XG4gICAgZWxzZSBpZih0eXBlID09PSAnY2xpcXotZXh0cmEnKSByZXR1cm4gWydYJ107XG4gICAgZWxzZSBpZih0eXBlID09PSAnY2xpcXotc2VyaWVzJykgcmV0dXJuIFsnUyddO1xuXG4gICAgZWxzZSBpZih0eXBlLmluZGV4T2YoJ2Jvb2ttYXJrJykgPT0gMCB8fFxuICAgICAgICAgICAgdHlwZS5pbmRleE9mKCd0YWcnKSA9PSAwKSByZXR1cm4gWydCJ10uY29uY2F0KENsaXF6VXRpbHMuZW5jb2RlQ2xpcXpSZXN1bHRUeXBlKHR5cGUpKTtcblxuICAgIGVsc2UgaWYodHlwZS5pbmRleE9mKCdmYXZpY29uJykgPT0gMCB8fFxuICAgICAgICAgICAgdHlwZS5pbmRleE9mKCdoaXN0b3J5JykgPT0gMCkgcmV0dXJuIFsnSCddLmNvbmNhdChDbGlxelV0aWxzLmVuY29kZUNsaXF6UmVzdWx0VHlwZSh0eXBlKSk7XG5cbiAgICAvLyBjbGlxeiB0eXBlID0gXCJjbGlxei1jdXN0b20gc291cmNlcy1YXCJcbiAgICBlbHNlIGlmKHR5cGUuaW5kZXhPZignY2xpcXotY3VzdG9tJykgPT0gMCkgcmV0dXJuIHR5cGUuc3Vic3RyKDIxKTtcblxuICAgIHJldHVybiB0eXBlOyAvL3Nob3VsZCBuZXZlciBoYXBwZW5cbiAgfSxcbiAgLy9lZyB0eXBlczogWyBcIkhcIiwgXCJtXCIgXSwgWyBcIkh8aW5zdGFudFwiLCBcIlh8MTFcIiBdXG4gIGlzUHJpdmF0ZVJlc3VsdFR5cGU6IGZ1bmN0aW9uKHR5cGUpIHtcbiAgICB2YXIgb25seVR5cGUgPSB0eXBlWzBdLnNwbGl0KCd8JylbMF07XG4gICAgcmV0dXJuICdIQlRDUycuaW5kZXhPZihvbmx5VHlwZSkgIT0gLTEgJiYgdHlwZS5sZW5ndGggPT0gMTtcbiAgfSxcbiAgLy8gY2xpcXogdHlwZSA9IFwiY2xpcXotcmVzdWx0cyBzb3VyY2VzLVhYWFhYXCIgb3IgXCJmYXZpY29uIHNvdXJjZXMtWFhYWFhcIiBpZiBjb21iaW5lZCB3aXRoIGhpc3RvcnlcbiAgZW5jb2RlQ2xpcXpSZXN1bHRUeXBlOiBmdW5jdGlvbih0eXBlKXtcbiAgICB2YXIgcG9zID0gdHlwZS5pbmRleE9mKCdzb3VyY2VzLScpXG4gICAgaWYocG9zICE9IC0xKVxuICAgICAgcmV0dXJuIENsaXF6VXRpbHMuZW5jb2RlU291cmNlcyh0eXBlLnN1YnN0cihwb3MrOCkpO1xuICAgIGVsc2VcbiAgICAgIHJldHVybiBbXTtcbiAgfSxcbiAgLy8gcmFuZG9tIElEIGdlbmVyYXRlZCBhdCBlYWNoIHVybGJhciBmb2N1c1xuICBfc2VhcmNoU2Vzc2lvbjogJycsXG4gIC8vIG51bWJlciBvZiBzZXF1ZW5jZXMgaW4gZWFjaCBzZXNzaW9uXG4gIF9zZXNzaW9uU2VxOiAwLFxuICBfcXVlcnlMYXN0TGVuZ3RoOiBudWxsLFxuICBfcXVlcnlMYXN0RHJhdzogbnVsbCxcbiAgLy8gbnVtYmVyIG9mIHF1ZXJpZXMgaW4gc2VhcmNoIHNlc3Npb25cbiAgX3F1ZXJ5Q291bnQ6IG51bGwsXG4gIHNldFNlYXJjaFNlc3Npb246IGZ1bmN0aW9uKHJhbmQpe1xuICAgIENsaXF6VXRpbHMuX3NlYXJjaFNlc3Npb24gPSByYW5kO1xuICAgIENsaXF6VXRpbHMuX3Nlc3Npb25TZXEgPSAwO1xuICAgIENsaXF6VXRpbHMuX3F1ZXJ5Q291bnQgPSAwO1xuICAgIENsaXF6VXRpbHMuX3F1ZXJ5TGFzdExlbmd0aCA9IDA7XG4gICAgQ2xpcXpVdGlscy5fcXVlcnlMYXN0RHJhdyA9IDA7XG4gIH0sXG4gIGVuY29kZVNlc3Npb25QYXJhbXM6IGZ1bmN0aW9uKCl7XG4gICAgaWYoQ2xpcXpVdGlscy5fc2VhcmNoU2Vzc2lvbi5sZW5ndGgpe1xuICAgICAgcmV0dXJuICcmcz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KENsaXF6VXRpbHMuX3NlYXJjaFNlc3Npb24pICtcbiAgICAgICAgICAgICAnJm49JyArIENsaXF6VXRpbHMuX3Nlc3Npb25TZXEgK1xuICAgICAgICAgICAgICcmcWM9JyArIENsaXF6VXRpbHMuX3F1ZXJ5Q291bnRcbiAgICB9IGVsc2UgcmV0dXJuICcnO1xuICB9LFxuXG4gIGVuY29kZUxvY2F0aW9uOiBmdW5jdGlvbihzcGVjaWZ5U291cmNlLCBsYXQsIGxuZykge1xuICAgIHZhciBxcyA9IFtcbiAgICAgJyZsb2NfcHJlZj0nLFxuICAgICBDbGlxelV0aWxzLmdldFByZWYoJ3NoYXJlX2xvY2F0aW9uJywnYXNrJylcbiAgICBdLmpvaW4oJycpXG5cbiAgICBpZiAoQ2xpcXpVdGlscy5VU0VSX0xBVCAmJiBDbGlxelV0aWxzLlVTRVJfTE5HIHx8IGxhdCAmJiBsbmcpIHtcbiAgICAgIHFzICs9IFtcbiAgICAgICAgJyZsb2M9JyxcbiAgICAgICAgbGF0IHx8IENsaXF6VXRpbHMuVVNFUl9MQVQsXG4gICAgICAgICcsJyxcbiAgICAgICAgbG5nIHx8IENsaXF6VXRpbHMuVVNFUl9MTkcsXG4gICAgICAgIChzcGVjaWZ5U291cmNlID8gJyxVJyA6ICcnKVxuICAgICAgXS5qb2luKCcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcXM7XG4gIH0sXG4gIGVuY29kZVNvdXJjZXM6IGZ1bmN0aW9uKHNvdXJjZXMpe1xuICAgIHJldHVybiBzb3VyY2VzLnRvTG93ZXJDYXNlKCkuc3BsaXQoJywgJykubWFwKFxuICAgICAgZnVuY3Rpb24ocyl7XG4gICAgICAgIGlmKHMuaW5kZXhPZignY2FjaGUnKSA9PSAwKSAvLyB0byBjYXRjaCAnY2FjaGUtKicgZm9yIHNwZWNpZmljIGNvdW50cmllc1xuICAgICAgICAgIHJldHVybiAnZCdcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJldHVybiBWRVJUSUNBTF9FTkNPRElOR1Nbc10gfHwgcztcbiAgICAgIH0pO1xuICB9LFxuICBpc1ByaXZhdGU6IENMSVFaRW52aXJvbm1lbnQuaXNQcml2YXRlLFxuICB0ZWxlbWV0cnk6IENMSVFaRW52aXJvbm1lbnQudGVsZW1ldHJ5LFxuICByZXN1bHRUZWxlbWV0cnk6IGZ1bmN0aW9uKHF1ZXJ5LCBxdWVyeUF1dG9jb21wbGV0ZWQsIHJlc3VsdEluZGV4LCByZXN1bHRVcmwsIHJlc3VsdE9yZGVyLCBleHRyYSkge1xuICAgIENsaXF6VXRpbHMuc2V0UmVzdWx0T3JkZXIocmVzdWx0T3JkZXIpO1xuICAgIHZhciBwYXJhbXMgPSBlbmNvZGVVUklDb21wb25lbnQocXVlcnkpICtcbiAgICAgIChxdWVyeUF1dG9jb21wbGV0ZWQgPyAnJmE9JyArIGVuY29kZVVSSUNvbXBvbmVudChxdWVyeUF1dG9jb21wbGV0ZWQpIDogJycpICtcbiAgICAgICcmaT0nICsgcmVzdWx0SW5kZXggK1xuICAgICAgKHJlc3VsdFVybCA/ICcmdT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHJlc3VsdFVybCkgOiAnJykgK1xuICAgICAgQ2xpcXpVdGlscy5lbmNvZGVTZXNzaW9uUGFyYW1zKCkgK1xuICAgICAgQ2xpcXpVdGlscy5lbmNvZGVSZXN1bHRPcmRlcigpICtcbiAgICAgIChleHRyYSA/ICcmZT0nICsgZXh0cmEgOiAnJylcbiAgICBDbGlxelV0aWxzLmh0dHBHZXQoQ2xpcXpVdGlscy5SRVNVTFRTX1BST1ZJREVSX0xPRyArIHBhcmFtcyk7XG4gICAgQ2xpcXpVdGlscy5zZXRSZXN1bHRPcmRlcignJyk7XG4gICAgQ2xpcXpVdGlscy5sb2cocGFyYW1zLCAnVXRpbHMucmVzdWx0VGVsZW1ldHJ5Jyk7XG4gIH0sXG4gIF9yZXN1bHRPcmRlcjogJycsXG4gIHNldFJlc3VsdE9yZGVyOiBmdW5jdGlvbihyZXN1bHRPcmRlcikge1xuICAgIENsaXF6VXRpbHMuX3Jlc3VsdE9yZGVyID0gcmVzdWx0T3JkZXI7XG4gIH0sXG4gIGVuY29kZVJlc3VsdE9yZGVyOiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQ2xpcXpVdGlscy5fcmVzdWx0T3JkZXIgJiYgQ2xpcXpVdGlscy5fcmVzdWx0T3JkZXIubGVuZ3RoID8gJyZvPScgKyBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoQ2xpcXpVdGlscy5fcmVzdWx0T3JkZXIpKSA6ICcnO1xuICB9LFxuICBzZXRJbnRlcnZhbDogQ0xJUVpFbnZpcm9ubWVudC5zZXRJbnRlcnZhbCxcbiAgc2V0VGltZW91dDogQ0xJUVpFbnZpcm9ubWVudC5zZXRUaW1lb3V0LFxuICBjbGVhclRpbWVvdXQ6IENMSVFaRW52aXJvbm1lbnQuY2xlYXJUaW1lb3V0LFxuICBjbGVhckludGVydmFsOiBDTElRWkVudmlyb25tZW50LmNsZWFyVGltZW91dCxcbiAgUHJvbWlzZTogQ0xJUVpFbnZpcm9ubWVudC5Qcm9taXNlLFxuICBsb2NhbGU6IHt9LFxuICBjdXJyTG9jYWxlOiBudWxsLFxuICBsb2FkTG9jYWxlOiBmdW5jdGlvbiAobGFuZ19sb2NhbGUpIHtcbiAgICB2YXIgbG9jYWxlcyA9IHtcbiAgICAgIFwiZW4tVVNcIjogXCJlblwiXG4gICAgfTtcbiAgICBsYW5nX2xvY2FsZSA9IGxvY2FsZXNbbGFuZ19sb2NhbGVdIHx8IGxhbmdfbG9jYWxlO1xuXG4gICAgaWYgKCFDbGlxelV0aWxzLmxvY2FsZS5oYXNPd25Qcm9wZXJ0eShsYW5nX2xvY2FsZSlcbiAgICAgICYmICFDbGlxelV0aWxzLmxvY2FsZS5oYXNPd25Qcm9wZXJ0eSgnZGVmYXVsdCcpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBDbGlxelV0aWxzLmdldExvY2FsZUZpbGUoZW5jb2RlVVJJQ29tcG9uZW50KGxhbmdfbG9jYWxlKSwgbGFuZ19sb2NhbGUpO1xuICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgIHZhciBsb2MgPSBDbGlxelV0aWxzLmdldExhbmd1YWdlRnJvbUxvY2FsZShsYW5nX2xvY2FsZSk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgQ2xpcXpVdGlscy5nZXRMb2NhbGVGaWxlKGxvYywgbGFuZ19sb2NhbGUpO1xuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgQ2xpcXpVdGlscy5nZXRMb2NhbGVGaWxlKCdkZScsICdkZWZhdWx0Jyk7XG4gICAgICAgICAgfSBjYXRjaChlKSB7XG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIGdldExvY2FsZUZpbGU6IGZ1bmN0aW9uIChsb2NhbGVfcGF0aCwgbG9jYWxlX2tleSkge1xuICAgIGZ1bmN0aW9uIGNhbGxiYWNrKHJlcSkge1xuICAgICAgICBpZiAoQ2xpcXpVdGlscyl7XG4gICAgICAgICAgaWYgKGxvY2FsZV9rZXkgIT09ICdkZWZhdWx0Jykge1xuICAgICAgICAgICAgQ2xpcXpVdGlscy5jdXJyTG9jYWxlID0gbG9jYWxlX2tleTtcbiAgICAgICAgICB9XG4gICAgICAgICAgQ2xpcXpVdGlscy5sb2NhbGVbbG9jYWxlX2tleV0gPSBKU09OLnBhcnNlKHJlcS5yZXNwb25zZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gb25lcnJvcihlcnIpIHtcbiAgICB9XG4gICAgdmFyIHVybCA9IENMSVFaRW52aXJvbm1lbnQuTE9DQUxFX1BBVEggKyBsb2NhbGVfcGF0aCArICcvY2xpcXouanNvbic7XG4gICAgdmFyIHJlc3BvbnNlID0gQ2xpcXpVdGlscy5odHRwR2V0KHVybCwgY2FsbGJhY2ssIG9uZXJyb3IsIDMwMDAsIG51bGwsIHRydWUpO1xuICAgIGlmIChyZXNwb25zZS5yZWFkeVN0YXRlICE9PSAyKSB7XG4gICAgICB0aHJvdyBcIkVycm9yXCI7XG4gICAgfVxuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSxcbiAgZ2V0TGFuZ3VhZ2VGcm9tTG9jYWxlOiBmdW5jdGlvbihsb2NhbGUpe1xuICAgIHJldHVybiBsb2NhbGUubWF0Y2goLyhbYS16XSspKD86Wy1fXShbQS1aXSspKT8vKVsxXTtcbiAgfSxcbiAgZ2V0TGFuZ3VhZ2U6IGZ1bmN0aW9uKHdpbil7XG4gICAgcmV0dXJuIENsaXF6VXRpbHMuTEFOR1NbQ2xpcXpVdGlscy5nZXRMYW5ndWFnZUZyb21Mb2NhbGUod2luLm5hdmlnYXRvci5sYW5ndWFnZSldIHx8ICdlbic7XG4gIH0sXG4gIGdldExvY2FsaXplZFN0cmluZzogZnVuY3Rpb24oa2V5LCBzdWJzdGl0dXRpb25zKXtcbiAgICBpZigha2V5KSByZXR1cm4gJyc7XG5cbiAgICB2YXIgc3RyID0ga2V5LFxuICAgICAgICBsb2NhbE1lc3NhZ2VzO1xuXG4gICAgaWYgKENsaXF6VXRpbHMuY3VyckxvY2FsZSAhPSBudWxsICYmIENsaXF6VXRpbHMubG9jYWxlW0NsaXF6VXRpbHMuY3VyckxvY2FsZV1cbiAgICAgICAgICAgICYmIENsaXF6VXRpbHMubG9jYWxlW0NsaXF6VXRpbHMuY3VyckxvY2FsZV1ba2V5XSkge1xuICAgICAgICBzdHIgPSBDbGlxelV0aWxzLmxvY2FsZVtDbGlxelV0aWxzLmN1cnJMb2NhbGVdW2tleV0ubWVzc2FnZTtcbiAgICAgICAgbG9jYWxNZXNzYWdlcyA9IENsaXF6VXRpbHMubG9jYWxlW0NsaXF6VXRpbHMuY3VyckxvY2FsZV07XG4gICAgfSBlbHNlIGlmIChDbGlxelV0aWxzLmxvY2FsZS5kZWZhdWx0ICYmIENsaXF6VXRpbHMubG9jYWxlLmRlZmF1bHRba2V5XSkge1xuICAgICAgICBzdHIgPSBDbGlxelV0aWxzLmxvY2FsZS5kZWZhdWx0W2tleV0ubWVzc2FnZTtcbiAgICAgICAgbG9jYWxNZXNzYWdlcyA9IENsaXF6VXRpbHMubG9jYWxlLmRlZmF1bHQ7XG4gICAgfVxuXG4gICAgaWYgKCFzdWJzdGl0dXRpb25zKSB7XG4gICAgICBzdWJzdGl0dXRpb25zID0gW107XG4gICAgfVxuICAgIGlmICghQXJyYXkuaXNBcnJheShzdWJzdGl0dXRpb25zKSkge1xuICAgICAgc3Vic3RpdHV0aW9ucyA9IFtzdWJzdGl0dXRpb25zXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXBsYWNlcihtYXRjaGVkLCBpbmRleCwgZG9sbGFyU2lnbnMpIHtcbiAgICAgIGlmIChpbmRleCkge1xuICAgICAgICBpbmRleCA9IHBhcnNlSW50KGluZGV4LCAxMCkgLSAxO1xuICAgICAgICByZXR1cm4gaW5kZXggaW4gc3Vic3RpdHV0aW9ucyA/IHN1YnN0aXR1dGlvbnNbaW5kZXhdIDogXCJcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvciBhbnkgc2VyaWVzIG9mIGNvbnRpZ3VvdXMgYCRgcywgdGhlIGZpcnN0IGlzIGRyb3BwZWQsIGFuZFxuICAgICAgICAvLyB0aGUgcmVzdCByZW1haW4gaW4gdGhlIG91dHB1dCBzdHJpbmcuXG4gICAgICAgIHJldHVybiBkb2xsYXJTaWducztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN0ci5yZXBsYWNlKC9cXCQoPzooWzEtOV1cXGQqKXwoXFwkKykpL2csIHJlcGxhY2VyKTtcbiAgfSxcbiAgLy8gZ2V0cyBhbGwgdGhlIGVsZW1lbnRzIHdpdGggdGhlIGNsYXNzICdjbGlxei1sb2NhbGUnIGFuZCBhZGRzXG4gIC8vIHRoZSBsb2NhbGl6ZWQgc3RyaW5nIC0ga2V5IGF0dHJpYnV0ZSAtIGFzIGNvbnRlbnRcbiAgbG9jYWxpemVEb2M6IGZ1bmN0aW9uKGRvYyl7XG4gICAgdmFyIGxvY2FsZSA9IGRvYy5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdjbGlxei1sb2NhbGUnKTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbG9jYWxlLmxlbmd0aDsgaSsrKXtcbiAgICAgICAgdmFyIGVsID0gbG9jYWxlW2ldO1xuICAgICAgICBlbC50ZXh0Q29udGVudCA9IENsaXF6VXRpbHMuZ2V0TG9jYWxpemVkU3RyaW5nKGVsLmdldEF0dHJpYnV0ZSgna2V5JykpO1xuICAgIH1cbiAgfSxcbiAgZXh0ZW5zaW9uUmVzdGFydDogZnVuY3Rpb24oY2hhbmdlcyl7XG4gICAgdmFyIGVudW1lcmF0b3IgPSBTZXJ2aWNlcy53bS5nZXRFbnVtZXJhdG9yKCduYXZpZ2F0b3I6YnJvd3NlcicpO1xuICAgIHdoaWxlIChlbnVtZXJhdG9yLmhhc01vcmVFbGVtZW50cygpKSB7XG4gICAgICB2YXIgd2luID0gZW51bWVyYXRvci5nZXROZXh0KCk7XG4gICAgICBpZih3aW4uQ0xJUVogJiYgd2luLkNMSVFaLkNvcmUpe1xuICAgICAgICB3aW4uQ0xJUVouQ29yZS51bmxvYWQodHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgY2hhbmdlcyAmJiBjaGFuZ2VzKCk7XG5cbiAgICB2YXIgY29yZVByb21pc2VzID0gW107XG4gICAgZW51bWVyYXRvciA9IFNlcnZpY2VzLndtLmdldEVudW1lcmF0b3IoJ25hdmlnYXRvcjpicm93c2VyJyk7XG4gICAgd2hpbGUgKGVudW1lcmF0b3IuaGFzTW9yZUVsZW1lbnRzKCkpIHtcbiAgICAgIHZhciB3aW4gPSBlbnVtZXJhdG9yLmdldE5leHQoKTtcbiAgICAgIGlmKHdpbi5DTElRWiAmJiB3aW4uQ0xJUVouQ29yZSl7XG4gICAgICAgIGNvcmVQcm9taXNlcy5wdXNoKHdpbi5DTElRWi5Db3JlLmluaXQoKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIFByb21pc2UuYWxsKGNvcmVQcm9taXNlcyk7XG4gIH0sXG4gIGlzV2luZG93czogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gQ0xJUVpFbnZpcm9ubWVudC5PUy5pbmRleE9mKFwid2luXCIpID09PSAwO1xuICB9LFxuICBpc01hYzogZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gQ0xJUVpFbnZpcm9ubWVudC5PUy5pbmRleE9mKFwiZGFyd2luXCIpID09PSAwO1xuICB9LFxuICBpc0xpbnV4OiBmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gQ0xJUVpFbnZpcm9ubWVudC5PUy5pbmRleE9mKFwibGludXhcIikgPT09IDA7XG4gIH0sXG4gIGdldFdpbmRvdzogQ0xJUVpFbnZpcm9ubWVudC5nZXRXaW5kb3csXG4gIGdldFdpbmRvd0lEOiBDTElRWkVudmlyb25tZW50LmdldFdpbmRvd0lELFxuICBoYXNDbGFzczogZnVuY3Rpb24oZWxlbWVudCwgY2xhc3NOYW1lKSB7XG4gICAgcmV0dXJuICgnICcgKyBlbGVtZW50LmNsYXNzTmFtZSArICcgJykuaW5kZXhPZignICcgKyBjbGFzc05hbWUgKyAnICcpID4gLTE7XG4gIH0sXG4gIC8qKlxuICAgKiBCaW5kIGZ1bmN0aW9ucyBjb250ZXh0cyB0byBhIHNwZWNpZmllZCBvYmplY3QuXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBmcm9tIC0gQW4gb2JqZWN0LCB3aG9zZSBmdW5jdGlvbiBwcm9wZXJ0aWVzIHdpbGwgYmUgcHJvY2Vzc2VkLlxuICAgKiBAcGFyYW0ge09iamVjdH0gdG8gLSBBbiBvYmplY3QsIHdoaWNoIHdpbGwgYmUgdGhlIGNvbnRleHQgKHRoaXMpIG9mIHByb2Nlc3NlZCBmdW5jdGlvbnMuXG4gICAqL1xuICBiaW5kT2JqZWN0RnVuY3Rpb25zOiBmdW5jdGlvbihmcm9tLCB0bykge1xuICAgIGZvciAodmFyIGZ1bmNOYW1lIGluIGZyb20pIHtcbiAgICAgIHZhciBmdW5jID0gZnJvbVtmdW5jTmFtZV07XG4gICAgICBpZiAoIWZyb20uaGFzT3duUHJvcGVydHkoZnVuY05hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIC8vIENhbid0IGNvbXBhcmUgd2l0aCBwcm90b3R5cGUgb2Ygb2JqZWN0IGZyb20gYSBkaWZmZXJlbnQgbW9kdWxlLlxuICAgICAgaWYgKHR5cGVvZiBmdW5jICE9IFwiZnVuY3Rpb25cIilcbiAgICAgICAgY29udGludWU7XG4gICAgICBmcm9tW2Z1bmNOYW1lXSA9IGZ1bmMuYmluZCh0byk7XG4gICAgfVxuICB9LFxuICB0cnlEZWNvZGVVUklDb21wb25lbnQ6IGZ1bmN0aW9uKHMpIHtcbiAgICAvLyBhdm9pZGUgZXJyb3IgZnJvbSBkZWNvZGVVUklDb21wb25lbnQoJyUyJylcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzKTtcbiAgICB9IGNhdGNoKGUpIHtcbiAgICAgIHJldHVybiBzO1xuICAgIH1cbiAgfSxcbiAgdHJ5RW5jb2RlVVJJQ29tcG9uZW50OiBmdW5jdGlvbihzKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQocyk7XG4gICAgfSBjYXRjaChlKSB7XG4gICAgICByZXR1cm4gcztcbiAgICB9XG4gIH0sXG4gIHBhcnNlUXVlcnlTdHJpbmc6IGZ1bmN0aW9uKHFzdHIpIHtcbiAgICB2YXIgcXVlcnkgPSB7fTtcbiAgICB2YXIgYSA9IChxc3RyIHx8ICcnKS5zcGxpdCgnJicpO1xuICAgIGZvciAodmFyIGkgaW4gYSlcbiAgICB7XG4gICAgICB2YXIgYiA9IGFbaV0uc3BsaXQoJz0nKTtcbiAgICAgIHF1ZXJ5W0NsaXF6VXRpbHMudHJ5RGVjb2RlVVJJQ29tcG9uZW50KGJbMF0pXSA9IENsaXF6VXRpbHMudHJ5RGVjb2RlVVJJQ29tcG9uZW50KGJbMV0pO1xuICAgIH1cblxuICAgIHJldHVybiBxdWVyeTtcbiAgfSxcbiAgcm91bmRUb0RlY2ltYWw6IGZ1bmN0aW9uKG51bWJlciwgZGlnaXRzKSB7XG4gICAgdmFyIG11bHRpcGxpZXIgPSBNYXRoLnBvdygxMCwgZGlnaXRzKTtcbiAgICByZXR1cm4gTWF0aC5yb3VuZChudW1iZXIgKiBtdWx0aXBsaWVyKSAvIG11bHRpcGxpZXI7XG4gIH0sXG4gIGdldEFkdWx0RmlsdGVyU3RhdGU6IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGRhdGEgPSB7XG4gICAgICAnY29uc2VydmF0aXZlJzoge1xuICAgICAgICAgICAgICBuYW1lOiBDbGlxelV0aWxzLmdldExvY2FsaXplZFN0cmluZygnYWx3YXlzJyksXG4gICAgICAgICAgICAgIHNlbGVjdGVkOiBmYWxzZVxuICAgICAgfSxcbiAgICAgICdtb2RlcmF0ZSc6IHtcbiAgICAgICAgICAgICAgbmFtZTogQ2xpcXpVdGlscy5nZXRMb2NhbGl6ZWRTdHJpbmcoJ2Fsd2F5c19hc2snKSxcbiAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICB9LFxuICAgICAgJ2xpYmVyYWwnOiB7XG4gICAgICAgICAgbmFtZTogQ2xpcXpVdGlscy5nZXRMb2NhbGl6ZWRTdHJpbmcoJ25ldmVyJyksXG4gICAgICAgICAgc2VsZWN0ZWQ6IGZhbHNlXG4gICAgICB9XG4gICAgfTtcblxuICAgIGRhdGFbQ2xpcXpVdGlscy5nZXRQcmVmKCdhZHVsdENvbnRlbnRGaWx0ZXInLCAnbW9kZXJhdGUnKV0uc2VsZWN0ZWQgPSB0cnVlO1xuXG4gICAgcmV0dXJuIGRhdGE7XG4gIH0sXG4gIGdldE5vUmVzdWx0czogQ0xJUVpFbnZpcm9ubWVudC5nZXROb1Jlc3VsdHMsXG4gIGRpc2FibGVDbGlxelJlc3VsdHM6IENMSVFaRW52aXJvbm1lbnQuZGlzYWJsZUNsaXF6UmVzdWx0cyxcbiAgZW5hYmxlQ2xpcXpSZXN1bHRzOiBDTElRWkVudmlyb25tZW50LmVuYWJsZUNsaXF6UmVzdWx0cyxcbiAgZ2V0UGFyYW1ldGVyQnlOYW1lOiBmdW5jdGlvbihuYW1lLCBsb2NhdGlvbikge1xuICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoL1tcXFtdLywgXCJcXFxcW1wiKS5yZXBsYWNlKC9bXFxdXS8sIFwiXFxcXF1cIik7XG4gICAgdmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cChcIltcXFxcPyZdXCIgKyBuYW1lICsgXCI9KFteJiNdKilcIiksXG4gICAgcmVzdWx0cyA9IHJlZ2V4LmV4ZWMobG9jYXRpb24uc2VhcmNoKTtcbiAgICByZXR1cm4gcmVzdWx0cyA9PT0gbnVsbCA/IFwiXCIgOiBkZWNvZGVVUklDb21wb25lbnQocmVzdWx0c1sxXS5yZXBsYWNlKC9cXCsvZywgXCIgXCIpKTtcbiAgfSxcbiAgYWRkRXZlbnRMaXN0ZW5lclRvRWxlbWVudHM6IENMSVFaRW52aXJvbm1lbnQuYWRkRXZlbnRMaXN0ZW5lclRvRWxlbWVudHMsXG4gIHNlYXJjaDogQ0xJUVpFbnZpcm9ubWVudC5zZWFyY2gsXG4gIGRpc3RhbmNlOiBDTElRWkVudmlyb25tZW50LmRpc3RhbmNlLFxuICBnZXREZWZhdWx0U2VhcmNoRW5naW5lOiBDTElRWkVudmlyb25tZW50LmdldERlZmF1bHRTZWFyY2hFbmdpbmUsXG4gIGNvcHlSZXN1bHQ6IENMSVFaRW52aXJvbm1lbnQuY29weVJlc3VsdCxcbiAgb3Blbkxpbms6IENMSVFaRW52aXJvbm1lbnQub3BlbkxpbmssXG4gIG9wZW5Qb3B1cDogQ0xJUVpFbnZpcm9ubWVudC5vcGVuUG9wdXAsXG4gIGlzT25Qcml2YXRlVGFiOiBDTElRWkVudmlyb25tZW50LmlzT25Qcml2YXRlVGFiLFxuICBnZXRDbGlxelByZWZzOiBDTElRWkVudmlyb25tZW50LmdldENsaXF6UHJlZnMsXG4gIGlzRGVmYXVsdEJyb3dzZXI6IENMSVFaRW52aXJvbm1lbnQuaXNEZWZhdWx0QnJvd3NlcixcbiAgaW5pdEhvbWVwYWdlOiBDTElRWkVudmlyb25tZW50LmluaXRIb21lcGFnZSxcbiAgc2V0RGVmYXVsdFNlYXJjaEVuZ2luZTogQ0xJUVpFbnZpcm9ubWVudC5zZXREZWZhdWx0U2VhcmNoRW5naW5lLFxuICBpc1Vua25vd25UZW1wbGF0ZTogQ0xJUVpFbnZpcm9ubWVudC5pc1Vua25vd25UZW1wbGF0ZSxcbiAgaGlzdG9yeVNlYXJjaDogQ0xJUVpFbnZpcm9ubWVudC5oaXN0b3J5U2VhcmNoLFxuICBnZXRFbmdpbmVCeU5hbWU6IENMSVFaRW52aXJvbm1lbnQuZ2V0RW5naW5lQnlOYW1lLFxuICBhZGRFbmdpbmVXaXRoRGV0YWlsczogQ0xJUVpFbnZpcm9ubWVudC5hZGRFbmdpbmVXaXRoRGV0YWlscyxcbiAgZ2V0RW5naW5lQnlBbGlhczogQ0xJUVpFbnZpcm9ubWVudC5nZXRFbmdpbmVCeUFsaWFzLFxuICBnZXRTZWFyY2hFbmdpbmVzOiBDTElRWkVudmlyb25tZW50LmdldFNlYXJjaEVuZ2luZXMsXG4gIHVwZGF0ZUFsaWFzOiBDTElRWkVudmlyb25tZW50LnVwZGF0ZUFsaWFzLFxuICBvcGVuTGluazogQ0xJUVpFbnZpcm9ubWVudC5vcGVuTGluayxcbiAgcHJvbWlzZUh0dHBIYW5kbGVyOiBDTElRWkVudmlyb25tZW50LnByb21pc2VIdHRwSGFuZGxlcixcbiAgcmVnaXN0ZXJSZXN1bHRQcm92aWRlcjogZnVuY3Rpb24gKG8pIHtcbiAgICBDTElRWkVudmlyb25tZW50LkNsaXF6UmVzdWx0UHJvdmlkZXJzID0gby5SZXN1bHRQcm92aWRlcnM7XG4gICAgQ0xJUVpFbnZpcm9ubWVudC5SZXN1bHQgPSBvLlJlc3VsdDtcbiAgfSxcbiAgb25SZW5kZXJDb21wbGV0ZTogZnVuY3Rpb24ocXVlcnksIGJveCl7XG4gICAgaWYgKCFDTElRWkVudmlyb25tZW50Lm9uUmVuZGVyQ29tcGxldGUpXG4gICAgICByZXR1cm47XG5cbiAgICB2YXIgbGlua05vZGVzID0gYm94LnF1ZXJ5U2VsZWN0b3JBbGwoXCJbdXJsXTpub3QoLmNxei1yZXN1bHQtYm94KTpub3QoLmVudGl0eS1zdG9yeSk6bm90KFtoaWRkZW5dKSwgW2hyZWZdOm5vdChbaGlkZGVuXSlcIik7XG4gICAgdmFyIHVybHMgPSBbXS5tYXAuY2FsbChsaW5rTm9kZXMsIGZ1bmN0aW9uKG5vZGUpIHtcbiAgICAgIHJldHVybiBub2RlLmdldEF0dHJpYnV0ZShcInVybFwiKSB8fCBub2RlLmdldEF0dHJpYnV0ZShcImhyZWZcIik7XG4gICAgfSkuZmlsdGVyKHVybCA9PiAhIXVybCk7XG5cbiAgICBDTElRWkVudmlyb25tZW50Lm9uUmVuZGVyQ29tcGxldGUocXVlcnksIHVybHMpO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBDbGlxelV0aWxzO1xuIl19