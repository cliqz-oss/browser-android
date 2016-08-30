'use strict';

var CLIQZ = {};


// start module CliqzUtils
(function(ctx,Q,E){
'use strict';
/*
 * This module has a list of helpers used across the extension
 *  HTTP handlers
 *  URL manipulators
 *  Localization mechanics
 *  Common logging pipe
 *  Preferences(persistent storage) wrappers
 *  Browser helpers
 *  ...
 */
Components.utils.import('resource://gre/modules/Services.jsm');

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
  'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzRequestMonitor',
  'chrome://cliqzmodules/content/CliqzRequestMonitor.jsm');

var EXPORTED_SYMBOLS = ['CliqzUtils'];

var VERTICAL_ENCODINGS = {
    'people':'p',
    'news':'n',
    'video':'v',
    'hq':'h',
    'bm': 'm',
    'recipeRD': 'r',
    'game': 'g',
    'movie': 'o'
};

var COLOURS = ['#ffce6d','#ff6f69','#96e397','#5c7ba1','#bfbfbf','#3b5598','#fbb44c','#00b2e5','#b3b3b3','#99cccc','#ff0027','#999999'],
    LOGOS = ['wikipedia', 'google', 'facebook', 'youtube', 'duckduckgo', 'sternefresser', 'zalando', 'bild', 'web', 'ebay', 'gmx', 'amazon', 't-online', 'wiwo', 'wwe', 'weightwatchers', 'rp-online', 'wmagazine', 'chip', 'spiegel', 'yahoo', 'paypal', 'imdb', 'wikia', 'msn', 'autobild', 'dailymotion', 'hm', 'hotmail', 'zeit', 'bahn', 'softonic', 'handelsblatt', 'stern', 'cnn', 'mobile', 'aetv', 'postbank', 'dkb', 'bing', 'adobe', 'bbc', 'nike', 'starbucks', 'techcrunch', 'vevo', 'time', 'twitter', 'weatherunderground', 'xing', 'yelp', 'yandex', 'weather', 'flickr'],
    BRANDS_DATABASE = { domains: {}, palette: ["999"] }, brand_loaded = false,
    MINUTE = 60*1e3,
    ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])", // numbers 0 - 255
    ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "([:]([0-9])+)?$"), // port number
    ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$");


var CliqzUtils = {
  LANGS:                          {'de':'de', 'en':'en', 'fr':'fr'},
  RESULTS_PROVIDER:               'https://newbeta.cliqz.com/api/v1/results?q=',
  RICH_HEADER:                    'https://newbeta.cliqz.com/api/v1/rich-header?path=/map',
  RESULTS_PROVIDER_LOG:           'https://newbeta.cliqz.com/api/v1/logging?q=',
  RESULTS_PROVIDER_PING:          'https://newbeta.cliqz.com/ping',
  CONFIG_PROVIDER:                'https://newbeta.cliqz.com/api/v1/config',
  SAFE_BROWSING:                  'https://safe-browsing.cliqz.com',
  LOG:                            'https://logging.cliqz.com',
  TUTORIAL_URL:                   'https://cliqz.com/home/onboarding',
  UNINSTALL:                      'https://cliqz.com/home/offboarding',
  FEEDBACK:                       'https://cliqz.com/support',
  PREFERRED_LANGUAGE:             null,

  BRANDS_DATABASE: BRANDS_DATABASE,

  //will be updated from the mixer config endpoint every time new logos are generated
  BRANDS_DATABASE_VERSION: 1457952995848,
  GEOLOC_WATCH_ID:                null, // The ID of the geolocation watcher (function that updates cached geolocation on change)
  VERTICAL_TEMPLATES: {
        'n': 'news'    ,
        'p': 'people'  ,
        'v': 'video'   ,
        'h': 'hq'      ,
        'r': 'recipe' ,
        'g': 'cpgame_movie',
        'o': 'cpgame_movie'
    },
  TEMPLATES_PATH: CLIQZEnvironment.TEMPLATES_PATH,
  init: function(win){
    var localePromise;
    if (win && win.navigator) {
        // See http://gu.illau.me/posts/the-problem-of-user-language-lists-in-javascript/
        var nav = win.navigator;
        CliqzUtils.PREFERRED_LANGUAGE = CliqzUtils.getPref('general.useragent.locale', nav.language || nav.userLanguage || 'en', '');
        localePromise = CliqzUtils.loadLocale(CliqzUtils.PREFERRED_LANGUAGE);
    }

    if(!brand_loaded){
      brand_loaded = true;

      var config = this.getPref("config_logoVersion"), dev = this.getPref("brands-database-version");

      if (dev) this.BRANDS_DATABASE_VERSION = dev
      else if (config) this.BRANDS_DATABASE_VERSION = config

      var retryPattern = [60*MINUTE, 10*MINUTE, 5*MINUTE, 2*MINUTE, MINUTE];

      (function getLogoDB(url){

          CliqzUtils && CliqzUtils.httpGet(url,
          function(req){
            CliqzUtils.BRANDS_DATABASE =  BRANDS_DATABASE = JSON.parse(req.response); },
          function(){
            var retry = retryPattern.pop();
            if(retry) CliqzUtils.setTimeout(getLogoDB, retry, url);
          }
          , MINUTE/2);
      })(CLIQZEnvironment.getBrandsDBUrl(this.BRANDS_DATABASE_VERSION));
    }

    CliqzUtils.requestMonitor = new CliqzRequestMonitor();
    CliqzUtils.log('Initialized', 'CliqzUtils');
    return localePromise;
  },

  initPlatform: function(System) {
    System.baseURL = CLIQZEnvironment.SYSTEM_BASE_URL;
    CliqzUtils.System = System;
  },

  importModule: function(moduleName) {
    return CliqzUtils.System.import(moduleName)
  },

  isNumber: function(n){
      /*
      NOTE: this function can't recognize numbers in the form such as: "1.2B", but it can for "1e4". See specification for isFinite()
       */
      return !isNaN(parseFloat(n)) && isFinite(n);
  },

  //returns the type only if it is known
  getKnownType: function(type){
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
  setSupportInfo: function(status){
    var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch),
        host = 'firefox', hostVersion='';

    //check if the prefs exist and if they are string
    if(prefs.getPrefType('distribution.id') == 32 && prefs.getPrefType('distribution.version') == 32){
      host = prefs.getCharPref('distribution.id');
      hostVersion = prefs.getCharPref('distribution.version');
    }
    var info = JSON.stringify({
          version: CliqzUtils.extensionVersion,
          host: host,
          hostVersion: hostVersion,
          status: status != undefined ? status : "active"
        }),
        sites = ["http://cliqz.com","https://cliqz.com"]

    sites.forEach(function(url){
        var ls = CLIQZEnvironment.getLocalStorage(url)

        if (ls) ls.setItem("extension-info",info)
    })
  },
  getLogoDetails: function(urlDetails){
    var base = urlDetails.name,
        baseCore = base.replace(/[-]/g, ""),
        check = function(host,rule){
          var address = host.lastIndexOf(base), parseddomain = host.substr(0,address) + "$" + host.substr(address + base.length)

          return parseddomain.indexOf(rule) != -1
        },
        result = {},
        domains = BRANDS_DATABASE.domains;



    if(base.length == 0)
      return result;

    if (base == "IP") result = { text: "IP", backgroundColor: "9077e3" }

    else if (domains[base]) {
      for (var i=0,imax=domains[base].length;i<imax;i++) {
        var rule = domains[base][i] // r = rule, b = background-color, l = logo, t = text, c = color

        if (i == imax - 1 || check(urlDetails.host,rule.r)) {
          result = {
            backgroundColor: rule.b?rule.b:null,
            backgroundImage: rule.l?"url(https://cdn.cliqz.com/brands-database/database/" + this.BRANDS_DATABASE_VERSION + "/logos/" + base + "/" + rule.r + ".svg)":"",
            text: rule.t,
            color: rule.c?"":"#fff"
          }

          break
        }
      }
    }
    result.text = result.text || (baseCore.length > 1 ? ((baseCore[0].toUpperCase() + baseCore[1].toLowerCase())) : "")
    result.backgroundColor = result.backgroundColor || BRANDS_DATABASE.palette[base.split("").reduce(function(a,b){ return a + b.charCodeAt(0) },0) % BRANDS_DATABASE.palette.length]
    var colorID = BRANDS_DATABASE.palette.indexOf(result.backgroundColor),
        buttonClass = BRANDS_DATABASE.buttons && colorID != -1 && BRANDS_DATABASE.buttons[colorID]?BRANDS_DATABASE.buttons[colorID]:10

    result.buttonsClass = "cliqz-brands-button-" + buttonClass
    result.style = "background-color: #" + result.backgroundColor + ";color:" + (result.color || '#fff') + ";"


    if (result.backgroundImage) result.style += "background-image:" + result.backgroundImage + "; text-indent: -10em;"

    return result
  },
  httpHandler: function () {
    var errorHandler = arguments[3]; // see httpGet or httpPost arguments
    try {
      return CLIQZEnvironment.httpHandler.apply(CLIQZEnvironment, arguments);
    } catch(e) {
      if(errorHandler) {
        errorHandler(e);
      } else {
        CliqzUtils.log(e, "httpHandler failed");
      }
    }
  },
  httpGet: function(url, callback, onerror, timeout, _, sync){
    return CliqzUtils.httpHandler('GET', url, callback, onerror, timeout, _, sync);
  },
  httpPost: function(url, callback, data, onerror, timeout) {
    return CliqzUtils.httpHandler('POST', url, callback, onerror, timeout, data);
  },
  promiseHttpHandler: function() {
    return CLIQZEnvironment.promiseHttpHandler.apply(CLIQZEnvironment, arguments);
  },
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
  loadResource: function(url, callback, onerror) {
    try {
        return CliqzUtils.httpGet(url, callback, onerror, 3000);
    } catch (e) {
      CliqzUtils.log("Could not load resource " + url + " from the xpi",
                     "CliqzUtils.httpHandler");
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
  log: function(msg, key){
    if(CliqzUtils && CliqzUtils.getPref('showConsoleLogs', false)){
      var ignore = JSON.parse(CliqzUtils.getPref('showConsoleLogsIgnore', '[]'))
      if(ignore.indexOf(key) == -1) // only show the log message, if key is not in ignore list
        CLIQZEnvironment.log(msg, key);
    }
  },
  getDay: function() {
    return Math.floor(new Date().getTime() / 86400000);
  },
  //creates a random 'len' long string from the input space
  rand: function(len, _space){
      var ret = '', i,
          space = _space || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
          sLen = space.length;

      for(i=0; i < len; i++ )
          ret += space.charAt(Math.floor(Math.random() * sLen));

      return ret;
  },
  hash: function(s){
    return s.split('').reduce(function(a,b){ return (((a<<4)-a)+b.charCodeAt(0)) & 0xEFFFFFF}, 0)
  },
  cleanMozillaActions: function(url){
    if(url.indexOf("moz-action:") == 0) {
        var match = url.match(/^moz-action:([^,]+),(.*)$/);
        var action = match[1];
        url = match[2];
    }
    return [action, url];
  },
  cleanUrlProtocol: function(url, cleanWWW){
    if(!url) return '';

    var protocolPos = url.indexOf('://');

    // removes protocol http(s), ftp, ...
    if(protocolPos != -1 && protocolPos <= 6)
      url = url.split('://')[1];

    // removes the www.
    if(cleanWWW && url.toLowerCase().indexOf('www.') == 0)
      url = url.slice(4);

    return url;
  },
  getDetailsFromUrl: function(originalUrl){
    var result = CliqzUtils.cleanMozillaActions(originalUrl);
    var action = result[0];
    var originalUrl = result[1];
    // exclude protocol
    var url = originalUrl,
        name = '',
        tld = '',
        subdomains = [],
        path = '',
        query ='',
        fragment = '',
        ssl = originalUrl.indexOf('https') == 0;

    // remove scheme
    url = CliqzUtils.cleanUrlProtocol(url, false);
    var scheme = originalUrl.replace(url, '').replace('//', '');

    // separate hostname from path, etc. Could be separated from rest by /, ? or #
    var host = url.split(/[\/\#\?]/)[0].toLowerCase();
    var path = url.replace(host,'');

    // separate username:password@ from host
    var userpass_host = host.split('@');
    if(userpass_host.length > 1)
      host = userpass_host[1];

    // Parse Port number
    var port = "";

    var isIPv4 = ipv4_regex.test(host);
    var isIPv6 = ipv6_regex.test(host);


    var indexOfColon = host.indexOf(":");
    if ((!isIPv6 || isIPv4) && indexOfColon >= 0) {
      port = host.substr(indexOfColon+1);
      host = host.substr(0,indexOfColon);
    }
    else if (isIPv6) {
      // If an IPv6 address has a port number, it will be right after a closing bracket ] : format [ip_v6]:port
      var endOfIP = host.indexOf(']:');
      if (endOfIP >= 0) {
        port = host.split(']:')[1];
        host = host.split(']:')[0].replace('[','').replace(']','');
      }
    }

    // extract query and fragment from url
    var query = '';
    var query_idx = path.indexOf('?');
    if(query_idx != -1) {
      query = path.substr(query_idx+1);
    }

    var fragment = '';
    var fragment_idx = path.indexOf('#');
    if(fragment_idx != -1) {
      fragment = path.substr(fragment_idx+1);
    }

    // remove query and fragment from path
    path = path.replace('?' + query, '');
    path = path.replace('#' + fragment, '');
    query = query.replace('#' + fragment, '');

    // extra - all path, query and fragment
    var extra = path;
    if(query)
      extra += "?" + query;
    if(fragment)
      extra += "#" + fragment;

    isIPv4 = ipv4_regex.test(host);
    isIPv6 = ipv6_regex.test(host);
    var isLocalhost = CliqzUtils.isLocalhost(host, isIPv4, isIPv6);

    // find parts of hostname
    if (!isIPv4 && !isIPv6 && !isLocalhost) {
      try {
        tld = CLIQZEnvironment.tldExtractor(host);

        // Get the domain name w/o subdomains and w/o TLD
        name = host.slice(0, -(tld.length+1)).split('.').pop(); // +1 for the '.'

        // Get subdomains
        var name_tld = name + "." + tld;
        subdomains = host.slice(0, -name_tld.length).split(".").slice(0, -1);

        //remove www if exists
        // TODO: I don't think this is the right place to do this.
        //       Disabled for now, but check there are no issues.
        // host = host.indexOf('www.') == 0 ? host.slice(4) : host;
      } catch(e){
        name = "";
        host = "";
        //CliqzUtils.log('WARNING Failed for: ' + originalUrl, 'CliqzUtils.getDetailsFromUrl');
      }
    }
    else {
      name = isLocalhost ? "localhost" : "IP";
    }

    // remove www from beginning, we need cleanHost in the friendly url
    var cleanHost = host;
    if(host.toLowerCase().indexOf('www.') == 0) {
      cleanHost = host.slice(4);
    }

    var friendly_url = cleanHost + extra;
    //remove trailing slash from the end
    friendly_url = CliqzUtils.stripTrailingSlash(friendly_url);

    //Handle case where we have only tld for example http://cliqznas
    if(cleanHost === tld) {
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
  stripTrailingSlash: function(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
  },
  _isUrlRegExp: /^(([a-z\d]([a-z\d-]*[a-z\d]))\.)+[a-z]{2,}(\:\d+)?$/i,
  isUrl: function(input){
    //step 1 remove eventual protocol
    var protocolPos = input.indexOf('://');
    if(protocolPos != -1 && protocolPos <= 6){
      input = input.slice(protocolPos+3)
    }
    //step2 remove path & everything after
    input = input.split('/')[0];
    //step3 run the regex
    return CliqzUtils._isUrlRegExp.test(input);
  },


  // Chechks if the given string is a valid IPv4 addres
  isIPv4: function(input) {
    var ipv4_part = "0*([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])"; // numbers 0 - 255
    var ipv4_regex = new RegExp("^" + ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part + "\\."+ ipv4_part
    + "([:]([0-9])+)?$"); // port number
    return ipv4_regex.test(input);
  },

  isIPv6: function(input) {

    // Currently using a simple regex for "what looks like an IPv6 address" for readability
    var ipv6_regex = new RegExp("^\\[?(([0-9]|[a-f]|[A-F])*[:.]+([0-9]|[a-f]|[A-F])+[:.]*)+[\\]]?([:][0-9]+)?$")
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

  isLocalhost: function(host, isIPv4, isIPv6) {
    if (host == "localhost") return true;
    if (isIPv4 && host.substr(0,3) == "127") return true;
    if (isIPv6 && host == "::1") return true;

    return false;

  },

  // checks if a value represents an url which is a seach engine
  isSearch: function(value){
    if(CliqzUtils.isUrl(value)){
       return CliqzUtils.getDetailsFromUrl(value).host.indexOf('google') === 0 ? true: false;
    }
    return false;
  },
  // checks if a string is a complete url
  isCompleteUrl: function(input){
    var pattern = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
    if(!pattern.test(input)) {
      return false;
    } else {
      return true;
    }
  },
  // extract query term from search engine result page URLs
  extractQueryFromUrl: function(url) {
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
    var decoded = url ? decodeURIComponent(url.replace(/\+/g,' ')) : null;
    if (decoded) return decoded;
    else return url;
  },
  // Remove clutter (http, www) from urls
  generalizeUrl: function(url, skipCorrection) {
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
          val = val.substr(0, val.length - pathLength).replace(SYMBOLS, '.') +
          (pathLength ? val.substr(-pathLength) : '');
      }
    }
    url = CliqzUtils.cleanUrlProtocol(val, true);
    return url[url.length - 1] == '/' ? url.slice(0,-1) : url;
  },
  // Remove clutter from urls that prevents pattern detection, e.g. checksum
  simplifyUrl: function(url) {
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
        var tbm = param.indexOf('tbm=') != -1 ? ('&' + param.substring(param.lastIndexOf('tbm=')).split('&')[0]) : '';
        var page = param.indexOf('start=') != -1 ? ('&' + param.substring(param.lastIndexOf('start=')).split('&')[0]) : '';
        return 'https://www.google.com/search?' + q + tbm /*+ page*/;
      } else {
        return url;
      }
      // Bing
    } else if (url.search(/http(s?):\/\/www\.bing\..*\/.*q=.*/i) === 0) {
      q = url.substring(url.indexOf('q=')).split('&')[0];
      if (q != 'q=') {
        if (url.indexOf('search?') != -1)
          return url.substr(0, url.indexOf('search?')) + 'search?' + q;
        else
          return url.substr(0, url.indexOf('/?')) + '/?' + q;
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
  pingCliqzResults: function(){
    CliqzUtils.httpHandler('HEAD', CliqzUtils.RESULTS_PROVIDER_PING);
  },
  getCliqzResults: function(q, callback){
    CliqzUtils._sessionSeq++;

    // if the user sees the results more than 500ms we consider that he starts a new query
    if(CliqzUtils._queryLastDraw && (Date.now() > CliqzUtils._queryLastDraw + 500)){
      CliqzUtils._queryCount++;
    }
    CliqzUtils._queryLastDraw = 0; // reset last Draw - wait for the actual draw
    CliqzUtils._queryLastLength = q.length;

    var url = CliqzUtils.RESULTS_PROVIDER +
              encodeURIComponent(q) +
              CliqzUtils.encodeSessionParams() +
              CliqzLanguage.stateToQueryString() +
              CliqzUtils.encodeLocale() +
              CliqzUtils.encodeResultOrder() +
              CliqzUtils.encodeCountry() +
              CliqzUtils.encodeFilter() +
              CliqzUtils.encodeLocation() +
              CliqzUtils.encodeResultCount(7) +
              CliqzUtils.disableWikiDedup();

    var req = CliqzUtils.httpGet(url, function (res) {
      callback && callback(res, q);
    });

    // Currently when HPN is live, this guy breaks.
    if(req) CliqzUtils.requestMonitor.addRequest(req);
  },
  // IP driven configuration
  fetchAndStoreConfig: function(callback){
    CliqzUtils.httpGet(CliqzUtils.CONFIG_PROVIDER,
      function(res){
        if(res && res.response){
          try {
            var config = JSON.parse(res.response);
            for(var k in config){
              CliqzUtils.setPref('config_' + k, config[k]);
            }
          } catch(e){}
        }

        callback();
      },
      callback, //on error the callback still needs to be called
      2000
    );
  },
  encodeLocale: function() {
    // send browser language to the back-end
    return '&locale='+ (CliqzUtils.PREFERRED_LANGUAGE || "");
  },
  encodeCountry: function() {
    //international results not supported
    return '&force_country=true';
  },
  disableWikiDedup: function() {
    // disable wikipedia deduplication on the backend side
    var doDedup = CliqzUtils.getPref("languageDedup", false);
    if (doDedup) return '&ddl=0';
    else return ""
  },
  encodeFilter: function() {
    var data = {
      'conservative': 3,
      'moderate': 0,
      'liberal': 1
    },
    state = data[CliqzUtils.getPref('adultContentFilter', 'moderate')];

    return '&adult='+state;
  },
  encodeResultCount: function(count) {
    var doDedup = CliqzUtils.getPref("languageDedup", false);
    count = count || 5;
    if (doDedup) return '&count=' + count;
    else return ""
  },
  encodeResultType: function(type){
    if(type.indexOf('action') !== -1) return ['T'];
    else if(type.indexOf('cliqz-results') == 0) return CliqzUtils.encodeCliqzResultType(type);
    else if(type.indexOf('cliqz-pattern') == 0) return ['C'];
    else if(type === 'cliqz-extra') return ['X'];
    else if(type === 'cliqz-series') return ['S'];

    else if(type.indexOf('bookmark') == 0 ||
            type.indexOf('tag') == 0) return ['B'].concat(CliqzUtils.encodeCliqzResultType(type));

    else if(type.indexOf('favicon') == 0 ||
            type.indexOf('history') == 0) return ['H'].concat(CliqzUtils.encodeCliqzResultType(type));

    // cliqz type = "cliqz-custom sources-X"
    else if(type.indexOf('cliqz-custom') == 0) return type.substr(21);

    return type; //should never happen
  },
  //eg types: [ "H", "m" ], [ "H|instant", "X|11" ]
  isPrivateResultType: function(type) {
    var onlyType = type[0].split('|')[0];
    return 'HBTCS'.indexOf(onlyType) != -1 && type.length == 1;
  },
  // cliqz type = "cliqz-results sources-XXXXX" or "favicon sources-XXXXX" if combined with history
  encodeCliqzResultType: function(type){
    var pos = type.indexOf('sources-')
    if(pos != -1)
      return CliqzUtils.encodeSources(type.substr(pos+8));
    else
      return [];
  },
  // random ID generated at each urlbar focus
  _searchSession: '',
  // number of sequences in each session
  _sessionSeq: 0,
  _queryLastLength: null,
  _queryLastDraw: null,
  // number of queries in search session
  _queryCount: null,
  setSearchSession: function(rand){
    CliqzUtils._searchSession = rand;
    CliqzUtils._sessionSeq = 0;
    CliqzUtils._queryCount = 0;
    CliqzUtils._queryLastLength = 0;
    CliqzUtils._queryLastDraw = 0;
  },
  encodeSessionParams: function(){
    if(CliqzUtils._searchSession.length){
      return '&s=' + encodeURIComponent(CliqzUtils._searchSession) +
             '&n=' + CliqzUtils._sessionSeq +
             '&qc=' + CliqzUtils._queryCount
    } else return '';
  },

  encodeLocation: function(specifySource, lat, lng) {
    var qs = [
     '&loc_pref=',
     CliqzUtils.getPref('share_location','ask')
    ].join('')

    if (CLIQZEnvironment.USER_LAT && CLIQZEnvironment.USER_LNG || lat && lng) {
      qs += [
        '&loc=',
        lat || CLIQZEnvironment.USER_LAT,
        ',',
        lng || CLIQZEnvironment.USER_LNG,
        (specifySource ? ',U' : '')
      ].join('');
    }

    return qs;
  },
  encodeSources: function(sources){
    return sources.toLowerCase().split(', ').map(
      function(s){
        if(s.indexOf('cache') == 0) // to catch 'cache-*' for specific countries
          return 'd'
        else
          return VERTICAL_ENCODINGS[s] || s;
      });
  },
  combineSources: function(internal, cliqz){
    // do not add extra sources to end of EZs
    if(internal == "cliqz-extra")
      return internal;

    var cliqz_sources = cliqz.substr(cliqz.indexOf('sources-'))
    return internal + " " + cliqz_sources
  },
  isPrivate: CLIQZEnvironment.isPrivate,
  telemetry: CLIQZEnvironment.telemetry,
  resultTelemetry: function(query, queryAutocompleted, resultIndex, resultUrl, resultOrder, extra) {
    CliqzUtils.setResultOrder(resultOrder);
    var params = encodeURIComponent(query) +
      (queryAutocompleted ? '&a=' + encodeURIComponent(queryAutocompleted) : '') +
      '&i=' + resultIndex +
      (resultUrl ? '&u=' + encodeURIComponent(resultUrl) : '') +
      CliqzUtils.encodeSessionParams() +
      CliqzUtils.encodeResultOrder() +
      (extra ? '&e=' + extra : '')
    CliqzUtils.httpGet(CliqzUtils.RESULTS_PROVIDER_LOG + params);
    CliqzUtils.setResultOrder('');
    CliqzUtils.log(params, 'Utils.resultTelemetry');
  },
  _resultOrder: '',
  setResultOrder: function(resultOrder) {
    CliqzUtils._resultOrder = resultOrder;
  },
  encodeResultOrder: function() {
    return CliqzUtils._resultOrder && CliqzUtils._resultOrder.length ? '&o=' + encodeURIComponent(JSON.stringify(CliqzUtils._resultOrder)) : '';
  },
  setInterval: CLIQZEnvironment.setInterval,
  setTimeout: CLIQZEnvironment.setTimeout,
  clearTimeout: CLIQZEnvironment.clearTimeout,
  clearInterval: CLIQZEnvironment.clearTimeout,
  locale: {},
  currLocale: null,
  loadLocale: function (lang_locale) {
    if (!CliqzUtils.locale.hasOwnProperty(lang_locale) && !CliqzUtils.locale.hasOwnProperty('default')) {
      return CliqzUtils.getLocaleFile(encodeURIComponent(lang_locale), lang_locale).catch(function() {
        // We did not find the full locale (e.g. en-GB): let's try just the
        // language!
        var loc = CliqzUtils.getLanguageFromLocale(lang_locale);
        return CliqzUtils.getLocaleFile(loc, lang_locale).catch(function () {
          // The default language
          return CliqzUtils.getLocaleFile('de', 'default');
        });
      });
    }
  },
  getLocaleFile: function (locale_path, locale_key) {
    return new Promise (function (resolve, reject) {
      CliqzUtils.loadResource(CLIQZEnvironment.LOCALE_PATH + locale_path + '/cliqz.json',
        function(req) {
            if (CliqzUtils){
              if (locale_key !== 'default') {
                CliqzUtils.currLocale = locale_key;
              }
              CliqzUtils.locale[locale_key] = JSON.parse(req.response);
              resolve();
            }
        },
        reject
      );
    });
  },
  getLanguageFromLocale: function(locale){
    return locale.match(/([a-z]+)(?:[-_]([A-Z]+))?/)[1];
  },
  getLanguage: function(win){
    return CliqzUtils.LANGS[CliqzUtils.getLanguageFromLocale(win.navigator.language)] || 'en';
  },
  getLocalizedString: function(key, substitutions){
    if(!key) return '';

    var str = key,
        localMessages;

    if (CliqzUtils.currLocale != null && CliqzUtils.locale[CliqzUtils.currLocale]
            && CliqzUtils.locale[CliqzUtils.currLocale][key]) {
        str = CliqzUtils.locale[CliqzUtils.currLocale][key].message;
        localMessages = CliqzUtils.locale[CliqzUtils.currLocale];
    } else if (CliqzUtils.locale.default && CliqzUtils.locale.default[key]) {
        str = CliqzUtils.locale.default[key].message;
        localMessages = CliqzUtils.locale.default;
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
  localizeDoc: function(doc){
    var locale = doc.getElementsByClassName('cliqz-locale');
    for(var i = 0; i < locale.length; i++){
        var el = locale[i];
        el.textContent = CliqzUtils.getLocalizedString(el.getAttribute('key'));
    }
  },
  extensionRestart: function(changes){
    var enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win.CLIQZ && win.CLIQZ.Core){
        win.CLIQZ.Core.unload(true);
      }
    }

    changes && changes();

    var corePromises = [];
    enumerator = Services.wm.getEnumerator('navigator:browser');
    while (enumerator.hasMoreElements()) {
      var win = enumerator.getNext();
      if(win.CLIQZ && win.CLIQZ.Core){
        corePromises.push(win.CLIQZ.Core.init());
      }
    }

    return Promise.all(corePromises);
  },
  isWindows: function(){
    return CLIQZEnvironment.OS.indexOf("win") === 0;
  },
  isMac: function(){
    return CLIQZEnvironment.OS.indexOf("darwin") === 0;
  },
  isLinux: function() {
    return CLIQZEnvironment.OS.indexOf("linux") === 0;
  },
  getWindow: CLIQZEnvironment.getWindow,
  getWindowID: CLIQZEnvironment.getWindowID,
  hasClass: function(element, className) {
    return (' ' + element.className + ' ').indexOf(' ' + className + ' ') > -1;
  },
  /**
   * Bind functions contexts to a specified object.
   * @param {Object} from - An object, whose function properties will be processed.
   * @param {Object} to - An object, which will be the context (this) of processed functions.
   */
  bindObjectFunctions: function(from, to) {
    for (var funcName in from) {
      var func = from[funcName];
      if (!from.hasOwnProperty(funcName))
        continue;
      // Can't compare with prototype of object from a different module.
      if (typeof func != "function")
        continue;
      from[funcName] = func.bind(to);
    }
  },
  tryDecodeURIComponent: function(s) {
    // avoide error from decodeURIComponent('%2')
    try {
      return decodeURIComponent(s);
    } catch(e) {
      return s;
    }
  },
  tryEncodeURIComponent: function(s) {
    try {
      return encodeURIComponent(s);
    } catch(e) {
      return s;
    }
  },
  parseQueryString: function(qstr) {
    var query = {};
    var a = (qstr || '').split('&');
    for (var i in a)
    {
      var b = a[i].split('=');
      query[CliqzUtils.tryDecodeURIComponent(b[0])] = CliqzUtils.tryDecodeURIComponent(b[1]);
    }

    return query;
  },
  roundToDecimal: function(number, digits) {
    var multiplier = Math.pow(10, digits);
    return Math.round(number * multiplier) / multiplier;
  },
  getAdultFilterState: function(){
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
  getParameterByName: function(name, location) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }
};
; ctx[EXPORTED_SYMBOLS[0]] = CliqzUtils;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzUtils


// start module CliqzABTests
(function(ctx,Q,E){
'use strict';
/*
 * This module implements a mechanism which enables/disables AB tests
 *
 */

var EXPORTED_SYMBOLS = ['CliqzABTests'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var timer=null, ONE_HOUR = 60 * 60 * 1000;

function log(msg){
  CliqzUtils.log(msg, "CliqzABTests.jsm");
}

var CliqzABTests = {
    PREF: 'ABTests',
    PREF_OVERRIDE: 'ABTestsOverride',
    URL: 'https://logging.cliqz.com/abtests/check?session=',
    init: function(){
        CliqzABTests.check();

    },
    unload: function(){
        CliqzUtils.clearTimeout(timer);
    },
    // Accessors to list of tests this user is current in
    getCurrent: function() {
        if(CliqzUtils.hasPref(CliqzABTests.PREF))
            return JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));
        return undefined;
    },
    setCurrent: function(tests) {
        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(tests))
    },

    // Accessors to list of tests in override list
    getOverride: function() {
        if(CliqzUtils.hasPref(CliqzABTests.PREF_OVERRIDE)) {
            var ABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF_OVERRIDE));
            return ABtests;
        }
        return undefined;
    },
    setOverride: function(tests) {
        if(tests)
            CliqzUtils.setPref(CliqzABTests.PREF_OVERRIDE, JSON.stringify(tests));
        else
            CliqzUtils.clearPref(CliqzABTests.PREF_OVERRIDE);
    },

    // Check for newest list of AB tests from server
    check: function() {
        log('AB checking');
        // clear the last timer
        CliqzUtils.clearTimeout(timer);
        // set a new timer to be triggered after 1 hour
        timer = CliqzUtils.setTimeout(CliqzABTests.check, ONE_HOUR);

        CliqzABTests.retrieve(
            function(response){
                try{
                    var prevABtests = {};
                    if(CliqzUtils.hasPref(CliqzABTests.PREF))
                        prevABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

                    var respABtests = JSON.parse(response.responseText);

                    // Override the backend response - for local testing
                    var overrideABtests = CliqzABTests.getOverride();
                    if(overrideABtests)
                        respABtests = overrideABtests;

                    var newABtests = {};

                    var changes = false; // any changes?

                    // find old AB tests to leave
                    for(var o in prevABtests) {
                        if(!respABtests[o]) {
                            if(CliqzABTests.leave(o))
                                changes = true;
                        }
                        else {
                            // keep this old test in the list of current tests
                            newABtests[o] = prevABtests[o]
                        }
                    }

                    // find new AB tests to enter
                    for(var n in respABtests) {
                        if(!(prevABtests[n])) {
                            if(CliqzABTests.enter(n, respABtests[n])) {
                                changes = true;
                                newABtests[n] = respABtests[n];
                            }
                        }
                    }

                    if(changes) {
                        CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(newABtests))
                    }
                } catch(e){
                  log('retrieve error: ' + e.message)
                }
            });
    },
    retrieve: function(callback) {
        var url = CliqzABTests.URL + encodeURIComponent(CliqzUtils.getPref('session',''));

        var onerror = function(){ log("failed to retrieve AB test data"); }

        CliqzUtils.httpGet(url, callback, onerror, 15000);
    },
    enter: function(abtest, payload) {
        // Add new AB tests here.
        // It is safe to remove them as soon as the test is over.
        var rule_executed = true
        switch(abtest) {
            case "1024_B":
                CliqzUtils.setPref("categoryAssessment", true);
                break;
            case "1028_A":
                CliqzUtils.setPref("humanWeb", false);
                break;
            case "1028_B":
                CliqzUtils.setPref("humanWeb", true);
                break;
            case "1032_A":
                CliqzUtils.setPref("spellCorrMessage", false);
                break;
            case "1032_B":
                CliqzUtils.setPref("spellCorrMessage", true);
                break;
            case "1036_B":
                CliqzUtils.setPref("extended_onboarding_same_result", true);
                break;
            case "1045_A":
                break;
            case "1045_B":
                CliqzUtils.setPref("antiTrackTest", true);
                break;
            case "1046_B":
                CliqzUtils.setPref("attrackBlockCookieTracking", true);
                break;
            case "1047_B":
                CliqzUtils.setPref("attrackRemoveQueryStringTracking", true);
                break;
            case "1048_B":
                CliqzUtils.setPref("attrackAlterPostdataTracking", true);
                break;
            case "1049_B":
                CliqzUtils.setPref("attrackCanvasFingerprintTracking", true);
                break;
            case "1050_B":
                CliqzUtils.setPref("attrackRefererTracking", true);
                break;
            case "1051_B":
                CliqzUtils.setPref("antiTrackTest", true);
                break;
            case "1052_A":
                CliqzUtils.setPref("attrackBlockCookieTracking", false);
                break;
            case "1052_B":
                CliqzUtils.setPref("attrackBlockCookieTracking", true);
                break;
            case "1053_A":
                CliqzUtils.setPref("attrackRemoveQueryStringTracking", false);
                break;
            case "1053_B":
                CliqzUtils.setPref("attrackRemoveQueryStringTracking", true);
                break;
            case "1055_B":
                CliqzUtils.setPref("unblockMode", "always");
                break;
            case "1056_A":
                CliqzUtils.setPref("freshTabAB", false);
                break;
            case "1056_B":
                CliqzUtils.setPref("freshTabAB", true);
                break;
            case "1057_A":
                CliqzUtils.setPref("trackerTxt", false);
                break;
            case "1057_B":
                CliqzUtils.setPref("trackerTxt", true);
                break;
            case "1058_A":
                CliqzUtils.setPref("unblockMode", "never");
                break;
            case "1058_B":
                CliqzUtils.setPref("unblockMode", "always");
                break;
            case "1059_A":
                CliqzUtils.setPref("attrack.local_tracking", false);
                break;
            case "1059_B":
                CliqzUtils.setPref("attrack.local_tracking", true);
                break;
            case "1060_A":
                CliqzUtils.setPref("attrackBloomFilter", false);
                break;
            case "1060_B":
                CliqzUtils.setPref("attrackBloomFilter", true);
                break;
            case "1061_A":
                CliqzUtils.setPref("attrackUI", false);
                break;
            case "1061_B":
                CliqzUtils.setPref("attrackUI", true);
                break;
            case "1063_A":
                CliqzUtils.setPref("double-enter2", false);
                break;
            case "1063_B":
                CliqzUtils.setPref("double-enter2", true);
                break;
            case "1064_A":
                CliqzUtils.setPref("attrackDefaultAction", "same");
                break;
            case "1064_B":
                CliqzUtils.setPref("attrackDefaultAction", "placeholder");
                break;
            case "1064_C":
                CliqzUtils.setPref("attrackDefaultAction", "block");
                break;
            case "1064_D":
                CliqzUtils.setPref("attrackDefaultAction", "empty");
                break;
            case "1064_E":
                CliqzUtils.setPref("attrackDefaultAction", "replace");
                break;
            case "1065_A":
                CliqzUtils.setPref("freshTabNewsEmail", false);
                break;
            case "1065_B":
                CliqzUtils.setPref("freshTabNewsEmail", true);
                break;
            case "1066_A":
                CliqzUtils.setPref("proxyNetwork", false);
                break;
            case "1066_B":
                CliqzUtils.setPref("proxyNetwork", true);
                break;
            case "1067_B":
                CliqzUtils.setPref("attrackProxyTrackers", true);
                break;
            case "1068_A":
                CliqzUtils.setPref("languageDedup", false);
                break;
            case "1068_B":
                CliqzUtils.setPref("languageDedup", true);
                break;
            case "1069_A":
                CliqzUtils.setPref("grOfferSwitchFlag", false);
                break;
            case "1069_B":
                CliqzUtils.setPref("grOfferSwitchFlag", true);
                break;
            case "1070_A":
                CliqzUtils.setPref("cliqz-anti-phishing", false);
                CliqzUtils.setPref("cliqz-anti-phishing-enabled", false);
                break;
            case "1070_B":
                CliqzUtils.setPref("cliqz-anti-phishing", true);
                CliqzUtils.setPref("cliqz-anti-phishing-enabled", true);
                break;
            case "1071_A":
                CliqzUtils.setPref("browser.privatebrowsing.apt", false, '');
                break;
            case "1071_B":
                CliqzUtils.setPref("browser.privatebrowsing.apt", true, '');
                break;
            case "1072_A":
                CliqzUtils.setPref("grFeatureEnabled", false);
                break;
            case "1072_B":
                CliqzUtils.setPref("grFeatureEnabled", true);
            case "1073_A":
                CliqzUtils.setPref("history.timeouts", false);
                break;
            case "1073_B":
                CliqzUtils.setPref("history.timeouts", true);
                break;
            case "1074_A":
                CliqzUtils.setPref("cliqz-adb-abtest", false);
                break;
            case "1074_B":
                CliqzUtils.setPref("cliqz-adb-abtest", true);
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'enter',
                name: abtest
            };
            CliqzUtils.telemetry(action);

            return true;
       } else {
            return false;
       }
    },
    leave: function(abtest, disable) {
        // Restore defaults after an AB test is finished.
        // DO NOT remove test cleanup code too quickly, a user
        // might not start the browser for a long time and
        // get stuck in a test if we remove cases too early.
        var rule_executed = true;
        switch(abtest) {
            case "1024_B":
                CliqzUtils.clearPref("categoryAssessment");
                break;
            case "1028_A":
            case "1028_B":
                CliqzUtils.clearPref("humanWeb");
                break;
            case "1032_A":
            case "1032_B":
                CliqzUtils.clearPref("spellCorrMessage");
                break;
            case "1036_A":
            case "1036_B":
                CliqzUtils.clearPref("extended_onboarding_same_result");
                CliqzUtils.clearPref("extended_onboarding");
                break;
            case "1045_A":
            case "1045_B":
                CliqzUtils.clearPref("antiTrackTest");
                break;
            case "1046_A":
            case "1047_A":
            case "1048_A":
            case "1049_A":
            case "1050_A":
                break;
            case "1046_B":
                CliqzUtils.clearPref("attrackBlockCookieTracking");
                break;
            case "1047_B":
                CliqzUtils.clearPref("attrackRemoveQueryStringTracking");
                break;
            case "1048_B":
                CliqzUtils.clearPref("attrackAlterPostdataTracking");
                break;
            case "1049_B":
                CliqzUtils.clearPref("attrackCanvasFingerprintTracking");
                break;
            case "1050_B":
                CliqzUtils.clearPref("attrackRefererTracking");
                break;
            case "1051_B":
                CliqzUtils.clearPref("antiTrackTest");
                break;
            case "1052_B":
                CliqzUtils.clearPref("attrackBlockCookieTracking");
                break;
            case "1053_B":
                CliqzUtils.clearPref("attrackRemoveQueryStringTracking");
                break;
            case "1055_A":
            case "1055_B":
                CliqzUtils.clearPref("unblockEnabled");
                break;
            case "1056_A":
            case "1056_B":
                CliqzUtils.clearPref("freshTabAB");
                break;
            case "1057_B":
                CliqzUtils.clearPref("trackerTxt");
                break;
            case "1058_A":
            case "1058_B":
                CliqzUtils.clearPref("unblockMode");
                break;
            case "1059_A":
            case "1059_B":
                CliqzUtils.clearPref("attrack.local_tracking");
                break;
            case "1060_A":
            case "1060_B":
                CliqzUtils.clearPref("attrackBloomFilter");
                break;
            case "1061_A":
            case "1061_B":
                CliqzUtils.clearPref("attrackUI");
                break;
            case "1063_A":
            case "1063_B":
                CliqzUtils.clearPref("double-enter2");
                break;
            case "1064_A":
            case "1064_B":
            case "1064_C":
            case "1064_D":
            case "1064_E":
                CliqzUtils.clearPref("attrackDefaultAction");
                break;
            case "1066_A":
            case "1066_B":
                CliqzUtils.clearPref("proxyNetwork");
                break;
            case "1065_A":
            case "1065_B":
                CliqzUtils.clearPref("freshTabNewsEmail");
                break;
            case "1067_B":
                CliqzUtils.clearPref("attrackProxyTrackers");
                break;
            case "1068_A":
            case "1068_B":
                CliqzUtils.clearPref("languageDedup");
                break;
            case "1069_A":
            case "1069_B":
                CliqzUtils.clearPref("grOfferSwitchFlag");
            break;
            case "1070_A":
            case "1070_B":
                CliqzUtils.clearPref('cliqz-anti-phishing');
                CliqzUtils.clearPref('cliqz-anti-phishing-enabled');
                break;
            case "1071_A":
            case "1071_B":
                CliqzUtils.clearPref('browser.privatebrowsing.apt', '');
                break
            case "1072_A":
            case "1072_B":
              CliqzUtils.clearPref('grFeatureEnabled');
              break;
            case "1073_A":
            case "1073_B":
              CliqzUtils.clearPref('history.timeouts');
              break;
            case "1074_A":
            case "1074_B":
                CliqzUtils.clearPref('cliqz-adb-abtest');
                break;
            default:
                rule_executed = false;
        }
        if(rule_executed) {
            var action = {
                type: 'abtest',
                action: 'leave',
                name: abtest,
                disable: disable
            };
            CliqzUtils.telemetry(action);
            return true;
       } else {
            return false;
       }
    },
    disable: function(abtest) {
        // Disable an AB test but do not remove it from list of active AB tests,
        // this is intended to be used by the extension itself when it experiences
        // an error associated with this AB test.
        if(CliqzUtils.hasPref(CliqzABTests.PREF)) {
             var curABtests = JSON.parse(CliqzUtils.getPref(CliqzABTests.PREF));

            if(curABtests[abtest] && CliqzABTests.leave(abtest, true)) {
                // mark as disabled and save back to preferences
                curABtests[abtest].disabled = true;
                CliqzUtils.setPref(CliqzABTests.PREF, JSON.stringify(curABtests))
            }
        }
    },
}
; ctx[EXPORTED_SYMBOLS[0]] = CliqzABTests;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzABTests


// start module CliqzAutocomplete
(function(ctx,Q,E){
'use strict';
/*
 * This module implements the core functionality based on nsIAutoCompleteResult interface
 * http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
 */

var EXPORTED_SYMBOLS = ['CliqzAutocomplete'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/Mixer.jsm');
Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzResultProviders',
  'chrome://cliqzmodules/content/CliqzResultProviders.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzHistoryCluster',
  'chrome://cliqzmodules/content/CliqzHistoryCluster.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzSpellCheck',
  'chrome://cliqzmodules/content/CliqzSpellCheck.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'NewTabUtils',
  'resource://gre/modules/NewTabUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzEvents',
  'chrome://cliqzmodules/content/CliqzEvents.jsm');

function isQinvalid(q){
    //TODO: add more
    if(q.indexOf('view-source:') === 0) return true;

    return false;
}

var CliqzAutocomplete = {
    LOG_KEY: 'CliqzAutocomplete',
    TIMEOUT: 1000,
    HISTORY_TIMEOUT: 200,
    SCROLL_SIGNAL_MIN_TIME: 500,
    lastPattern: null,
    lastSearch: '',
    lastResult: null,
    lastSuggestions: null,
    lastResultHeights: [],
    hasUserScrolledCurrentResults: false, // set to true whenever user scrolls, set to false when new results are shown
    lastResultsUpdateTime: null, // to measure how long a result has been shown for
    resultsOverflowHeight: 0, // to determine if scrolling is possible (i.e., overflow > 0px)
    afterQueryCount: 0,
    discardedResults: 0,
    isPopupOpen: false,
    lastPopupOpen: null,
    lastQueryTime: null,
    lastDisplayTime: null,
    lastFocusTime: null,
    highlightFirstElement: false,
    spellCorrectionDict: {},
    spellCorr: {
        'on': false,
        'correctBack': {},
        'override': false,
        'pushed': null,
        'userConfirmed': false,
        'searchTerms': []
    },
    init: function(){
        CliqzUtils.init();
        CliqzAutocomplete.initProvider();
        CliqzAutocomplete.initResults();

        XPCOMUtils.defineLazyServiceGetter(CliqzAutocomplete.CliqzResults.prototype, 'historyAutoCompleteProvider',
                  '@mozilla.org/autocomplete/search;1?name=history', 'nsIAutoCompleteSearch');

        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
            reg.unregisterFactory(
                reg.contractIDToCID(CONTRACT_ID),
                reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
            )
        }catch(e){}
        var cp = CliqzAutocomplete.CliqzResults.prototype;
        var factory = XPCOMUtils.generateNSGetFactory([CliqzAutocomplete.CliqzResults])(cp.classID);
        reg.registerFactory(cp.classID, cp.classDescription, cp.contractID, factory);

        // populate so we have them for topsites dropdown
        NewTabUtils.links.populateCache();

        CliqzUtils.log('initialized', CliqzAutocomplete.LOG_KEY);
    },
    unload: function() {
        var reg = Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar);
        var CONTRACT_ID = CliqzAutocomplete.CliqzResults.prototype.contractID;
        try{
          reg.unregisterFactory(
            reg.contractIDToCID(CONTRACT_ID),
            reg.getClassObjectByContractID(CONTRACT_ID, Ci.nsISupports)
          );
        }catch(e){}
    },
    getResultsOrder: function(results){
        return CliqzAutocomplete.prepareResultOrder(results);
    },
    // SOURCE: https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component
    ProviderAutoCompleteResultCliqz: function(searchString, searchResult,
        defaultIndex, errorDescription) {
        this._searchString = searchString;
        this._searchResult = searchResult;
        this._defaultIndex = defaultIndex;
    },
    // SOURCE: http://mxr.mozilla.org/mozilla-central/source/toolkit/components/autocomplete/nsIAutoCompleteResult.idl
    CliqzResults: function(){},
    resetSpellCorr: function() {
        CliqzAutocomplete.spellCorr = {
            'on': false,
            'correctBack': {},
            'override': false,
            'pushed': null,
            'userConfirmed': false,
            'searchTerms': []
        }
    },
    fetchTopSites: function() {
        var results = NewTabUtils.links.getLinks().filter(function(r){ return r !== null; }).slice(0, 5);
        if(results.length > 0) {
            var top = Result.generic('cliqz-extra', '', null, '', null, '', null, JSON.stringify({topsites:true}));
            top.data.title = CliqzUtils.getLocalizedString('topSitesTitle');
            top.data.message = CliqzUtils.getLocalizedString('topSitesMessage');
            top.data.message1 = CliqzUtils.getLocalizedString('topSitesMessage1');
            top.data.cliqz_logo = CLIQZEnvironment.SKIN_PATH + 'img/cliqz.svg';
            top.data.lastQ = CliqzUtils.getWindow().gBrowser.selectedTab.cliqz;
            top.data.url = results[0].url;
            top.data.template = 'topsites';
            top.data.urls = results.map(function(r) {
                var urlDetails = CliqzUtils.getDetailsFromUrl(r.url),
                    logoDetails = CliqzUtils.getLogoDetails(urlDetails);

                // show all subdomains (except for "www"), name, and tld (e.g., "mail.google.com")
                var nameComponents = [];
                for (var i = 0; i < urlDetails.subdomains.length; i++) {
                    if (urlDetails.subdomains[i] != 'www') {
                        nameComponents.push(urlDetails.subdomains[i]);
                    }
                }
                nameComponents.push(urlDetails.name, urlDetails.tld);

                return {
                  url: r.url,
                  href: r.url.replace(urlDetails.path, ''),
                  link: r.url.replace(urlDetails.path, ''),
                  name: r.title ? r.title: nameComponents.join('.'),
                  text: logoDetails.text,
                  style: logoDetails.style,
                  extra: "top-sites-" + i
                }
            });
            return top;
        }
        return [];
    },
    initProvider: function(){
        CliqzAutocomplete.ProviderAutoCompleteResultCliqz.prototype = {
            _searchString: '',
            _searchResult: 0,
            _defaultIndex: 0,
            _errorDescription: '',
            _results: [],

            get searchString() { return this._searchString; },
            get searchResult() { return this._searchResult; },
            get defaultIndex() { return this._defaultIndex; },
            get errorDescription() { return this._errorDescription; },
            get matchCount() { return this._results.length; },
            getValueAt: function(index) { return (this._results[index] || {}).val; },
            getFinalCompleteValueAt: function(index) { return null; }, //FF31+
            getCommentAt: function(index) { return (this._results[index] || {}).comment; },
            getStyleAt: function(index) { return (this._results[index] || {}).style; },
            getImageAt: function (index) { return ''; },
            getLabelAt: function(index) { return (this._results[index] || {}).label; },
            getDataAt: function(index) { return (this._results[index] || {}).data; },
            QueryInterface: XPCOMUtils.generateQI([  ]),
            setResults: function(results){

                this._results = this.filterUnexpected(results);

                CliqzAutocomplete.lastResult = this;
                CliqzEvents.pub('autocomplete.new_result', { result: this, isPopupOpen: CliqzAutocomplete.isPopupOpen });
                var order = CliqzAutocomplete.getResultsOrder(this._results);
                CliqzUtils.setResultOrder(order);

                // flag for rendering to avoid rendering of "unmixed" results
                this.isMixed = true;
            },

            filterUnexpected: function(results){
                // filter out ununsed/unexpected results
                var ret=[];
                for(var i=0; i < results.length; i++){
                    var r = results[i];
                    if(r.style == 'cliqz-extra'){
                        if(r.data){
                            // override the template if the superTemplate is known
                            if(CLIQZEnvironment.isUnknownTemplate(r.data.template)){
                                // unexpected/unknown template
                                continue;
                            }
                        }
                    }

                    // If one of the results is data.only = true Remove all others.
                    // if (!r.invalid && r.data && r.data.only) {
                    //  return [r];
                    //}

                    ret.push(r);
                }
                return ret;
            }
        }
    },
    // a result is done once a new result comes in, or once the popup closes
    markResultsDone: function(newResultsUpdateTime) {
        // is there a result to be marked as done?
        if (CliqzAutocomplete.lastResultsUpdateTime) {
            var resultsDisplayTime = Date.now() - CliqzAutocomplete.lastResultsUpdateTime;
            this.sendResultsDoneSignal(resultsDisplayTime);
        }
        // start counting elapsed time anew
        CliqzAutocomplete.lastResultsUpdateTime = newResultsUpdateTime;
        CliqzAutocomplete.hasUserScrolledCurrentResults = false;
    },
    sendResultsDoneSignal: function(resultsDisplayTime) {
        // reduced traffic: only consider telemetry data if result was shown long enough (e.g., 0.5s)
        if (resultsDisplayTime > CliqzAutocomplete.SCROLL_SIGNAL_MIN_TIME) {
            var action = {
                type: 'activity',
                action: 'results_done',
                has_user_scrolled: CliqzAutocomplete.hasUserScrolledCurrentResults,
                results_display_time: resultsDisplayTime,
                results_overflow_height: CliqzAutocomplete.resultsOverflowHeight,
                can_user_scroll: CliqzAutocomplete.resultsOverflowHeight > 0
            };
            CliqzUtils.telemetry(action);
        }
    },
    // returns array of result kinds, adding each result's
    // height in terms of occupied dropdown slots (1-3) as
    // parameter (e.g., ["C|{\"h\":1}"],["m|{\"h\":1}"])
    prepareResultOrder: function (results) {
        // heights is updated in UI's handleResults
        var heights = CliqzAutocomplete.lastResultHeights,
            resultOrder = [];

        if (results) {
            for(var i = 0; i < results.length; i++) {
                if(results[i].data == null || results[i].data.kind == null){
                  resultOrder.push('_'); //debug - it should not happen
                  continue;
                }

                var kind   = results[i].data.kind.slice(0),
                    tokens = kind && kind.length > 0 ?
                             kind[0].split('|') : [],
                    params = tokens.length > 1 ?
                             JSON.parse(tokens[1]) : {};

                params.h = i < heights.length ?
                           heights[i] : 0;
                kind[0] =
                    tokens[0] + '|' + JSON.stringify(params);
                resultOrder.push(kind);
            }
        }

        return resultOrder;
    },
    initResults: function(){
        CliqzAutocomplete.CliqzResults.prototype = {
            resultsTimer: null,
            historyTimer: null,
            historyTimeout: false,
            instant: [],

            historyTimeoutCallback: function(params) {
                CliqzUtils.log('history timeout', CliqzAutocomplete.LOG_KEY);
                this.historyTimeout = true;
                // History timed out but maybe we have some results already
                // So show what you have - AB 1073
                if (this.historyResults && CliqzUtils.getPref("history.timeouts", false)) {
                    CliqzHistoryCluster.addFirefoxHistory(this.historyResults);
                    CliqzUtils.log('historyTimeoutCallback: push collected results:' + this.historyResults.results.length, CliqzAutocomplete.LOG_KEY);
                } else {
                    this.pushResults(this.searchString);
                }
            },
            onHistoryDone: function(result, resultExtra) {
                if(!this.startTime) {
                    return; // no current search, just discard
                }

                var now = Date.now();


                this.historyResults = result;
                this.latency.history = now - this.startTime;

                //CliqzUtils.log("history results: " + (result ? result.matchCount : "null") + "; done: " + this.isHistoryReady() +
                //               "; time: " + (now - this.startTime), CliqzAutocomplete.LOG_KEY)
                // Choose an instant result if we have all history results (timeout)
                // and we haven't already chosen one
                if(result && (this.isHistoryReady() || this.historyTimeout) && this.mixedResults.matchCount == 0) {
                    CliqzUtils.clearTimeout(this.historyTimer);
                    CliqzHistoryCluster.addFirefoxHistory(result);
                }
            },
            isHistoryReady: function() {
                return this.historyResults && this.historyResults.ready;
            },
            historyPatternCallback: function(res) {
                // abort if we already have results
                if(this.mixedResults.matchCount > 0) return;

                if (res.query == this.searchString) {
                    CliqzAutocomplete.lastPattern = res;

                    var latency = 0;
                    if (CliqzHistoryCluster.latencies[res.query]) {
                        latency = (new Date()).getTime() - CliqzHistoryCluster.latencies[res.query];
                    }
                    this.latency.patterns = latency;

                    // Create instant result
                    CliqzHistoryCluster.createInstantResult(res, this.searchString, this.createInstantResultCallback);
                }
            },
            createInstantResultCallback:function(instant) {
                this.instant = instant;

                this.pushResults(this.searchString);
            },
            pushTimeoutCallback: function(params) {
                CliqzUtils.log("pushTimeoutCallback", CliqzAutocomplete.LOG_KEY);
                this.pushResults(params);
            },
            // checks if all the results are ready or if the timeout is exceeded
            pushResults: function(q) {
                if(q == this.searchString && this.startTime != null){ // be sure this is not a delayed result
                    var now = Date.now();

                    if((now > this.startTime + CliqzAutocomplete.TIMEOUT) || // 1s timeout
                       (this.isHistoryReady() || this.historyTimeout) && // history is ready or timed out
                       this.cliqzResults) { // all results are ready
                        /// Push full result
                        CliqzUtils.clearTimeout(this.resultsTimer);
                        CliqzUtils.clearTimeout(this.historyTimer);
                        this.mixResults(false);

                        this.latency.mixed = Date.now() - this.startTime;

                        this.callback(this.mixedResults, this);

                        this.latency.all = Date.now() - this.startTime;

                        // delay wrapping to make sure rendering is complete
                        // otherwise we don't get up to date autocomplete stats
                        CliqzUtils.setTimeout(this.fullWrapup, 0, this);

                        return;
                    } else if(this.isHistoryReady()) {
                        /// Push instant result
                        this.latency.mixed = Date.now() - this.startTime;

                        this.mixResults(true);

                        // try to update as offen as possible if new results are ready
                        // TODO - try to check if the same results are currently displaying
                        this.mixedResults.matchCount && this.callback(this.mixedResults, this);

                        this.latency.all = Date.now() - this.startTime;

                        // Do partial wrapup, final wrapup will happen after all results are received
                        CliqzUtils.setTimeout(this.instantWrapup, 0, this);
                    } else {
                        /// Nothing to push yet, probably only cliqz results are received, keep waiting
                    }
                }
            },

            // handles fetched results from the cache
            cliqzResultFetcher: function(req, q) {

                // be sure this is not a delayed result
                if(q != this.searchString) {
                    this.discardedResults += 1; // count results discarded from backend because they were out of date
                } else {
                    this.latency.backend = Date.now() - this.startTime;
                    var results = [];
                    var json = JSON.parse(req.response);

                    // apply rerankers
                    for (var i = 0; i < CLIQZEnvironment.RERANKERS.length; i++){
                        var reranker = CLIQZEnvironment.RERANKERS[i];
                        if (reranker != null){
                            var rerankerResults = reranker.doRerank(json.result);
                            json.result = rerankerResults.response;
                            if (Object.keys(rerankerResults.telemetrySignal).length > 0){
                                this.userRerankers[reranker.name] = rerankerResults.telemetrySignal;
                            }
                        }

                    }

                    CliqzUtils.log(json.result ? json.result.length : 0,"CliqzAutocomplete.cliqzResultFetcher");

                    results = json.result || [];

                    this.cliqzResultsExtra = [];

                    if(json.images && json.images.results && json.images.results.length >0){
                        var imgs = json.images.results.filter(function(r){
                            //ignore empty results
                            return Object.keys(r).length != 0;
                        });

                        this.cliqzResultsExtra =imgs.map(Result.cliqzExtra);
                    }

                    var hasExtra = function(el){
                        if(!el || !el.results || el.results.length == 0) return false;
                        el.results = el.results.filter(function(r){
                            //ignore empty results
                            return r.hasOwnProperty('url');
                        });

                        return el.results.length != 0;
                    };

                    if(hasExtra(json.extra)) {
                        this.cliqzResultsExtra = json.extra.results.map(Result.cliqzExtra);
                    }
                    this.latency.cliqz = json.duration;

                    this.cliqzResults = results.filter(function(r){
                        // filter results with no or empty url
                        return r.url != undefined && r.url != '';
                    });

                    this.cliqzResultsParams = {
                      choice: json.choice,
                    };
                }
                this.pushResults(q);
            },
            createFavicoUrl: function(url){
                return 'http://cdnfavicons.cliqz.com/' +
                        url.replace('http://','').replace('https://','').split('/')[0];
            },
            // mixes backend results, entity zones, history and custom results
            mixResults: function(only_instant) {

                // set first history entry as autocompleted if it was
                if(this.instant.length > 0 &&
                   CliqzAutocomplete.lastAutocompleteActive && !only_instant) {
                  this.instant[0].autocompleted = true;
                }

                var results = Mixer.mix(
                            this.searchString,
                            this.cliqzResults,
                            this.cliqzResultsExtra,
                            this.instant,
                            this.customResults,
                            only_instant
                    );
                CliqzAutocomplete.lastResultIsInstant = only_instant;
                CliqzAutocomplete.afterQueryCount = 0;

                this.mixedResults.setResults(results);
            },
            analyzeQuery: function(q){
                var parts = CliqzResultProviders.getCustomResults(q);
                this.customResults = parts[1];
                return parts[0];
            },
            //FF entry point
            //TODO: to be moved to Environment!
            startSearch: function(searchString, searchParam, previousResult, listener){
                this.search(searchString, function(results, ctx){
                    listener.onSearchResult(ctx, results);
                })
            },
            search: function(searchString, callback) {

                CliqzAutocomplete.lastQueryTime = Date.now();
                CliqzAutocomplete.lastDisplayTime = null;
                CliqzAutocomplete.lastResult = null;
                CliqzAutocomplete.lastSuggestions = null;
                this.oldPushLength = 0;
                this.customResults = null;
                this.latency = {
                    cliqz: null,
                    history: null,
                    backend: null,
                    mixed: null,
                    all: null
                };
                this.userRerankers = {};

                CliqzUtils.log('search: ' + searchString, CliqzAutocomplete.LOG_KEY);

                var invalidQ = isQinvalid(searchString.trim()),
                    action = {
                        type: 'activity',
                        action: 'key_stroke',
                        current_length: searchString.length,
                        invalid: invalidQ
                    };
                CliqzUtils.telemetry(action);

                if(invalidQ) {
                    //we call the callback with no results to trigger a dropdown close
                    callback(null, this)
                    return;
                }

                if(CliqzAutocomplete.lastSearch.length > searchString.length) {
                  CliqzAutocomplete.spellCorr.override = true;
                }
                // analyse and modify query for custom results
                CliqzAutocomplete.lastSearch = searchString;
                searchString = this.analyzeQuery(searchString);

                // spell correction
                var urlbar = CliqzUtils.getWindow().document.getElementById('urlbar');
                if (urlbar && //we do not have urlbar on mobile TODO - fix it better!
                    !CliqzAutocomplete.spellCorr.override &&
                    urlbar.selectionEnd == urlbar.selectionStart &&
                    urlbar.selectionEnd == urlbar.value.length) {
                    var parts = CliqzSpellCheck.check(searchString);
                    var newSearchString = parts[0];
                    var correctBack = parts[1];

                    for (var c in correctBack) {
                        CliqzAutocomplete.spellCorr.correctBack[c] = correctBack[c];
                    }

                } else {
                    // user don't want spell correction
                    var newSearchString = searchString;
                }
                this.wrongSearchString = searchString;
                if (newSearchString != searchString) {
                    // the local spell checker kicks in
                    var action = {
                        type: 'activity',
                        action: 'spell_correction',
                        current_length: searchString.length
                    }
                    CliqzUtils.telemetry(action);
                    CliqzAutocomplete.spellCorr.on = true;
                    searchString = newSearchString;
                    CliqzAutocomplete.spellCorr['userConfirmed'] = false;
                }

                this.cliqzResults = null;
                this.cliqzResultsExtra = null;
                this.cliqzResultsParams = { };
                this.cliqzCache = null;
                this.historyResults = null;
                this.instant = [];

                this.callback = callback;
                this.searchString = searchString;
                this.searchStringSuggest = null;

                this.mixedResults = new CliqzAutocomplete.ProviderAutoCompleteResultCliqz(
                        this.searchString,
                        Components.interfaces.nsIAutoCompleteResult.RESULT_SUCCESS,
                        -2, // blocks autocomplete
                        '');

                this.startTime = Date.now();
                this.mixedResults.suggestionsRecieved = false;
                // ensure context
                this.cliqzResultFetcher = this.cliqzResultFetcher.bind(this);
                this.pushResults = this.pushResults.bind(this);
                this.historyTimeoutCallback = this.historyTimeoutCallback.bind(this);
                this.pushTimeoutCallback = this.pushTimeoutCallback.bind(this);
                this.historyPatternCallback = this.historyPatternCallback.bind(this);
                this.createInstantResultCallback = this.createInstantResultCallback.bind(this);

                CliqzHistoryCluster.historyCallback = this.historyPatternCallback;

                if(searchString.trim().length){
                    // start fetching results
                    CliqzUtils.getCliqzResults(searchString, this.cliqzResultFetcher);

                    // if spell correction, no suggestions
                    if (CliqzAutocomplete.spellCorr.on && !CliqzAutocomplete.spellCorr.override) {
                        this.suggestionsRecieved = true;
                        // change the wrong string to the real wrong string
                        for (var p in CliqzAutocomplete.spellCorr.correctBack) {
                            if (this.wrongSearchString.indexOf(CliqzAutocomplete.spellCorr.correctBack[p]) == -1) {
                                this.wrongSearchString = this.wrongSearchString.replace(p, CliqzAutocomplete.spellCorr.correctBack[p]);
                            }
                        }
                        this.cliqzSuggestions = [searchString, this.wrongSearchString];
                        CliqzAutocomplete.lastSuggestions = this.cliqzSuggestions;
                        CliqzUtils.log(CliqzAutocomplete.lastSuggestions, 'spellcorr');

                        //TODO: extract spell corrector out of CliqzAutocomplete
                        if(urlbar)urlbar.mInputField.value = searchString;
                    } else {
                        //CliqzUtils.getSuggestions(searchString, this.cliqzSuggestionFetcher);
                    }
                    CliqzUtils.clearTimeout(this.resultsTimer);
                    this.resultsTimer = CliqzUtils.setTimeout(this.pushTimeoutCallback, CliqzAutocomplete.TIMEOUT, this.searchString);
                } else {
                    this.cliqzResults = [];
                    this.cliqzResultsExtra = [];
                    this.customResults = [];
                    CliqzAutocomplete.resetSpellCorr();
                }

                // trigger history search
                CLIQZEnvironment.historySearch(
                    searchString,
                    this.onHistoryDone.bind(this),
                    CliqzAutocomplete.sessionStart);

                CliqzUtils.clearTimeout(this.historyTimer);
                this.historyTimer = CliqzUtils.setTimeout(this.historyTimeoutCallback, CliqzAutocomplete.HISTORY_TIMEOUT, this.searchString);
                this.historyTimeout = false;
            },
            /**
            * Stops an asynchronous search that is in progress
            */
            stopSearch: function() {
                CliqzUtils.clearTimeout(this.resultsTimer);
                CliqzUtils.clearTimeout(this.historyTimer);
            },

            sendResultsSignal: function(obj, instant) {
                var results = obj.mixedResults._results;
                var action = {
                    type: 'activity',
                    action: 'results',
                    query_length: CliqzAutocomplete.lastSearch.length,
                    result_order: CliqzAutocomplete.prepareResultOrder(results),
                    instant: instant,
                    popup: CliqzAutocomplete.isPopupOpen ? true : false,
                    latency_cliqz: obj.latency.cliqz,
                    latency_history: obj.historyTimeout ? null : obj.latency.history,
                    latency_patterns: obj.latency.patterns,
                    latency_backend: obj.latency.backend,
                    latency_mixed: obj.latency.mixed,
                    latency_all: obj.startTime? Date.now() - obj.startTime : null,
                    discarded: obj.discardedResults,
                    user_rerankers: obj.userRerankers,
                    backend_params: obj.cliqzResultsParams,
                    v: 1
                };

                // reset count of discarded backend results
                obj.discardedResults = 0;

                if (CliqzAutocomplete.lastAutocompleteActive) {
                  action.autocompleted = CliqzAutocomplete.lastAutocompleteActive;
                  action.autocompleted_length = CliqzAutocomplete.lastAutocompleteLength;
                }

                if (action.result_order.indexOf('C') > -1 && CliqzUtils.getPref('logCluster', false)) {
                    action.Ctype = CliqzUtils.getClusteringDomain(results[0].val);
                }

                if (CliqzAutocomplete.isPopupOpen) {
                    // don't mark as done if popup closed as the user does not see anything
                    CliqzAutocomplete.markResultsDone(Date.now());
                }

                // remembers if the popup was open for last result
                CliqzAutocomplete.lastPopupOpen = CliqzAutocomplete.isPopupOpen;
                if (results.length > 0) {
                    CliqzAutocomplete.lastDisplayTime = Date.now();
                }
                CliqzUtils.telemetry(action);
            },

            // Wrap up after a completed search
            fullWrapup: function(obj) {
                obj.sendResultsSignal(obj, false);

                obj.startTime = null;
                CliqzUtils.clearTimeout(obj.resultsTimer);
                CliqzUtils.clearTimeout(obj.historyTimer);
                obj.resultsTimer = null;
                obj.historyTimer = null;
                obj.cliqzResults = null;
                obj.cliqzResultsExtra = null;
                obj.cliqzCache = null;
                obj.historyResults = null;
                obj.instant = [];
            },

            // Wrap up after instant results are shown
            instantWrapup: function(obj) {
                obj.sendResultsSignal(obj, true);
            }
        }
    }
};

CliqzAutocomplete.initProvider();
CliqzAutocomplete.initResults();
; ctx[EXPORTED_SYMBOLS[0]] = CliqzAutocomplete;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzAutocomplete


// start module CliqzCalculator
(function(ctx,Q,E){
'use strict';
/*
 * This module handles various calculations
 *
 */

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/Result.jsm');
Components.utils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript('chrome://cliqzmodules/content/extern/math.min.js', this);
var mathLib = math || this.math;

// REF:
//      http://mathjs.org/docs/index.html
//      http://stackoverflow.com/questions/26603795/variable-name-and-restrict-operators-in-math-js
//      http://jsbin.com/duduru/1/edit?html,output

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var EXPORTED_SYMBOLS = ['CliqzCalculator'];
var BROWSER_LANG = CliqzUtils.getLocalizedString('locale_lang_code');

function getEqualOperator(val, localizedStr){
  var valStr = val.toString().replace(",","").replace(".",""),
    normLocalizedStr = localizedStr.replace(",","").replace(".","");
  return valStr === normLocalizedStr ? "=" : "\u2248";
}

var CliqzCalculator = {
  CALCULATOR_RES: 0,
  UNIT_RES: '',
  IS_UNIT_CONVERTER: false,
  BASE_UNIT_CONVERTER: '',
  FLOAT_DEC: [100000, 100, 1],
  FLOAT_DEC_THRESHOLD: [99, 99999],
  ACCEPT_ERROR: 1e-8,
  UNIT_CONVERSION_DATA: {  // http://en.wikipedia.org/wiki/Conversion_of_units
    // http://www.convert-me.com/en/convert/length/
    'LOCALIZE_KEYS': {'de-DE': 'names_de', 'en-US': 'names_en', 'default': 'names_de'},
    'types': ['length', 'mass'],
    'length': {
      'base': 'm',
      'units': [
        {'val': 4828, 'names': ['lea', 'leuge', 'league', 'leagues']},
        {'val': 0.3048006096012192, // this is US foot, there're IDIAN, CLA, BEN,...
          'names': ['ft', 'foot', 'feet', 'fu\u00DF'],
          'names_en': {'s': 'foot', 'p': 'feet'},
          'names_de': {'s': 'fu\u00DF', 'p': 'fu\u00DF'}},
        {'val': 0.0254, 'names': ['in', 'inch', 'inches', 'zoll']},
        {'val': 1000, 'names': ['km', 'kilometer', 'kilometre', 'kilometres', 'kilometers']},
        {'val': 1, 'names': ['m', 'meter', 'metre', 'metres', 'meters']},
        {'val': 0.1, 'names': ['dm', 'decimeter', 'decimetre', 'decimeters', 'decimetres', 'dezimeter']},
        {'val': 0.01, 'names': ['cm', 'centimeter', 'centimetre', 'centimetres', 'centimeters', 'zentimeter']},
        {'val': 0.001, 'names': ['mm', 'millimeter', 'millimetre', 'millimetres', 'millimeters']},
        {'val': 1e-6, 'names': ['micron', 'micrometer', 'micrometre', 'micrometres', 'micrometers', 'mikrometer']},
        {'val': 1e-9, 'names': ['nm', 'nanometre', 'nanometre', 'nanometer', 'nanometers']},
        {'val': 10000, 'names': ['mil']},  // this is Sweden and Norway unit
        {'val': 1609.344,
          'names': ['mil.', 'mi.', 'mile', 'miles', 'meile', 'meilen'],
          'names_en': {'s': 'mile', 'p': 'miles'},
          'names_de': {'s': 'meile', 'p': 'meilen'}},
        {'val': 201.168, 'names': ['furlong', 'furlongs']},
        {'val': 0.9144, 'names': ['yd', 'yard', 'yards']},
        {'val': 2.54 * 1e-5, 'names': ['thou']},
        {'val': 1.8288, 'names': ['fm', 'fathom', 'fathoms', 'faden', 'f\u00E4den']},
        {'val': 5.0292, 'names': ['rd', 'rod', 'rods', 'rute', 'ruten']},
        {'val': 0.1016, 'names': ['hand', 'hands', 'handbreit']},
        {'val': 0.2286, 'names': ['span', 'spans', 'spanne', 'spannen']},
        {'val': 5556, 'names': ['naut.leag', 'nautical league', 'naut.leags', 'nautical league']},
        {'val': 1852, 'names': ['naut.mil', 'naut.mils', 'nautical mile', 'nautical miles', 'naut.meile', 'naut.meilen', 'nautische meile', 'nautische meilen']},
        {'val': 1852.216, 'names': ['sm', 'Seemeile']},
        {'val': 185.2, 'names': ['cbl', 'cable length', "cable'slength", 'Kabel', 'Kabellänge']}
      ]
    },
    'mass': {
      "base": 'g',
      'units': [
        {'val': 102, 'names': ['kN', 'kn', 'kilonewton', 'kilonewtons']},
        {'val': 1e9, 'names': ['kt', 'kilotonne', 'kilotonnes', 'kilotonnen']},
        {'val': 1e6, 'names': ['t', 'tonne', 'tonnes', 'tonnen', 'metric ton', 'metric tons']},
        {'val': 1e6, 'names': ['Mg', 'megagram', 'megagrams']},
        {'val': 1000, 'names': ['kg', 'kilogram', 'kilograms', 'kilogramme', 'kilogrammes', 'kilogramm', 'kilogramms']},
        {'val': 100, 'names': ['hg', 'hectogram', 'hectograms', 'hectogramme', 'hectogrammes', 'hectogramm', 'hectogramms']},
        {'val': 10, 'names': ['dag', 'decagram', 'decagrams', 'decagramme', 'decagrammes', 'decagramm', 'decagramms']},
        {'val': 1, 'names': ['g', 'gram', 'grams', 'gramme', 'grammes', 'gramm', 'gramms']},
        {'val': 0.1, 'names': ['dg', 'decigram', 'decigrams', 'decigramme', 'decigrammes', 'decigramm', 'decigramms']},
        {'val': 0.01, 'names': ['cg', 'centigram', 'centigrams', 'centigramme', 'centigrammes', 'centigramm', 'centigramms']},
        {'val': 0.001, 'names': ['mg', 'milligram', 'milligrams', 'milligramme', 'milligrammes', 'milligramm', 'milligramms']},
        {'val': 0.000001, 'names': ['mcg', 'microgram', 'micrograms', 'microgramme', 'microgrammes', 'microgramm', 'microgramms']},
        {'val': 453.59237, 'names': ['lb', 'lbs', 'pound', 'pounds', 'pound-mass', 'pfund']},
        {'val': 28.349523125, 'names': ['oz', 'ozs', 'ounce ', 'ounces', 'unze', 'unzen']},
        {'val': 1.7718452, 'names': ['dr', 'dram', 'drams']},
        {'val': 0.06479891, 'names': ['gr', 'grain', 'grains', 'Gran']}
      ]
    }
  },
  shortenNumber: function(){
    // shorten numbers when needed
    try {
      var numRaw, num, num1, floatDec = 1, resultSign = "";

      num1 = this.CALCULATOR_RES;

      for (var i = 0; i < this.FLOAT_DEC_THRESHOLD.length; i++) {
        if (Math.abs(num1) < this.FLOAT_DEC_THRESHOLD[i]) {
          floatDec = this.FLOAT_DEC[i];
          break;
        }
      }
      numRaw = Math.round(num1 * floatDec) / floatDec;
      num = numRaw.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code'));
      resultSign = getEqualOperator(num1, num);

      this.CALCULATOR_RES = this.IS_UNIT_CONVERTER ? [num, this.UNIT_RES].join(" ") : num.toString();
      return [resultSign, this.CALCULATOR_RES]
    } catch (err) {}
    return null
  },
  clean: function(q) {
    if (!isNaN(q)) {
      return ''; // Don't trigger calculator yet if the query is just a number
    }
    var operators = ['+', '-', '*', '/', '^', '='];
    q = q.replace(/(\d),(\d)/g, '$1.$2'); // commas are separators to german ppl
    q = q.replace(/ /g, ''); // Remove all spaces
    for (var i = 0; i < operators.length; i++) {
      if (q[q.length - 1] == operators[i]) {
        return q.substr(0, q.length-1); // Remove the last operator
      }
    }
    return q;
  },
  calculate: function(q) {
    if (this.CALCULATOR_RES === null || this.CALCULATOR_RES === q) {
      return null;
    }
    var expandedExpression = this.IS_UNIT_CONVERTER ? this.BASE_UNIT_CONVERTER : mathLib.parse(this.clean(q)).toString(),
      resultSign = this.shortenNumber()[0];

    return Result.cliqzExtra(
      {
        url: "",
        q: q,
        style: "cliqz-extra",
        type: "cliqz-extra",
        subType: JSON.stringify({type: 'calculator'}),
        data: {
          template: 'calculator',
          expression: expandedExpression,
          answer: this.CALCULATOR_RES,
          is_calculus: true,
          // TODO: support_copy_ans should be platform specific
          support_copy_ans: true
        }
      }
    );
  },

  find_unit_in_data: function(unit_) {
    var self = this,
      unit = unit_.toLowerCase(),
      unitFound = null;

    self.UNIT_CONVERSION_DATA.types.some(function(type) {
      return self.UNIT_CONVERSION_DATA[type].units.some(function(item) {
        if (item['names'].indexOf(unit) > -1 || item['names'].indexOf(unit_) > -1) {
          unitFound = [type, true, item];
          return true;
        }
        return false;
      });
    });
    return unitFound || ["", false, null];
  },

  selectUnitTerms: function(unit_data, val) {
    /*
     *   + based on the value and the language preference, select unit name in suitable language and form (singular/plural)
     */
    var noun_type = val === 1 ? 's' : 'p',
      nameInfo = unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS[BROWSER_LANG]]
                  || unit_data[CliqzCalculator.UNIT_CONVERSION_DATA.LOCALIZE_KEYS['default']]
                  || unit_data['names'],
      name = nameInfo[noun_type];

    return name || unit_data['names']['0'] || "";
  },

  isConverterSearch: function(q) {
    // --- Process query to recognize a unit-conversion query
    // ACCEPTED query types:
    //    1. a to b, e.g. cm to mm
    var tmp = q.trim(),
      paramList, unit1, unit2, idx, num, unit1Info;
    // Note: don't use regex match in replace function, e.g. tmp.replace(/ zu | in | im /g, ' to ')
    tmp = q.replace(' zu ', ' to ');
    tmp = tmp.replace(' im ', ' to ');
    tmp = tmp.replace(' in ', ' to ');
    tmp = tmp.replace(' into ', ' to ');  // this needs to be at the end
    paramList = tmp.trim().split(' to ');

    if (paramList.length !== 2)
      return false;
    unit2 = this.find_unit_in_data(paramList[1].trim());
    if (unit2[1]) {
      unit1 = paramList[0].replace(' ', '') + ' ';
      idx = 0;
      while (unit1[idx] === ',' || unit1[idx] === '.' || (unit1[idx] >= '0' && unit1[idx] <= '9'))
        idx++;
      if (idx === 0) {
        num = 1
      } else {
        num = Number(unit1.slice(0, idx));
        if (isNaN(num)) {
          return false
        }
      }

      unit1 = unit1.slice(idx, unit1.length).trim();
      unit1Info = this.find_unit_in_data(unit1);
      if (!unit1Info[1] || unit1Info[0] !== unit2[0]) {
        return false
      }  // if not unit of the same type, e.g. 1km to g should not return result

      this.IS_UNIT_CONVERTER = true;
      var cvRaw = unit1Info[2].val / unit2[2].val,
        cv = cvRaw.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code'));
      this.CALCULATOR_RES = num * cvRaw;
      this.UNIT_RES = CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES);
      this.BASE_UNIT_CONVERTER = [
        '1',
        CliqzCalculator.selectUnitTerms(unit1Info[2], 1),
        getEqualOperator(cvRaw, cv),
        cv,
        CliqzCalculator.selectUnitTerms(unit2[2], this.CALCULATOR_RES, cvRaw)
      ].join(" ");

      return true
    }
    else {
      return false
    }
  },

  isCalculatorSearch: function(q) {
    // filter out:
    // + too short query (avoid answering e, pi)
    // + automatically convert queries like '10cm
    var tmp = this.clean(q)
    if (tmp.length <= 2 || tmp.length > 150) {
      return false;
    }

    try {
      this.CALCULATOR_RES = mathLib.eval(tmp);

      if (typeof(this.CALCULATOR_RES) === 'number') {
        this.IS_UNIT_CONVERTER = false;
        return true
      }
    }
    catch (err) {
    }

    return this.isConverterSearch(q);
  }
};
; ctx[EXPORTED_SYMBOLS[0]] = CliqzCalculator;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzCalculator


// start module CliqzEvents
(function(ctx,Q,E){
'use strict';
/*
 * This method implements the publish subscribe design pattern
 *
 * Event naming scheme:
 *    cliqz.module_name.event_name
 *
 *  single sender -> multiple potential recipients
 *    for example: cliqz.core.urlbar_focus (inform others about urlbar focus)
 *    module_name describes sender
 *  multiple potential senders -> single recipient
 *    for example: cliqz.msg_center.show_message (tell the message center to show a message)
 *    module_name describes recipient (this is more like a RPC)
 */

var EXPORTED_SYMBOLS = ['CliqzEvents'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

var CliqzEvents = CliqzEvents || {
  //use a javascript object to push the message ids and the callbacks
  cache: {},
  /*
   * Publish events of interest with a specific id
   */
  pub: function (id) {
    var args = Array.prototype.slice.call(arguments, 1);
    (CliqzEvents.cache[id] || []).forEach(function (ev) {
      CliqzUtils.setTimeout(function () {
        try {
          ev.apply(null, args);
        } catch(e) {
          CliqzUtils.log(e.toString()+" -- "+e.stack, "CliqzEvents error: "+id);
        }
      }, 0);
    });
  },

  /* Subscribe to events of interest
   * with a specific id and a callback
   * to be executed when the event is observed
   */
  sub: function (id, fn) {
    CliqzEvents.cache[id] = CliqzEvents.cache[id] || [];
    CliqzEvents.cache[id].push(fn);
  },

  un_sub: function (id, fn) {
    var index;
    if (!CliqzEvents.cache[id]) {
      return;
    }
    if (!fn) {
      CliqzEvents.cache[id] = [];
    } else {
      index = CliqzEvents.cache[id].indexOf(fn);
      if (index > -1) {
        CliqzEvents.cache[id].splice(index, 1);
      }
    }
  },

  nextId: function nextId() {
    nextId.id = nextId.id || 0;
    nextId.id += 1;
    return nextId.id;
  }
};
; ctx[EXPORTED_SYMBOLS[0]] = CliqzEvents;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzEvents


// start module CliqzHandlebars
(function(ctx,Q,E){
'use strict';

/*
    handlebars wrapper which adds all the needed helpers
*/

var EXPORTED_SYMBOLS = ['CliqzHandlebars'];
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');


Components.utils.import("resource://gre/modules/Services.jsm");
Services.scriptloader.loadSubScript('chrome://cliqz/content/bower_components/handlebars/handlebars.js', this);
Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzUtils.jsm');
Components.utils.import('chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var CliqzHandlebars = Handlebars || this.Handlebars;

var TEMPLATES = CLIQZEnvironment.TEMPLATES,
    MESSAGE_TEMPLATES = CLIQZEnvironment.MESSAGE_TEMPLATES || [],
    PARTIALS = CLIQZEnvironment.PARTIALS,
    AGO_CEILINGS = [
        [0            , '',1],
        [120          , 'ago1Minute' , 1],
        [3600         , 'agoXMinutes'   , 60],
        [7200         , 'ago1Hour' , 1],
        [86400        , 'agoXHours'   , 3600],
        [172800       , 'agoYesterday'          , 1],
        [604800       , 'agoXDays'     , 86400],
        [4838400      , 'ago1Month'  , 1],
        [29030400     , 'agoXMonths'   , 2419200],
        [58060800     , 'ago1year'   , 1],
        [2903040000   , 'agoXYears'     , 29030400]
    ],
    ZERO_CLICK_INFO_PRIO = [["Phone", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/phone.svg"],
                            ["BIC", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/BIC.svg"],
                            ["E-Mail", "http://cdn.cliqz.com/extension/EZ/generic/zeroclick/emaill.svg"]
                           ];



CliqzHandlebars.tplCache = {};

/* Needed by the view layer */
CliqzHandlebars.TEMPLATES = TEMPLATES;
CliqzHandlebars.MESSAGE_TEMPLATES = MESSAGE_TEMPLATES;
CliqzHandlebars.PARTIALS = PARTIALS;

compileTemplates();
registerHelpers();
function compileTemplates(){
    Object.keys(TEMPLATES).forEach(fetchTemplate);
    MESSAGE_TEMPLATES.forEach(fetchTemplate);
    PARTIALS.forEach(function(tName){ fetchTemplate(tName, true); });
}

function fetchTemplate(tName, isPartial) {
    try {
        CliqzUtils.httpGet(CliqzUtils.TEMPLATES_PATH + tName + '.tpl', function(res){
            if(isPartial === true) {
              Handlebars.registerPartial(tName, res.response);
              CliqzHandlebars.tplCache[tName] = Handlebars.compile(res.response);
            }
            else
                CliqzHandlebars.tplCache[tName] = Handlebars.compile(res.response);
        });
    } catch(e){
        CliqzUtils.log('ERROR loading template ' + tName);
    }
}


function registerHelpers(){
    Handlebars.registerHelper('partial', function(name, options) {
        var template = CliqzHandlebars.tplCache[name] || CliqzHandlebars.tplCache["partials/"+name] || CliqzHandlebars.tplCache.empty;
        return new Handlebars.SafeString(template(this));
    });

    Handlebars.registerHelper('get_array_element', function(arr, idx, subelement) {
      if (typeof(subelement) == undefined)
        return arr && arr[idx];
      else
        return arr && arr[idx] && arr[idx][subelement];
    });

    Handlebars.registerHelper('agoline', function(ts, options) {
        if(!ts) return '';
        var now = (new Date().getTime() / 1000),
            seconds = parseInt(now - ts),
            i=0, slot;

        while (slot = AGO_CEILINGS[i++])
            if (seconds < slot[0])
                return CliqzUtils.getLocalizedString(slot[1], parseInt(seconds / slot[2]))
        return '';
    });

    Handlebars.registerHelper('sec_to_duration', function(seconds) {
        if(!seconds)return null;
        try {
            var s = parseInt(seconds);
            return Math.floor(s/60) + ':' + ("0" + (s%60)).slice(-2);
        } catch(e) {
            return null;
        }
    });

    Handlebars.registerHelper('distance', function(meters) {
        if(meters < 1000) {
            return meters.toFixed(0) + " m";
        }
        return (meters/1000).toFixed(1) + " km";
    });

    Handlebars.registerHelper('shopping_stars_width', function(rating) {
        return rating * 14;
    });

    Handlebars.registerHelper('even', function(value, options) {
        if (value%2) {
            return options.fn(this);
        } else {
            return options.inverse(this);
        }
    });

    Handlebars.registerHelper('local', function(key) {
        var args = Array.prototype.slice.call(arguments);
        var name = args.shift();
        return CliqzUtils.getLocalizedString.apply(null, [name, args]);
    });

    Handlebars.registerHelper('views_helper', function(val) {
        if(!val || val == '-1')return '';

        try {
            return parseFloat(val).toLocaleString() + ' ' + CliqzUtils.getLocalizedString('views');
        } catch(e) {
            return ''
        }
    });

    Handlebars.registerHelper('wikiEZ_height', function(data_richData){
        if (data_richData && data_richData.hasOwnProperty('images') && data_richData.images.length > 0){
            if ( (this.type === 'cliqz-extra') || (this.data === CliqzAutocomplete.lastResult._results[0].data))  // is the first result in the show list
                return 'cqz-result-h2';
            // BM hq result, but not the 1st result -> remove images
            data_richData.images = [];
        }

        return 'cqz-result-h3';
    });

    Handlebars.registerHelper('recipe_rd_template', function(data_richData) {
        var minimalData = data_richData
                          && typeof(data_richData["cook_time"]) !== "undefined"
                          && typeof(data_richData["numportion"]) !== "undefined"
                          && typeof(data_richData["total_review"]) !== "undefined";

        // is the only result in the show list
        return (CliqzAutocomplete.lastResult._results.length === 1 && minimalData);
    });

    Handlebars.registerHelper('cpgame_movie_rd_template', function(data_richData) {
        if(!CliqzAutocomplete.lastResult) return false;

        var minimalData_pcgame = data_richData && ((typeof(data_richData["image"]) !== "undefined" ) || (typeof(data_richData["game_cat"]) !== "undefined" && typeof(data_richData["rating"]) !== "undefined" && typeof(data_richData["categories"]) !== "undefined" ));
        var minimalData_movie = data_richData && ((typeof(data_richData["image"]) !== "undefined" ) || (data_richData["director"] && data_richData["director"]["title"]) || (data_richData["length"] &&  data_richData["length"] !== "_") || (data_richData["categories"]));

        return (CliqzAutocomplete.lastResult._results.length == 1 && (minimalData_pcgame || minimalData_movie)); // is the only result in the show list
    });

    Handlebars.registerHelper('image_rd_specification', function(richData){
        return richData['superType'] === "movie" ? "50px" : "76px";
    });

    Handlebars.registerHelper('localizeNumbers', function(num) {
        /*
        * USE only when you really understand your data (see below)!
        * this function supports localization for:
        *   + normal number strings (e.g. 1.2, 3...),
        *   + standardized abrv. strings: 12e-4, and
        *   + extended forms, e.g. 1.2B, 1M etc.
        * In general, any string in the form of xxxyyy where xxx is a standardized number string (recognized by isFinite())
        * and yyy is an arbitrary string (called postfix) that does not start with a number will be localized
        * WARNING: numbers in the form such as: 12e3M, which might be seen as 12000 Million, will be parsed incorrectly
        */
        try {
            var parsedNum = parseFloat(num), postfix, dummy = "-";
            if (!isNaN(parsedNum) && isFinite(parsedNum)) {
                postfix = isFinite(num) ? "" : (num + "").substring((parsedNum + "").length);
                return parsedNum.toLocaleString(CliqzUtils.getLocalizedString('locale_lang_code')) + postfix;
            }
            return dummy;
        }
        catch(e) {
            return num
        }
    });

    Handlebars.registerHelper('limit', function(idx, max_idx){
        return idx < max_idx;
    });

    Handlebars.registerHelper('json', function(value, options) {
        return JSON.stringify(value);
    });

    Handlebars.registerHelper('log', function(value, key) {
        CliqzUtils.log(value, 'TEMPLATE LOG HELPER');
    });

    Handlebars.registerHelper('toLowerCase', function(str) {
       return str.toLowerCase();
    });

    Handlebars.registerHelper('toUpperCase', function(str) {
       return str.toUpperCase();
    });

    Handlebars.registerHelper('emphasis', function(text, q, minQueryLength, cleanControlChars) {
        // lucian: questionable solution performance wise
        // strip out all the control chars
        // eg :text = "... \u001a"
        if(!q) return text;
        q = q.trim();
        if(text && cleanControlChars) text = text.replace(/[\u0000-\u001F]/g, ' ')

        if(!text || !q || q.length < (minQueryLength || 2)) return text;

        var map = Array(text.length),
            tokens = q.toLowerCase().split(/\s+|\.+/).filter(function(t){ return t && t.length>1; }),
            lowerText = text.toLowerCase(),
            out, high = false;

        tokens.forEach(function(token){
            var poz = lowerText.indexOf(token);
            while(poz !== -1){
                for(var i=poz; i<poz+token.length; i++)
                    map[i] = true;
                poz = lowerText.indexOf(token, poz+1);
            }
        });
        out=[];
        var current = ''
        for(var i=0; i<text.length; i++){
            if(map[i] && !high){
                out.push(current);
                current='';
                current += text[i];
                high = true;
            }
            else if(!map[i] && high){
                out.push(current);
                current='';
                current +=text[i];
                high = false;
            }
            else current += text[i];
        }
        out.push(current);

        return new Handlebars.SafeString(CliqzHandlebars.tplCache.emphasis(out));
    });

    Handlebars.registerHelper('hasimage', function(image) {
        if(image && image.src &&
            !(image.src.indexOf('xing') !== -1 && image.src.indexOf('nobody_') !==-1))
            return true;
        else
            return false
    });

    Handlebars.registerHelper('date', function(_date) {
        var d = new Date(_date);
        var date = d.getDate();
        var month = d.getMonth();
        month++;
        var year = d.getFullYear();
        var formatedDate = date + '/' + month + '/' + year;
        return formatedDate;
    });

    Handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
        lvalue = parseFloat(lvalue);
        rvalue = parseFloat(rvalue);

        switch(operator) {
            case "+": return lvalue + rvalue;
            case "-": return lvalue - rvalue;
            case "*": return lvalue * rvalue;
            case "/": return lvalue / rvalue;
            case "%": return lvalue % rvalue;
        }
    });

    Handlebars.registerHelper("logic", function(lvalue, operator, rvalue, options) {
        switch(operator) {
            case "|":           return lvalue | rvalue;
            case "||":          return lvalue || rvalue;
            case "&":           return lvalue & rvalue;
            case "&&":          return lvalue && rvalue;
            case "^":           return lvalue ^ rvalue;
            case "is":          return lvalue == rvalue;
            case "starts_with": return lvalue.indexOf(rvalue) == 0;
            case "===":         return lvalue === rvalue;
            case "!=":          return lvalue != rvalue;
            case "<":           return lvalue < rvalue;
            case ">":           return lvalue > rvalue;
        }
    });

    Handlebars.registerHelper('is_not_dummy', function(s){
        return s && s!=="_";
    });

    Handlebars.registerHelper('nameify', function(str) {
        if (str.length == 0) return "";
        else return str[0].toUpperCase() + str.slice(1);
    });

    Handlebars.registerHelper('kind_printer', function(kind) {
        //we need to join with semicolon to avoid conflicting with the comma from json objects
        return kind ? kind.join(';'): '';
    });

    Handlebars.registerHelper('links_or_sources', function(richData) {
        return richData ? ((richData.internal_links && richData.internal_links.length > 0) ? richData.internal_links : (richData.additional_sources ? richData.additional_sources : [])) : 0;
    });

    Handlebars.registerHelper('pref', function(key) {
        return CliqzUtils.getPref(key, false);
    });

    Handlebars.registerHelper('repeat', function(num, block) {
      var accum = '';
      for(var i = 0; i < num; i++) {
        accum += block.fn(i);
      }
      return accum;
    });

    /* If conditions on preferences */
    Handlebars.registerHelper('ifpref', function(name, val, options) {
      if (val == undefined)
        return CliqzUtils.getPref(name) ? options.fn(this) : options.inverse(this) ;
      else
        return CliqzUtils.getPref(name) == val ? options.fn(this) : options.inverse(this) ;
    });

    Handlebars.registerHelper('unlesspref', function(name, val, options) {
      if (val == undefined)
        return CliqzUtils.getPref(name) ? options.inverse(this) : options.fn(this);
      else
        return CliqzUtils.getPref(name) == val ? options.inverse(this) : options.fn(this);
    });
    /* End If conditions on preferences */

    Handlebars.registerHelper('zeroclick_prep', function(zeroInfo_raw) {
        var n, name, item, zeroInfo = [];
        for (n = 0; n < ZERO_CLICK_INFO_PRIO.length; n++) {
            item = ZERO_CLICK_INFO_PRIO[n];
            name = item[0];
            if (zeroInfo_raw[name]) {
                zeroInfo.push({
                    'name': name,
                    'val': zeroInfo_raw[name],
                    'img': item[1]
                });
            }
        }
        zeroInfo_raw = zeroInfo;
        return zeroInfo_raw;
    });

    Handlebars.registerHelper('convRateDigitSplit', function (rate) {
        var result = "<span class='cqz-conv-rate'>" +
            rate.substr(0, rate.length - 2) +
            "<span class='cqz-rate-last-digits'>" + rate.substr(-2) + "</span>" +
            "</span>";

        return new Handlebars.SafeString(result);
    });

    Handlebars.registerHelper('numberFormat', function (number) {
        try { //just in case this helper is used on unsanitezed data from backend
          number = parseFloat(number);
          number = number.toFixed(2);
          return parseFloat(number).toLocaleString(CliqzUtils.PREFERRED_LANGUAGE);
        } catch(e){
          return ''
        }
    });


    /* mobile helpers */
    Handlebars.registerHelper("debug", function(optionalValue) {
      console.log("%c Template Data " + this.vertical + " ","color:#fff;background:green",this);
    });


    Handlebars.registerHelper("trimNumbers", function(number) {
      return Math.round(number);
    });


    Handlebars.registerHelper('conversationsTime', function(time) {
        var d = new Date(time);
        var hours = d.getHours();
        hours = hours > 9 ? hours : '0' + hours
        var minutes = d.getMinutes();
        minutes = minutes > 9 ? minutes : '0' + minutes
        var formatedDate = hours + ':' + minutes;
        return formatedDate;
    });

    Handlebars.registerHelper('uriEncode', function(uriComponent) {
        return encodeURIComponent(uriComponent);
    });

    Handlebars.registerHelper('timeOrCalculator', function(ezType) {
        if(ezType=="time") {
          return Handlebars.helpers.local("time");
        } else {
          return Handlebars.helpers.local("calculator");
        }
    });


    Handlebars.registerHelper('ifShowSearch', function(results, options) { // if equal
      if(!results[0] || results[0].data.template !== "noResult") {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });


    Handlebars.registerHelper('mobileWikipediaUrls', function(url) {
        return url.replace("http://de.wikipedia.org/wiki","https://de.m.wikipedia.org/wiki");
    });

    Handlebars.registerHelper('eachIncludeParent', function ( context, options ) {
        var fn = options.fn,
            inverse = options.inverse,
            ret = "",
            _context = [];

        $.each(context, function (index, object) {
            var _object = $.extend({}, object);
            _context.push(_object);
        });

        if ( _context && _context.length > 0 ) {
            for ( var i = 0, j = _context.length; i < j; i++ ) {
                _context[i]["parentContext"] = options.hash.parent;
                ret = ret + fn(_context[i]);
            }
        } else {
            ret = inverse(this);
        }
        return ret;
    });

    Handlebars.registerHelper('conversationsTime', function(time) {
        var d = new Date(time);
        var hours = d.getHours();
        hours = hours > 9 ? hours : '0' + hours
        var minutes = d.getMinutes();
        minutes = minutes > 9 ? minutes : '0' + minutes
        var formatedDate = hours + ':' + minutes;
        return formatedDate;
    });

    Handlebars.registerHelper('sendTelemetry', function(nResults) {
      CliqzUtils.telemetry({
        type: 'Results Rendered',
        nResults: nResults
      });
    });

    Handlebars.registerHelper('generate_background_color', function(url) {
        var urlDetails = CliqzUtils.getDetailsFromUrl(url);
        var logoDetails = CliqzUtils.getLogoDetails(urlDetails);
        return "#" + logoDetails.backgroundColor;
    });
}
; ctx[EXPORTED_SYMBOLS[0]] = CliqzHandlebars;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzHandlebars


// start module CliqzHistoryCluster
(function(ctx,Q,E){
'use strict';

var EXPORTED_SYMBOLS = ['CliqzHistoryCluster'];

var Cc = Components.classes,
    Ci = Components.interfaces,
    Cu = Components.utils;

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/FileUtils.jsm');
Components.utils.import('resource://gre/modules/NetUtil.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

var FF_DEF_FAVICON = 'chrome://mozapps/skin/places/defaultFavicon.png',
    Q_DEF_FAVICON = CLIQZEnvironment.SKIN_PATH + 'defaultFavicon.png';

var CliqzHistoryCluster = {
  historyCallback: null,
  latencies: [],

  // Generate result json from patterns
  _generateResult: function(patterns, query, cluster, baseUrl) {
    if (!patterns) {
      patterns = [];
    }
    return {
      query: query,
      cluster: cluster,
      top_domain: baseUrl || CliqzHistoryCluster._maxDomainShare(patterns)[0],
      results: patterns,
      filteredResults: function() {
        var self = this;
        return this.results.filter(function(r) {
          return r.title && CliqzUtils.getDetailsFromUrl(r.url).name == CliqzUtils.getDetailsFromUrl(self.top_domain).name;
        });
      }
    };
  },
  // This method is triggered when the Firefox history has finished loading
  addFirefoxHistory: function(history) {
    var query = history.query;
    var res;

    // Extract results
    var patterns = [];
    for (var i = 0; i < history.results.length; i++) {
      var parts = CliqzUtils.cleanMozillaActions(history.results[i].value);
      var url = parts[1],
          action = parts[0],
          title = history.results[i].comment;
      // Filters out results with value: "moz-action:searchengine,{"engineName":"Google","input":"awz","searchQuery":"awz"}"
      // that are returned from the unifiedcomplete history provider that is the only provider from Firefox 49.0 on
      if (action === 'searchengine'){
        continue;
      }

      if (!title) {
        title = CliqzUtils.generalizeUrl(url);
      }

      if (title.length > 0 && url.length > 0 &&
          Result.isValid(url, CliqzUtils.getDetailsFromUrl(url))) {

        patterns.push({
          url: url,
          title: title,
          favicon: history.results[i].image,
          _genUrl: CliqzUtils.generalizeUrl(url, true)
        });
      }
    }
    // Process patterns
    res = CliqzHistoryCluster._preparePatterns(patterns, query);
    CliqzHistoryCluster.firefoxHistory = [];
    CliqzHistoryCluster.firefoxHistory.res = res;
    CliqzHistoryCluster.firefoxHistory.query = query;
    CliqzHistoryCluster.historyCallback(res);
  },
  // Process patterns
  _preparePatterns: function(patterns, query) {
    var baseUrl, favicon, orig_query = query;

    query = CliqzUtils.cleanUrlProtocol(query, true).trim();

    // Filter patterns that don't match search
    patterns = CliqzHistoryCluster._filterPatterns(patterns, query.toLowerCase());
    var share = CliqzHistoryCluster._maxDomainShare(patterns);

    // Remove patterns with same url or title
    patterns = CliqzHistoryCluster._removeDuplicates(patterns);

    // Move base domain to top
    var adjustedResults = CliqzHistoryCluster._adjustBaseDomain(patterns, query);
    patterns = adjustedResults[0];
    baseUrl = adjustedResults[1];
    favicon = adjustedResults[2];
    var https = adjustedResults[3];
    var res = CliqzHistoryCluster._generateResult(patterns, orig_query, false, baseUrl);

    // Add base domain if above threshold
    var fRes = res.filteredResults();
    var genQ = CliqzUtils.generalizeUrl(query);
    if (share[1] > 0.5 && fRes.length > 2 &&
       !(CliqzUtils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0 && share[1] < 0.8)) {
      // Check if base domain changed due to filtering
      var tmpBaseUrl = CliqzHistoryCluster._adjustBaseDomain(fRes, query)[1];
      baseUrl = tmpBaseUrl;
      CliqzHistoryCluster._addBaseDomain(patterns, baseUrl, favicon, https);
      res.cluster = true;
    // Threshold not reached or clustering not enabled -> no domain clustering
    } else {
      // Disable domain filtering
      res.filteredResults = function() {
        return this.results;
      };
    }

    // Remove automatically added patterns if they don't match query
    if (patterns && patterns.length > 0 &&
       patterns[0].autoAdd &&
       CliqzUtils.generalizeUrl(patterns[0].url).indexOf(genQ) !== 0) {
      patterns.shift();
      res.cluster = false;
    }

    res.results = CliqzHistoryCluster._removeDuplicates(res.results);
    return res;
  },

  // Calculates the _weighted_ share of the most common domain in given patterns
  _maxDomainShare: function(patterns) {
    var patternCount = patterns.length;
    // boost the first X domain entries (i.e., within boostRange)
    var boostRange = 3;
    // weight for the first X entries, all other entries have weight of 1;
    // this makes the first X entries as important as the remaining (N - X) entries
    var boostFactor = (patternCount - boostRange) / (1 * boostRange);

    // make sure the first results do not become less important, which happens if
    // if there are only very few patterns (i.e, patternCount < boostRange * 2)
    boostFactor = Math.max(1, boostFactor);

    var domains = [];
    var index = 0;
    var cnt = 0;

    for (var key in patterns) {
      var url = patterns[key].url;
      var domaintmp = CliqzUtils.getDetailsFromUrl(url).domain;
      // assign a higher weight to this domain entry if it is one of the first N entries
      var weightedCount = index < boostRange ? boostFactor : 1;
      if (!domains[domaintmp]) {
        domains[domaintmp] = weightedCount;
      } else {
        cnt = 1;
        if (patterns[key].cnt) cnt = patterns[key].cnt;
        domains[domaintmp] += weightedCount;
      }
      index++;
    }
    var max = 0.0;
    cnt = 0.0;
    var domain = null;
    for (key in domains) {
      cnt += domains[key];
      if (domains[key] > max) {
        max = domains[key];
        domain = key;
      }
    }

    return [domain, max / cnt];
  },
  _filterPatterns: function(patterns, full_query) {
    var queries = full_query.trim().split(' ');
    var newPatterns = [];
    for (var key in patterns) {
      var match = true;
      // Check all queries for matches
      for (var wordKey in queries) {
        var titleUrlMatch = false;
        if (patterns[key].url.indexOf(queries[wordKey]) != -1 ||
          ((patterns[key].title || '').toLowerCase().indexOf(queries[wordKey]) != -1)) {
          titleUrlMatch = true;
        }
        var queryMatch = false;
        for (var qkey in patterns[key].query) {
          var q = patterns[key].query[qkey];
          if (q.indexOf(queries[wordKey]) != -1) {
            queryMatch = true;
            break;
          }
        }
        if (!queryMatch && !titleUrlMatch) {
          match = false;
          break;
        }
      }
      if (match) newPatterns.push(patterns[key]);
    }
    return newPatterns;
  },
  // Deduplicate URLs and titles
  _removeDuplicates: function(patterns) {
    var newPatterns;
    newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(patterns, '_genUrl');
    newPatterns = CliqzHistoryCluster._removeDuplicatesByKey(newPatterns, 'title');
    return newPatterns;
  },
  // Deduplicate entries by value of key, with a preference for https and proper titles
  _removeDuplicatesByKey: function(patterns, key) {
    var reorg = {};
    var order = [];

    var value;

    // Pass 1: group similar entries by key
    for (var i = 0; i < patterns.length; i++) {
      value = patterns[i][key];
      if (!reorg.hasOwnProperty(value)) {
        order.push(value);
        reorg[value] = [];
      }
      reorg[value].push(patterns[i]);
    }

    // Pass 2: take the best entry from each group
    // and add to newPatterns in original order.
    var newPatterns = [];
    for (i = 0; i < order.length; i++) {
      value = order[i];

      if (reorg[value].length == 1) {
        newPatterns.push(reorg[value][0]);
        continue;
      }

      // Separate http and https links
      var https = [],
          http = [];
      for (var j = 0; j < reorg[value].length; j++) {
        if (reorg[value][j].url.indexOf('https://') === 0) {
          https.push(reorg[value][j]);
        } else {
          http.push(reorg[value][j]);
        }
      }

      // if any https links, proceed with them only
      var candidates;
      if (https.length > 0)
        candidates = https;
      else
        candidates = http;

      // Pick the one with a "real" title.
      // Some history entries will have a title the same as the URL,
      // don't use these if possible.
      var found = false;
      for (var x = 0; x < candidates.length; x++) {
        if (!(candidates[x].title == candidates[x]._genUrl ||
             candidates[x].title == 'www.' + candidates[x]._genUrl ||
             candidates[x].title == candidates[x].url)) {
          newPatterns.push(candidates[x]);
          found = true;
          break;
        }
      }
      if (!found)
        newPatterns.push(candidates[0]);
    }

    return newPatterns;
  },
  // Search all patterns for matching substring (should be domain)
  _findCommonDomain: function(patterns) {
    if (patterns.length < 2) {
      return null;
    }
    var scores = {};

    for (var key in patterns) {
      var url1 = patterns[key]._genUrl;
      scores[url1] = true;
      for (var key2 in patterns) {
        var url2 = patterns[key2]._genUrl;
        if (key != key2 && url2.indexOf(url1) == -1) {
          scores[url1] = false;
        }
      }
    }

    // Return match with most occurences
    for (var scorekey in scores) {
      if (scores[scorekey] === true) {
        return scorekey;
      }
    }
    return null;
  },
  // Move base domain to top
  _adjustBaseDomain: function(patterns, query) {
    if (patterns.length === 0) {
      return [];
    }
    var basePattern = null, baseUrl = null, favicon = null,
        commonDomain = CliqzHistoryCluster._findCommonDomain(patterns);

    // Check for url matching query
    query = CliqzUtils.generalizeUrl(query, true);
    var key;
    for (key in patterns) {
      var url = patterns[key].url;
      if (url.indexOf(query) === 0) {
        baseUrl = url;
        favicon = patterns[key].favicon;
        break;
      }
    }

    // if none found, use the first entry
    if (!baseUrl) {
      baseUrl = patterns[0]._genUrl;
      favicon = patterns[0].favicon;
    }

    baseUrl = commonDomain || baseUrl.split('/')[0];

    // find if there is an entry matching the base URL.
    var pUrl;
    for (var i = 0; i < patterns.length; i++) {
      pUrl = patterns[i]._genUrl;
      if (baseUrl == pUrl) {
        basePattern = patterns[i];
        break;
      }
    }
    var https = false;
    var newPatterns = [];
    if (basePattern) {
      // found a history entry representing the base pattern,
      // use at the first entry in newPatterns
      basePattern.base = true;
      patterns[0].debug = 'Replaced by base domain';
      newPatterns.push(basePattern);

    } else {
      CliqzUtils.log('Using a base url that did not exist in history list.', 'CliqzHistoryCluster');

      for (key in patterns) {
        // if any pattern uses an https domain, try to use that for
        // base domain too.
        pUrl = patterns[key].url;
        if (pUrl.indexOf('https://') === 0) {
          https = true;
          break;
        }

        // Add https if required
        if (https) {
          // ...but only if there is a history entry with title
          if (CliqzHistoryManager.getPageTitle('https://' + baseUrl)) {
            CliqzUtils.log('found https base URL with title', 'CliqzHistoryCluster');
            // keep https as true
          } else {
            CliqzUtils.log('no https base URL with title, do not change original base URL', 'CliqzHistoryCluster');
            https = false;
          }
        }
      }
    }

    for (key in patterns) {
      // keep everything else except for base, it is already there
      if (patterns[key] != basePattern) newPatterns.push(patterns[key]);
    }
    return [newPatterns, baseUrl, favicon, https];
  },
  // Add base domain of given result to top of patterns, if necessary
  _addBaseDomain: function(patterns, baseUrl, favicon, https) {
    baseUrl = CliqzUtils.generalizeUrl(baseUrl, true);
    // Add base domain entry if there is not one already
    if (patterns && patterns.length > 0 && !patterns[0].base) {
      var title = CliqzUtils.getDetailsFromUrl(baseUrl).domain;
      if (!title) {
        CliqzUtils.log('Failed to add base domain because there is no title: ' + baseUrl, 'CliqzHistoryCluster');
        return;
      }

      CliqzUtils.log('Adding base domain to history cluster: ' + baseUrl, 'CliqzHistoryCluster');

      // Add trailing slash if not there
      var urldetails = CliqzUtils.getDetailsFromUrl(baseUrl);
      if (urldetails.path === '')
        baseUrl = baseUrl + '/';

      patterns.unshift({
        title: title.charAt(0).toUpperCase() + title.split('.')[0].slice(1),
        url: baseUrl,
        favicon: favicon
      });
      patterns[0].autoAdd = true;
    }
  },
  // Autocomplete an urlbar value with the given patterns
  autocompleteTerm: function(urlbar, pattern, loose) {
    var MAX_AUTOCOMPLETE_LENGTH = 80; // max length of autocomplete portion

    function matchQuery(queries) {
      var query = '';
      for (var key in queries) {
        var q = queries[key].toLowerCase();
        if (q.indexOf(input) === 0 && q.length > query.length) {
          query = q;
        }
      }
      return query;
    }
    if (urlbar == 'www.' || urlbar == 'http://' || urlbar.substr(urlbar.indexOf('://') + 3) == 'www.' || urlbar === '')
      return {};

    var url = CliqzUtils.simplifyUrl(pattern.url);
    url = CliqzUtils.generalizeUrl(url, true);
    var input = CliqzUtils.generalizeUrl(urlbar);
    if (urlbar[urlbar.length - 1] == '/') input += '/';

    var autocomplete = false,
      highlight = false,
      selectionStart = 0,
      urlbarCompleted = '';
    var queryMatch = matchQuery(pattern.query);

    // Url
    if (url.indexOf(input) === 0 && url != input &&
       (url.length - input.length) <= MAX_AUTOCOMPLETE_LENGTH) {
      autocomplete = true;
      highlight = true;
      urlbarCompleted = urlbar + url.substring(url.indexOf(input) + input.length);
    }

    if (autocomplete) {
      selectionStart = urlbar.toLowerCase().lastIndexOf(input) + input.length;
    }

    // Adjust url to user protocol
    if (urlbar.indexOf('://') != -1) {
      var prot_user = urlbar.substr(0, urlbar.indexOf('://') + 3);
      var prot_auto = pattern.url.substr(0, pattern.url.indexOf('://') + 3);
      pattern.url = pattern.url.replace(prot_auto, prot_user);
    }

    return {
      url: url,
      full_url: pattern.url,
      autocomplete: autocomplete,
      urlbar: urlbarCompleted,
      selectionStart: selectionStart,
      highlight: highlight
    };
  },

  // Attach a list of URLs to a cluster result
  _attachURLs: function(result, urls, with_favicon) {
    result.data.urls = [];

    for (var i = 0; i < urls.length; i++) {
      var domain = CliqzUtils.generalizeUrl(urls[i].url, true).split('/')[0],
          url = urls[i].url;

      if (url[url.length - 1] == '/') url = url.substring(0, url.length - 1);

      var favicon = with_favicon && (urls[i].favicon == FF_DEF_FAVICON ? Q_DEF_FAVICON : urls[i].favicon),
          cleanUrl = CliqzUtils.cleanUrlProtocol(CliqzUtils.simplifyUrl(url), true);

      result.data.urls.push({
        href: urls[i].url,
        link: cleanUrl,
        domain: cleanUrl.split('/')[0],
        title: urls[i].title,
        extra: 'history-' + i,
        favicon: favicon,
        // logo is only necessary for 3-up mini-history view, this can be removed if that is retired
        logo: CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(urls[i].url)),
        kind: ['H']
      });
      if ((result.data.urls.length > 9 && result.data.template == 'pattern-h1') ||
          (result.data.urls.length > 5 && result.data.template == 'pattern-h2') ||
          (result.data.urls.length > 2 && result.data.template == 'pattern-h3')) {
        break;
      }
    }
  },
  // Creates one (or potentially more) instant results based on history
  createInstantResult: function(res, searchString, callback) {
    var instant_results = [];
    var results = res.filteredResults();
    var promises = [];

    if (results.length === 0 && !res.urls) {
      // no results, so do nothing

    } else if (res.urls) {
      // Rule-based clustering has already been performed, just take the entry as it is
      var instant = Result.generic('cliqz-pattern', res.url, null, res.title, null, searchString, res);
      instant.comment += ' (history rules cluster)';
      // override with any titles we have saved
      //promises.push(CliqzHistoryCluster._getTitle(instant));

      instant.data.template = 'pattern-h2';
      instant.data.cluster = true; // a history cluster based on a destination bet
      instant_results.push(instant);

    } else if (searchString.length === 0) {
      // special case for user request of top sites from history
      var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
      instant.data.title = CliqzUtils.getLocalizedString('history_results_cluster');
      instant.data.url = results[0].url;
      instant.comment += ' (history top sites)!';
      instant.data.template = 'pattern-h1';
      instant.data.generic = true;

      this._attachURLs(instant, results);

      instant_results.push(instant);

    } else if (res.cluster) {
      // domain-based cluster
      var instant = Result.generic('cliqz-pattern', results[0].url, null, results[0].title, null, searchString);
      var title = results[0].title;
      if (!title) {
        title = results[0].url;
        CliqzUtils.log('No title, assigning ' + title, 'CliqzHistoryCluster');
      }
      instant.data.title = title;
      // override with any titles we have saved
      //promises.push(CliqzHistoryCluster._getTitle(instant));

      // get description in case we need it
      //(if this cluster is converted back to simple history)
      //promises.push(CliqzHistoryCluster._getDescription(instant));

      instant.data.url = results[0].url;
      instant.comment += ' (history domain cluster)!';
      instant.data.template = 'pattern-h2';
      instant.data.autoAdd = results[0].autoAdd;
      instant.data.cluster = true; // a history cluster based on a destination bet

      // first entry is used as the main URL of this cluster, remove from remaining result list
      results.shift();

      CliqzHistoryCluster._attachURLs(instant, results);

      instant_results.push(instant);

    } else if (results.length < 3) {
      for (var i = 0; i < results.length; i++) {
        var instant = Result.generic('favicon', results[i].url, null, results[i].title, null, searchString);
        instant.comment += ' (history generic)!';
        instant.data.kind = ['H'];
        //promises.push(CliqzHistoryCluster._getDescription(instant));
        instant_results.push(instant);
      }
    } else {
      // 3-up combined generic history entry
      var instant = Result.generic('cliqz-pattern', '', null, '', null, searchString);
      instant.data.title = '';
      instant.comment += ' (history generic)!';
      instant.data.template = 'pattern-h3';
      instant.data.generic = true;

      this._attachURLs(instant, results, true);

      instant_results.push(instant);
    }

    if (typeof(Promise) === 'undefined') {
      // Firefox versions < 29
      callback(instant_results);
    } else {
      Promise.all(promises).then(function(data) {
        callback(instant_results);
      });
    }
  },
  // Removes a given url from the instant.data.url list
  removeUrlFromResult: function(urlList, _url) {
    var url = CliqzUtils.generalizeUrl(_url);
    for (var key in urlList) {
      var r_url = CliqzUtils.generalizeUrl(urlList[key].href);
      if (r_url == url) {
        urlList.splice(key, 1);
        return;
      }
    }
  }
};
; ctx[EXPORTED_SYMBOLS[0]] = CliqzHistoryCluster;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzHistoryCluster


// start module CliqzRequestMonitor
(function(ctx,Q,E){
var EXPORTED_SYMBOLS = ["CliqzRequestMonitor"];

function CliqzRequestMonitor() {
  this._requests = [];
  this.TTL = 120000; // two minutes
  this.HEALTH_LEVEL = 0.8;
}

CliqzRequestMonitor.prototype = {
  requests: function () {
    var deadline = new Date() - this.TTL,
        reqs;

    // removing 'dead' requests
    while(this._requests[0] && this._requests[0].timestamp < deadline) {
      this._requests.shift();
    }

    // removing 'pending' requests
    reqs = this._requests.filter(function (req) {
      if(req.readyState === 4) { return req; }
    });

    return reqs;
  },

  // checks status codes of all requests in the registry and compare the
  // rate of successful ones to HEALTH LEVEL
  inHealth: function () {
    var reqs = this.requests(),
        health = reqs.filter(function (req) {
          return req.status === 200;
        }).length / reqs.length;

    return isNaN(health) || health >= this.HEALTH_LEVEL;
  },

  addRequest: function (req) {
    this._requests.push(req);
  },

};
; ctx[EXPORTED_SYMBOLS[0]] = CliqzRequestMonitor;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzRequestMonitor


// start module CliqzResultProviders
(function(ctx,Q,E){
'use strict';
/*
 * This module handles the search engines present in the browser
 * and provides a series of custom results
 *
 */

var EXPORTED_SYMBOLS = ['CliqzResultProviders'];

 Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
 Components.utils.import('resource://gre/modules/Services.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

 XPCOMUtils.defineLazyModuleGetter(this, 'CliqzCalculator',
  'chrome://cliqzmodules/content/CliqzCalculator.jsm');

 Components.utils.import('chrome://cliqzmodules/content/CLIQZEnvironment.jsm');


// INIT_KEY ('newProvidersAdded') was used only as a boolean but now we have multiple states
// state 1 -> Google images & Google maps
// state 2 -> YouTube engine is added
// state 3 -> Aliases (shortcuts) are updated:
//  - to first 2 letters for default engines
//  - to key property for NonDefaultProviders
// state 4 -> Ecosia engine is added

 var INIT_KEY = 'newProvidersAdded',
     LOG_KEY = 'NonDefaultProviders.jsm',
     KEY ='#',
     CUSTOM = {
      '#fee': {
        url: 'https://cliqz.com/support/'
      },
      '#team': {
        url: 'https://cliqz.com/team/'
      },
      '#cliqz': {
        url: 'https://cliqz.com/'
      },
      '#join': {
        url: 'https://cliqz.com/jobs/'
      }
     },
     ENGINE_CODES = [
      'google images',
      'google maps',
      'google',
      'yahoo',
      'bing',
      'wikipedia',
      'amazon',
      'ebay',
      'leo',
      'youtube',
      'ecosia'
    ];

// REFS:
// http://stenevang.wordpress.com/2013/02/22/google-search-url-request-parameters/
// https://developers.google.com/custom-search/docs/xml_results#hlsp


var CliqzResultProviders = {
  init: function () {
    CliqzUtils.log('CliqzResultProviders initialized', LOG_KEY);
    CliqzResultProviders.manageProviders();
  },
  manageProviders: function() {

    var newProviderAdded = CliqzResultProviders.addCustomProviders();

    if(newProviderAdded) {
      CliqzResultProviders.updateEngineAliases();
    }
  },
  addCustomProviders: function() {
    var providersAddedState,
        maxState = -1,
        newProviderIsAdded = false;

    if (typeof CliqzUtils.getPref(INIT_KEY) === "boolean") {
      providersAddedState = 1;
    } else {
      providersAddedState = CliqzUtils.getPref(INIT_KEY, 0);
    }

    NonDefaultProviders.forEach(function (extern) {
      CliqzUtils.log("NonDefaultProviders");
      try {
        CliqzUtils.log('Analysing ' + extern.name, LOG_KEY);
        if (!CLIQZEnvironment.getEngineByName(extern.name)) {
          if (providersAddedState < extern.state) {
            maxState = extern.state > maxState ? extern.state : maxState;
            CliqzUtils.log('Added ' + extern.name, LOG_KEY);
            CLIQZEnvironment.addEngineWithDetails(extern);
          }
        }
      } catch (e) {
        CliqzUtils.log(e, 'err' + LOG_KEY);
      }
    });

    if (maxState > 0) {
      CliqzUtils.setPref(INIT_KEY, maxState);
      newProviderIsAdded = true;
    }

    return newProviderIsAdded;
  },
  updateEngineAliases: function() {
    CliqzResultProviders.getSearchEngines().forEach(function (engine) {
      var alias = engine.alias;
      if(!alias) { alias = CliqzResultProviders.createShortcut(engine.name); }
      if(engine.prefix && (engine.name === alias)) { alias = engine.prefix; }
      CliqzResultProviders.updateAlias(engine.name, alias);

    });
  },
  updateAlias: function(name, newAlias) {
    CLIQZEnvironment.updateAlias(name, newAlias);
    CliqzUtils.log("Alias of engine  " + name + " was updated to " + newAlias, LOG_KEY);
  },
  getCustomResults: function (q) {
    var results = null;
    var customQuery = CliqzResultProviders.customizeQuery(q);

    if(customQuery){
      results = [
        Result.generic(
          Result.CLIQZC + ' sources-' + customQuery.code,
          customQuery.queryURI,
          null,
          null,
          null,
          null,
          {
            q: customQuery.updatedQ,
            engine: customQuery.engineName
          }
        )
      ];
      q = customQuery.updatedQ;
    } else if(CliqzCalculator.isCalculatorSearch(q)) {
      var calcRes = CliqzCalculator.calculate(q);
      if (calcRes != null) {
        results = [calcRes];
      }
    }
    return [q, results];
  },
  getEngineCode: function (engineName) {
    for(var c in ENGINE_CODES) {
      if(engineName.toLowerCase().indexOf(ENGINE_CODES[c]) != -1){
        return +c + 1;
      }
    }
    // unknown engine
    return 0;
  },
  setCurrentSearchEngine: function(engine){
    Services.search.currentEngine = CliqzResultProviders.getEngineByName(engine);
  },
  // called for each query
  customizeQuery: function(q){
    if(CUSTOM[q.trim()] && CUSTOM[q.trim()].url){
      return {
        updatedQ  : q,
        engineName: 'CLIQZ',
        queryURI  : CUSTOM[q.trim()].url,
        code      : '#'
      }
    }
    // a prefix has min 4 chars
    if(q.length < 5) return false;

    var components = q.split(' ');

    if(components.length < 2) return false;

    var start = components[0],
        end = components[components.length-1],
        engineName, uq;

    if(CliqzResultProviders.getEngineByAlias(start)) {
      engineName = CliqzResultProviders.getEngineByAlias(start).name;
      uq = q.substring(start.length + 1);
    } else if(CliqzResultProviders.getEngineByAlias(end)) {
      engineName = CliqzResultProviders.getEngineByAlias(end).name;
      uq = q.substring(0, q.length - end.length - 1);
    }

    if (engineName && uq) {
      return {
        updatedQ:   uq,
        engineName: engineName,
        queryURI:   CliqzResultProviders.getSubmissionByEngineName(engineName, uq),
        code:       CliqzResultProviders.getEngineCode(engineName)
      };
    } else {
      return null;
    }
  },
  getEngineByName: function(engine) {
    return CLIQZEnvironment.getEngineByName(engine);
  },
  getEngineByAlias: function(alias) {
    return CLIQZEnvironment.getEngineByAlias(alias);
  },
  getSubmissionByEngineName: function(name, query){
    var engines = CliqzResultProviders.getSearchEngines();
    for(var i=0; i < engines.length; i++){
      if(engines[i].name == name){
        return engines[i].getSubmissionForQuery(query);
      }
    }
  },
  // called once at visual hashtag creation
  // TODO: use the updated shortcuts from about:preferences#search
  getShortcut: function(name){
    for(var i=0; i < NonDefaultProviders.length; i++)
      if(NonDefaultProviders[i].name === name)
        return NonDefaultProviders[i].key;

    return CliqzResultProviders.createShortcut(name);
  },
  // create a unique shortcut -> first 2 lowercased letters
  createShortcut: function(name){
    return KEY + name.substring(0, 2).toLowerCase();
  },
  getSearchEngines: function(){
    return CLIQZEnvironment.getSearchEngines().map(function(e){
      e.prefix = CliqzResultProviders.getShortcut(e.name);
      e.code   = CliqzResultProviders.getEngineCode(e.name);

      return e;
    });
  }
}

// TODO: create language/location aware customization
var NonDefaultProviders = [
  {
    key: "#gi",
    url: "https://www.google.de/search?tbm=isch&q={searchTerms}&hl=de",
    name: "Google Images",
    iconURL: "data:image/gif;base64,R0lGODlhEgANAOMKAAAAABUVFRoaGisrKzk5OUxMTGRkZLS0tM/Pz9/f3////////////////////////yH5BAEKAA8ALAAAAAASAA0AAART8Ml5Arg3nMkluQIhXMRUYNiwSceAnYAwAkOCGISBJC4mSKMDwpJBHFC/h+xhQAEMSuSo9EFRnSCmEzrDComAgBGbsuF0PHJq9WipnYJB9/UmFyIAOw==",
    method: 'GET',
    state:1
  },
  {
    key: "#gm",
    url: "https://maps.google.de/maps?q={searchTerms}",
    name: "Google Maps",
    iconURL: "data:image/vnd.microsoft.icon;base64,AAABAAEAEBAAAAEACABoBQAAFgAAACgAAAAQAAAAIAAAAAEACAAAAAAAAAEAABILAAASCwAAAAEAAAABAAA+VeMAZMbFAH7k/wBGy/4A/8hpAITk/wAsPNkAE8P8AFXc/wBF2f8A/8BRAP+5OwAh0v8Aqev/AExm6QA21v8A/cpwAAXJ/wAa0f8A/8dmAP/GYgCa6f8A/8NZAFzd/wCT5/8A/8VeAP++SgAq1P8ABc3/ADRI3gADy/8AKc7+AFRx7gCktfgA/sBPAP/CVgBx4f8ALdP/AAHM/wBAWeUA/7tBADpP4QCJ5f8APtj/ACg31gCi6v8A/71GAL/v/wBFydoAJTjUAB5s3wC8y6AANsD9ACvG/gBNauwAnbWRAKPJ9QCmvpQALdT/ABojzgBRZOAAue7/ACBJ1wAyRdwAFsX0AD2y8QAXz/8AEhnKAJXo/wBoheEA18B3AJ3JqQAKx/4AIS3SAN/OjgAJyP4A+MFfAPf4/gD4wWAAXnzxABWn7gAdvv0Aat//ACY01QA3St4ADcr2AGrI+gA5xuoAPMv0ADrM/gAny/UAM9D+ADHV/wBWgu4AS9r/AI+n7gClrvAAjsetAEnW/gA0xNwAOdf/ACfT/wCO5v8AJ1LXAJ+m7QBed+4AR2LpABjP/wANyPoAcbT0AAzO/wALN80AW27nAEvG0QAV0P8A4r9xADjS/gA0XNsAPdf/AC4/2gCe6f8ARV/oAP+4NgB1wbYAQNH+ANLz/wAAzP8A////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf2J0Hx9YMxAQBBMZFgoifxIlaxERMAQTFBkjChooCwt4DSRlJkcQe3tGGRYKGih6JAUYfRcBSh4RQDlOFiIuCxIrGw99ZGNVHhFIexkjGigbXg8MBSpvHH4eEQEUFgouKxcJXAI4Q2wcfh5hExkKGghSCAkqXztQbiYmcXNMNzckAiQXRDxJMmUSckJaVzU0ZhgqAm13LDFBDzobJVtZAxgVKlYnHXcsPgccfh5LB1ENDRVdJykdd1NFfX19fX19Lz0tIGonKT8GZ3YPfHx8A38vLU82eQBUd3V8fHx8fH9/f38hIA4nKVRof39/f39/f39/TSFpDnBgf39/f39/f4ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAA4D8AAOB/AAA=",
    method: 'GET',
    state: 1
  },
  {
    key: "#yt",
    url: "https://www.youtube.de/results?search_query={searchTerms}",
    name: "YouTube",
    iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAQAABMLAAATCwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgNkQkIDZGiCA2RzAgNkcwIDZH/CA2R/wgNkf8IDZH/CA2R/wgNkf8IDZH/CA2R2AgNkcwIDZHMCA2RhAgNkQYIDpWHCA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpX/CA6V/wgOlf8IDpWHCQ6ZzAkOmf8JDpn/CQ6Z/wkOmf8JDpb/BQhc/wgMgf8JDpn/CQ6Z/wkOmf8JDpn/CQ6Z/wkOmf8JDpn/CQ6ZzAkOnuoJDp7/CQ6e/wkOnv8JDp7/Exed/8jIy/9RU4j/Bwp0/wkOm/8JDp7/CQ6e/wkOnv8JDp7/CQ6e/wkOnuoJD6T8CQ+k/wkPpP8JD6T/CQ+k/xUbo//V1dX/1dXV/4yNrP8QFG//CA6Y/wkPpP8JD6T/CQ+k/wkPpP8JD6T8CQ+q/wkPqv8JD6r/CQ+q/wkPqv8WG6n/3d3d/93d3f/d3d3/v7/M/y0wjv8JD6r/CQ+q/wkPqv8JD6r/CQ+q/woQr/8KEK//ChCv/woQr/8KEK//Fx2v/+fn5//n5+f/5+fn/+jo6P+YmtP/ChCv/woQr/8KEK//ChCv/woQr/8KELX8ChC1/woQtf8KELX/ChC1/xgdtf/x8fH/8fHx//Ly8v+bndv/Ehi3/woQtf8KELX/ChC1/woQtf8KELX8ChG76goRu/8KEbv/ChG7/woRu/8YH77/+fn5/+/v9/9fY9H/ChG7/woRu/8KEbv/ChG7/woRu/8KEbv/ChG76goRwMwKEcD/ChHA/woRwP8KEcD/EBfB/6Ol5/8tM8n/ChHA/woRwP8KEcD/ChHA/woRwP8KEcD/ChHA/woRwMwLEcSHCxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcT/CxHE/wsRxP8LEcSHCxLICQsSyKULEsjMCxLI+QsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI/wsSyP8LEsj/CxLI0gsSyMwLEsiiAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//8AAP//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAD//wAA//8AAA==',
    method: 'GET',
    state: 2
  },
  {
    key: "#ec",
    url: "https://www.ecosia.org/search?q={searchTerms}&ref=cliqz",
    name: "Ecosia",
    iconURL: 'data:image/x-icon;base64,AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAAAACMuAAAjLgAAAAAAAAAAAAAAAAAAAAAAAAAAAAC8qzQBuaw3UrmsN6u5rDfruaw37bmsN+25rDfSuaw3fLmsNyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC2rTokrLFGurqsNv+5rDf/uaw3/7msN/+5rDf/uaw3/7urNP/AqS7suqw2aAAAAAAAAAAAAAAAAAAAAAC/qjApkbpn4mvJlf/EqCr/uaw3/7msN/+5rDf/uaw3/7urNP+rsUj/ib5x/7qsNv+9qzKBAAAAAAAAAAC5rDcLwKkvzom9cf813Nb/lrlh/8KoLP+5rDf/uaw3/7msN//BqS3/eMSF/yXj6v+BwHv/lbli/7atO1IAAAAAuaw3bsCqL/+Rumb/K+Di/z3ZzP+dtln/vqox/7msN/+5rDf/waku/23Ikv8s4OH/ONvS/5m4Xv+7qzXZuaw3CbmsN9DBqS7/hL93/zDe3f8v393/RdbD/7OuPv+7qzX/uqw2/8WoKf99wn//Lt/e/y/e3f99wn//v6ow/7msN0+7qzT7s64+/0bWwf8y3tn/L97d/03TuP+usET/vKoz/7isOP+vr0P/XM6n/zDe3P813Nb/L97d/5O6Zf/EpymOu6s0/7OuPv8+2cv/J+Hn/1HStP+0rjz/vasy/76qMP9zxYr/NtzV/zTd1/823NX/NtzV/zLd2f9I1b//mbheqsGpLf+gtVX/bseR/3fEhv+wr0L/vaoy/7msN/+/qjD/Wc+q/yvg4/813Nb/Md7b/zfc1P833NT/Mt7a/zbc1aqHvnT6bMiT/522WP+wr0L/vqox/7msN/+5rDf/vaoy/6C1VP8/2cr/N9zT/2vJlf9hzKD/NtzU/zbc1f813NaONdzWz3HGjv9ky53/prNN/8SoKv+8qzT/uaw3/7msOP/EqCr/ecOE/0HYx/9V0K//N9vT/zXc1v823NX/NtzVTjXc120w3tz/Lt/e/0zUu/+Fv3X/rrBF/7msN/+7qzX/vaoy/6qxSf9G1sH/L9/d/zPd2P8x3tv/L9/e2C/f3Qk23NUKNtzVzDbc1v823NX/OdvQ/0nVvv+xr0H/ta07/7+qL/+7qzT/r69D/2LMoP823NX/VNGx/2TLnVEAAAAAAAAAADbc1Sc03dfgQNnJ/2bKm/862tD/pLRP/1vOqf9S0rP/ib1x/8CpL/+4rDj/qLJM/7qsNn4AAAAAAAAAAAAAAAAAAAAAM93YI0vUvLtux5H/VdGw/3DHj/9Zz6r/Xc2m/3rDgv+5rDf/u6s1672rM2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAyaYjUburNaytsUbZuK056cGpLuS/qjDGuaw3gLmsNx4AAAAAAAAAAAAAAAAAAAAA+D8AAOAPAADAAwAAgAMAAIABAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAACAAQAAgAMAAMAHAADgDwAA+B8AAA==',
    method: 'GET',
    state: 4
  }
];
; ctx[EXPORTED_SYMBOLS[0]] = CliqzResultProviders;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzResultProviders


// start module CliqzSpellCheck
(function(ctx,Q,E){
'use strict';

Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://gre/modules/FileUtils.jsm");
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
                                  'chrome://cliqzmodules/content/CliqzUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'CliqzAutocomplete',
                                  'chrome://cliqzmodules/content/CliqzAutocomplete.jsm');

var EXPORTED_SYMBOLS = ["CliqzSpellCheck"];

var CliqzSpellCheck = {
    check: function(q) {
        var words = q.split(" ");
        var correctBack = {}
        for (var i = 0; i < words.length; i++) {
            if (words[i] == "") continue;
            if (CliqzAutocomplete.spellCorrectionDict.hasOwnProperty(words[i])) {
                var correct = CliqzAutocomplete.spellCorrectionDict[words[i]];
                if (correct.length > words[i].length &&
                    correct.slice(0, words[i].length) == words[i] &&
                    i == words.length - 1) continue;
                if (correct.length < words[i].length &&
                    words[i].slice(0, correct.length) == correct &&
                    i == words.length - 1) continue;
                if (i == words.length - 1 && words[i].length <= 10)  // long enough to correct the last word
                    continue
                correctBack[correct] = words[i];
                words[i] = correct;
            }
        }
        return [words.join(" "), correctBack];
    },
    loadRecords: function(req) {
        var content = req.response.split("\n");
        for (var i=0; i < content.length; i++) {
            var words = content[i].split("\t");
            var wrong = words[0];
            var right = words[1];
            CliqzAutocomplete.spellCorrectionDict[wrong] = right;
        }
    },
    init: function() {
        if (CliqzUtils.getPref("config_location", "") == "de" && Object.keys(CliqzAutocomplete.spellCorrectionDict).length == 0) {
            CliqzUtils.log('loading dict', 'spellcorr');
            CliqzUtils.loadResource('chrome://cliqz/content/spell_check.list', CliqzSpellCheck.loadRecords);
        }
    }
}

; ctx[EXPORTED_SYMBOLS[0]] = CliqzSpellCheck;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzSpellCheck


// start module CliqzWikipediaDeduplication
(function(ctx,Q,E){
'use strict';
/**
 * This modules implements reranking of results using user specific data
 */

var EXPORTED_SYMBOLS = ['CliqzWikipediaDeduplication'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzLanguage',
    'chrome://cliqzmodules/content/CliqzLanguage.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
    'chrome://cliqzmodules/content/CliqzUtils.jsm');



var CliqzWikipediaDeduplication = {
    LOG_KEY: 'CliqzWikipediaDeduplication',
    name: 'lang_deduplication',

    /* choose best url from list based on original order (reranking)*/
    chooseUrlByIndex: function(searchedUrls, originalUrls){
        var maxPos = originalUrls.length;
        var bestUrl = null;
        Object.keys(searchedUrls).forEach( function (lang) {
            var urls = searchedUrls[lang];
            urls.forEach(function (url){
                var i = originalUrls.indexOf(url);
                if (i < maxPos){
                    maxPos = i;
                    bestUrl = url;
                }
            });
        });
        return bestUrl;
    },
    /* choose best url from list taking language into account */
    chooseUrlByLang: function(searchedUrls, originalUrls, requestedLangs){
        if (requestedLangs == null || requestedLangs.length == 0){
            return this.chooseUrlByIndex(searchedUrls, originalUrls);
        }
        var maxPos = originalUrls.length;
        var bestUrl = null;
        Object.keys(searchedUrls).forEach( function (lang) {
            var urls = searchedUrls[lang];
            urls.forEach(function (url) {
                var i = originalUrls.indexOf(url);
                if (i < maxPos && requestedLangs.indexOf(lang) != -1) {
                    maxPos = i;
                    bestUrl = url;
                }
            });
        });
        if (bestUrl == null){
            bestUrl = this.chooseUrlByIndex(searchedUrls, originalUrls);
        }
        return bestUrl

    },
    /*strip protocol from url*/
    urlStripProtocol: function(url){
        var toRemove = ["https://", "http://",
            "www2.", "www.",
            "mobile.", "mobil.", "m."];
        toRemove.forEach(function (part) {
            if (url.toLowerCase().startsWith(part)){
                url = url.substring(part.length);
            }
        });
        return url;
    },
    /*get most used user languages*/
    getUserLanguages: function(factor){
        factor = typeof factor !== 'undefined' ? factor : 1.5;
        var availableLangs = CliqzLanguage.state(true);
        var langs = [];
        var lastValue = null;
        availableLangs.forEach(function(langObj) {
            // langObj = ["de", 0.0123]
            if (lastValue == null) lastValue = langObj[1];
            if (lastValue * factor >= langObj[1]){
                langs.push(langObj[0]);
                lastValue = langObj[1];
            }

        });
        return langs;
    },
    // dedup of languages for wikipedia case
    doRerank: function (response) {
        //reset telemetry
        var telemetrySignal = {};
        var doDedup = CliqzUtils.getPref("languageDedup", false);
        if (doDedup && response != null) {

            var userLangs = this.getUserLanguages();

            // dict of wiki languages to urls
            var wikiLangs = {};

            // list of all wiki urls
            var wikiUrls = [];

            // list of candidates to dedup with back link to original url
            // {"de.wikipedia.org/url": "Https://de.wikipedia.org/URL"}
            var candidates = {};

            // list of all urls in response
            var allUrls = [];

            // dedup result
            var dedups = {};

            // process response and fill all structures
            response.forEach(function (r) {
                var obj = CliqzUtils.getDetailsFromUrl(r.url);
                if (obj.domain == "wikipedia.org" && obj.subdomains.length) {
                    var lang = obj.subdomains[0];
                    if (wikiLangs[lang] == null) wikiLangs[lang] = [];
                    wikiLangs[lang].push(r.url);
                    candidates[this.urlStripProtocol(r.url).toLowerCase()] = r.url;
                    wikiUrls.push(r.url);
                    dedups[r.url] = [];
                }
                allUrls.push(r.url);

            }, this);
            telemetrySignal['available_languages'] = Object.keys(wikiLangs).length;
            if (Object.keys(wikiLangs).length > 1) {
                // we have wikipedia with different langs, try possible dedup
                var bestUrl = this.chooseUrlByLang(wikiLangs, allUrls, userLangs);

                var ind = allUrls.indexOf(bestUrl);
                var bestUrlData = response[ind];
                var langlinks = [];
                try {
                    langlinks = bestUrlData.snippet.rich_data.langlinks;
                } catch (e) {
                }
                langlinks.forEach(function (langlink) {
                    var stripUrl = this.urlStripProtocol(langlink).toLowerCase();
                    var stripLang = stripUrl.split(".")[0];
                    if ((stripUrl in candidates) && (userLangs.indexOf(stripLang) == -1)) {
                        var originalUrl = candidates[stripUrl];
                        dedups[bestUrl].push(originalUrl);
                        dedups[bestUrl].concat(dedups[originalUrl]);
                        delete dedups[originalUrl];
                    }
                }, this);
                var deduped = wikiUrls.length - Object.keys(dedups).length;
                telemetrySignal['total_urls'] = wikiUrls.length;
                telemetrySignal['removed_urls'] = deduped;

                if (deduped > 0) {
                    // backward structure with link where deduped url is pointing
                    var invertedUrls = {};
                    Object.keys(dedups).forEach(function (k) {
                        dedups[k].forEach(function (url) {
                            invertedUrls[url] = k;
                        });
                    });
                    var dedupResponse = [];
                    for (var i = 0; i < response.length; i++) {
                        var responseObj = response[i];
                        if (responseObj.url in invertedUrls) {
                            // this url should be replaced by main url
                            var mainInd = allUrls.indexOf(invertedUrls[responseObj.url]);
                            if (mainInd != -1) {
                                var mainObj = response[mainInd];
                                dedupResponse.push(mainObj);
                                delete allUrls[mainInd];
                            }
                        }
                        else {
                            var maybeDeleted = allUrls.indexOf(responseObj.url);
                            if (maybeDeleted != -1) {
                                dedupResponse.push(responseObj);
                                delete allUrls[i];
                            }
                        }
                    }

                    response = dedupResponse;
                }
            }
        }
        // if no dedups found
        return {
            telemetrySignal: telemetrySignal,
            response: response
        };
    }
    
};; ctx[EXPORTED_SYMBOLS[0]] = CliqzWikipediaDeduplication;
})(this, CLIQZ,CLIQZEnvironment);
// end module CliqzWikipediaDeduplication


// start module Mixer
(function(ctx,Q,E){
'use strict';
/*
 * This module mixes the results from cliqz with the history
 *
 */

var EXPORTED_SYMBOLS = ['Mixer'];

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'UrlCompare',
  'chrome://cliqzmodules/content/UrlCompare.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'Result',
  'chrome://cliqzmodules/content/Result.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CLIQZEnvironment',
  'chrome://cliqzmodules/content/CLIQZEnvironment.jsm');

var CliqzSmartCliqzCache;
var SmartCliqzTriggerUrlCache;

function objectExtend(target, obj) {
  Object.keys(obj).forEach(function(key) {
    target[key] = obj[key];
  });

  return target;
}

// enriches data kind
function kindEnricher(newKindParams, kind) {
  var parts = kind.split('|'),
      params = JSON.parse(parts[1] || '{}');

  objectExtend(params, newKindParams);

  return parts[0] + '|' + JSON.stringify(params);
}

function resultKindEnricher(newKindParams, result) {
  result.data.kind[0] = kindEnricher(newKindParams, result.data.kind[0]);
  return result;
}

var Mixer = {
  EZ_COMBINE: [
    'entity-generic', 'ez-generic-2', 'entity-search-1',
    'entity-portal', 'entity-banking-2',
  ],
  EZ_QUERY_BLACKLIST: [
    'www', 'www.', 'http://www', 'https://www',
    'http://www.', 'https://www.',
  ],

  init: function() {
    CliqzUtils.setTimeout(function() {
      CliqzUtils.log('Init', 'Mixer');
      CliqzUtils.importModule('smart-cliqz-cache/background').then(function(module) {
        CliqzSmartCliqzCache = module.default.smartCliqzCache;
        SmartCliqzTriggerUrlCache = module.default.triggerUrlCache;
      }).catch(function(error) {
        CliqzUtils.log('Failed loading SmartCliqzCache', 'Mixer');
      });
    }, 1000);
  },

  // Prepare 'extra' results (dynamic results from Rich Header) for mixing
  _prepareExtraResults: function(results) {
    // Remove invalid EZs
    results = results.filter(function(r) {
      if (Mixer._isValidEZ(r)) {
        return true;
      } else {
        CliqzUtils.log('Discarding bad EZ: ' + JSON.stringify(r), 'Mixer');
        return false;
      }
    });

    // set trigger method for EZs returned from RH
    return results.map(resultKindEnricher.bind(null, {
      trigger_method: 'rh_query',
    }));
  },

  // Various checks to make sure the supplied EZ is valid
  _isValidEZ: function(ez) {
    if (!ez.val) {
      return false;
    }

    if (!ez.data) {
      return false;
    }

    if (!ez.data.subType) {
      return false;
    }

    if (!ez.data.__subType__) {
      return false;
    }

    try {
      var ezId = Mixer._getSmartCliqzId(ez);
      if (!ezId) {
        return false;
      }
      var ezClass = JSON.parse(ez.data.subType).class;
      if (!ezClass) {
        return false;
      }
    } catch (e) {
      return false;
    }

    return true;
  },

  // Prepare backend results for mixing
  _prepareCliqzResults: function(results) {
    return results.map(function(result, i) {
      var subType = JSON.parse(result.subType || '{}');
      subType.i = i;
      result.subType = JSON.stringify(subType);
      return Result.cliqz(result);
    });
  },

  // Prepare history results for mixing
  _prepareHistoryResults: function(results) {
    return results.map(Result.clone);
  },
  // Is query valid for triggering an EZ?
  // Must have more than 2 chars and not in blacklist
  //  - avoids many unexpected EZ triggerings
  _isValidQueryForEZ: function(q) {
    var trimmed = q.trim();
    if (trimmed.length <= CLIQZEnvironment.MIN_QUERY_LENGHT_FOR_EZ) {
      return false;
    }

    return Mixer.EZ_QUERY_BLACKLIST.indexOf(trimmed.toLowerCase()) == -1;
  },

  // extract any entity zone accompanying the result, add to extraResults
  _addEZfromBM: function(extraResults, result) {
    if (!result.extra) {
      return;
    }

    var extra = Result.cliqzExtra(result.extra, result.snippet);
    resultKindEnricher({trigger_method: 'backend_url'}, extra);
    extraResults.push(extra);
  },

  // Collect all sublinks and return a single list.
  //  - called recursively, looking for any keys that look like URLs
  _collectSublinks: function(data) {
    var links = [];

    for (var key in data) {
      if (typeof (data[key]) == 'object') {
        // recurse
        links = links.concat(Mixer._collectSublinks(data[key]));
      } else if (['url', 'href'].indexOf(key) != -1) {
        links.push(data[key]);
      }
    }

    return links;
  },

  // mark entries in second that are found in first
  _getDuplicates: function(first, second) {
    return second.map(function(c) {
      var duplicate = false;
      first.forEach(function(i) {
        // Does the main link match?
        if (UrlCompare.sameUrls(c.label, i.label)) {
          duplicate = true;
          return;
        }

        // Do any of the sublinks match?
        var sublinks = Mixer._collectSublinks(i.data);
        sublinks.some(function(u) {
          if (UrlCompare.sameUrls(u, c.label)) {
            duplicate = true;
            return true; // stop iteration
          }
        });
      });

      if (duplicate) {
        return c;
      }
    }).filter(function(result) {
      return result;
    });
  },

  // Remove results from second list that are present in the first
  // Copy some information (such as the kind) to entry in the first list
  _deduplicateResults: function(first, second) {
    var duplicates = Mixer._getDuplicates(first, second);

    // remove duplicates from second list
    second = second.filter(function(c) {
      return duplicates.indexOf(c) === -1;
    });

    // take data from duplicate second result to augment result
    // Note: this does not combine data if it is a sublink match
    first = first.map(function(r) {
      duplicates.forEach(function(dup) {
        if (UrlCompare.sameUrls(r.val, dup.val)) {
          r = Result.combine(r, dup);
        }
      });

      return r;
    });

    return { first: first, second: second };
  },

  // Special case deduplication: remove clustered links from history if already
  // somewhere else in the EZ
  _deduplicateHistory: function(result) {
    // Collect sublinks not in history
    var otherLinks = [];
    Object.keys(result.data).filter(function(key) {
      return key != 'urls';
    }).forEach(function(key) {
      var sublinks = Mixer._collectSublinks(result.data[key]);
      otherLinks.concat(sublinks);
    });

    // Filter history entry, if
    result.data.urls = result.data.urls.filter(function(entry) {
      var duplicate = false;
      otherLinks.some(function(u) {
        if (UrlCompare.sameUrls(u, entry.label)) {
          duplicate = true;
          return true; // stop iteration
        }
      });

      return !duplicate;
    });
  },
  _getSmartCliqzId: function(smartCliqz) {
    return smartCliqz.data.__subType__.id;
  },

  // Find any entity zone in the results and cache them for later use.
  // Go backwards to prioritize the newest, which will be first in the list.
  _cacheEZs: function(extraResults) {
    if (!CliqzSmartCliqzCache || !SmartCliqzTriggerUrlCache) {
      return;
    }

    // slice creates a shallow copy, so we don't reverse existing array.
    extraResults.slice().reverse().forEach(function(r) {
      var trigger_urls = r.data.trigger_urls || [];
      var wasCacheUpdated = false;

      trigger_urls.forEach(function(url) {
        if (!SmartCliqzTriggerUrlCache.isCached(url)) {
          SmartCliqzTriggerUrlCache.store(url, true);
          wasCacheUpdated = true;
        }
      });

      if (wasCacheUpdated) {
        SmartCliqzTriggerUrlCache.save();
      }

      CliqzSmartCliqzCache.store(r);
    });
  },

  // Take the first entry (if history cluster) and see if we can trigger an EZ
  // with it, this will override an EZ sent by backend.
  _historyTriggerEZ: function(result) {
    if (!result || !result.data ||
       !result.data.cluster || // if not history cluster
       result.data.autoAdd) { // if the base domain was auto added (guessed)
      return undefined;
    }

    if (!CliqzSmartCliqzCache || !SmartCliqzTriggerUrlCache) {
      return undefined;
    }

    var url = CliqzUtils.generalizeUrl(result.val, true),
      ez;

    if (SmartCliqzTriggerUrlCache.isCached(url)) {
      var ezId = SmartCliqzTriggerUrlCache.retrieve(url);
      // clear dirty data that got into the data base
      if (ezId === 'deprecated') {
        SmartCliqzTriggerUrlCache.delete(url);
        return undefined;
      }
      ez = CliqzSmartCliqzCache.retrieve(url);
      if (ez) {
        // Cached EZ is available
        ez = Result.clone(ez);

        // copy over title and description from history entry
        if (!result.data.generic) {
          ez.data.title = result.data.title;
          if (!ez.data.description)
              ez.data.description = result.data.description;
        }

        resultKindEnricher({trigger_method: 'history_url'}, ez);
      } else {
        // Not available: start fetching now so it is available soon
        CliqzSmartCliqzCache.fetchAndStore(url);
      }

      if (SmartCliqzTriggerUrlCache.isStale(url)) {
        SmartCliqzTriggerUrlCache.delete(url);
      }
    }

    return ez;
  },

  // Filter out any EZs that conflict with the firstresult
  _filterConflictingEZ: function(cliqzExtra, firstresult) {
    return cliqzExtra.filter(function(ez) {

      // Did we make a 'bet' on a url from history that does not match this EZ?
      if (firstresult.data && firstresult.data.cluster &&
         !UrlCompare.sameUrls(ez.val, firstresult.val)) {
        CliqzUtils.log('Not showing EZ ' + ez.val +
                       ' because different than cluster ' + firstresult.val,
                       'Mixer');
        return false;
      }

      // Will the autocomplete change if we use this EZ?
      if (firstresult.autocompleted &&
         !UrlCompare.sameUrls(ez.val, firstresult.val)) {
        CliqzUtils.log('Not showing EZ ' + ez.val +
                       ' because autocomplete would change', 'Mixer');
        return false;
      }

      return true;
    });
  },
  // Mix together history, backend and custom results. Called twice per query:
  // once with only history (instant), second with all data.
  mix: function(q, cliqz, cliqzExtra, history, customResults,
                only_history) {

    if (!Mixer._isValidQueryForEZ(q)) {
      cliqzExtra = [];
    } else {
      // Prepare incoming EZ results
      cliqzExtra = Mixer._prepareExtraResults(cliqzExtra || []);

      // Add EZ from first cliqz results to list of EZs, if valid
      if (cliqz && cliqz.length > 0) {
        Mixer._addEZfromBM(cliqzExtra, cliqz[0]);
      }

      // Cache any EZs found
      Mixer._cacheEZs(cliqzExtra);
    }

    // Prepare other incoming data
    cliqz = Mixer._prepareCliqzResults(cliqz || []);
    history = Mixer._prepareHistoryResults(history || []);

    CliqzUtils.log('only_history:' + only_history +
                   ' history:' + history.length +
                   ' cliqz:' + cliqz.length +
                   ' extra:' + cliqzExtra.length, 'Mixer');

    // Were any history results also available as a cliqz result?
    //  if so, remove from backend list and combine sources in history result
    var r = Mixer._deduplicateResults(history, cliqz);

    // Prepare results: history (first) then backend results (second)
    var results = r.first.concat(r.second);

    // Trigger EZ with first entry
    var historyEZ = Mixer._historyTriggerEZ(results[0]);
    if (historyEZ) {
      cliqzExtra = [historyEZ];
    }

    // Filter conflicting EZs
    if (results.length > 0) {
      cliqzExtra = Mixer._filterConflictingEZ(cliqzExtra, results[0]);
    }


    // Add custom results to the beginning if there are any
    if (customResults && customResults.length > 0) {
      cliqzExtra = customResults.concat(cliqzExtra);
    }

    // limit to one entity zone
    cliqzExtra = cliqzExtra.slice(0, 1);

    // remove any BM or simple history results covered by EZ
    r = Mixer._deduplicateResults(cliqzExtra, results);
    results = r.second;
    var ez = r.first[0];

    // Add EZ to result list result list
    if (ez) {
      CliqzUtils.log('EZ (' + ez.data.kind + ') for ' + ez.val, 'Mixer');

      // Make a combined entry, if possible
      if (results.length > 0 && results[0].data.cluster &&
         Mixer.EZ_COMBINE.indexOf(ez.data.template) !== -1 &&
         UrlCompare.sameUrls(results[0].val, ez.val)) {

        CliqzUtils.log('Making combined entry.', 'Mixer');
        results[0] = Result.combine(ez, result[0]);
        Mixer._deduplicateHistory(results[0]);
      } else {
        // Add EZ to top of result list
        results = [ez].concat(results);
      }
    }

    // Special case: adjust second result if it doesn't fit
    if (results.length > 1 && results[1].data.template == 'pattern-h2') {
      CliqzUtils.log('Converting cluster for ' + results[1].val +
                     ' to simple history', 'Mixer');

      // convert to simple history entry
      var simple = Result.generic('favicon', results[1].val, null,
                                  results[1].data.title, null, searchString);
      simple.data.kind = ['H'];
      simple.data.description = result[1].data.description;
      results[1] = simple;
    }

    // Only show a maximum 3 BM results
    var cliqzRes = 0;
    results = results.filter(function(r) {
      if (r.style.indexOf('cliqz-results ') === 0) cliqzRes++;
      return cliqzRes <= 3;
    });

    // Show no results message
    if (results.length === 0 && !only_history) {
      results.push(CliqzUtils.getNoResults());
    }

    return results;
  },
};

Mixer.init();
; ctx[EXPORTED_SYMBOLS[0]] = Mixer;
})(this, CLIQZ,CLIQZEnvironment);
// end module Mixer


// start module Result
(function(ctx,Q,E){
'use strict';
/*
 * This module acts as a result factory
 *
 */

var EXPORTED_SYMBOLS = ['Result'];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');

XPCOMUtils.defineLazyModuleGetter(this, 'CliqzUtils',
  'chrome://cliqzmodules/content/CliqzUtils.jsm');


function log(msg){
    //CliqzUtils.log(msg, 'Result.jsm');
}

// returns the super type of a result - type to be consider for UI creation
function getSuperType(result){
    if(result.source == 'bm' && result.snippet && result.snippet.rich_data){
        return CliqzUtils.getKnownType(result.snippet.rich_data.superType) || // superType used for custom templates
               CliqzUtils.getKnownType(result.snippet.rich_data.type)      || // fallback result type
               'bm';                                                           // backwards compatibility (most generic type, requires only url)
    }
    return null;
}

var Result = {
    CLIQZR: 'cliqz-results',
    CLIQZC: 'cliqz-custom',
    CLIQZE: 'cliqz-extra',
    CLIQZCLUSTER: 'cliqz-cluster',
    CLIQZSERIES: 'cliqz-series',
    CLIQZICON: 'http://cliqz.com/favicon.ico',
    RULES: {
        'video': [
            { 'domain': 'youtube.com', 'ogtypes': ['video', 'youtube'] },
            { 'domain': 'vimeo.com', 'ogtypes': ['video'] },
            { 'domain': 'myvideo.de', 'ogtypes': ['video.tv_show', 'video.episode', 'video.other'] },
            { 'domain': 'dailymotion.com', 'ogtypes': ['video'] },
            { 'vertical': 'video' }
        ],
        'poster': [
            { 'domain': 'imdb.com', 'ogtypes': ['video.tv_show', 'tv_show', 'movie', 'video.movie', 'game', 'video.episode', 'actor', 'public_figure'] }
        ],
        'person': [
            { 'domain': 'xing.com', 'ogtypes': [ 'profile'] },
            { 'vertical': 'people' }
        ],
        'hq': [
            { 'vertical': 'hq'}
        ],
        'news': [
            { 'vertical': 'news'}
        ],
        'shopping': [
            { 'vertical': 'shopping'}
        ]
    },
	generic: function(style, value, image, comment, label, query, data, subtype){
        //try to show host name if no title (comment) is provided
        if(style.indexOf(Result.CLIQZC) === -1       // is not a custom search
           && (!comment || value == comment)   // no comment(page title) or comment is exactly the url
           && CliqzUtils.isCompleteUrl(value)){       // looks like an url
            var host = CliqzUtils.getDetailsFromUrl(value).name;
            if(host && host.length>0){
                comment = host[0].toUpperCase() + host.slice(1);
            }
        }
        if(!comment){
            comment = value;
        }

        data = data || {};
        data.kind = [CliqzUtils.encodeResultType(style) + (subtype? '|' + subtype : '')];

        var item = {
            style: style,
            val: value,
            comment: comment,
            label: label || value,
            query: query,
            data: data
        };
        return item;
    },
    cliqz: function(result){
        var resStyle = Result.CLIQZR + ' sources-' + CliqzUtils.encodeSources(getSuperType(result) || result.source).join('');

        if(result.snippet){
            return Result.generic(
                resStyle, //style
                result.url, //value
                null, //image -> favico
                result.snippet.title,
                null, //label
                result.q, //query
                Result.getData(result),
                result.subType
            );
        } else {
            return Result.generic(resStyle, result.url, null, null, null, result.q, null, result.subType);
        }
    },
    cliqzExtra: function(result, snippet){
        result.data.subType = result.subType;
        result.data.trigger_urls = result.trigger_urls;
        result.data.ts = result.ts;

        return Result.generic(
            Result.CLIQZE, //style
            result.url, //value
            null, //image -> favico
            result.data.title,
            null, //label
            result.q, //query
            result.data,
            result.subType
        );
    },
    // Combine two results into a new result
    combine: function(first, second) {
        var ret = Result.clone(first);
        ret.style = CliqzUtils.combineSources(ret.style, second.style);
        ret.data.kind = (ret.data.kind || []).concat(second.data.kind || []);

        // copy over description, title and url list, if needed
        if(second.data.description && !ret.data.description)
            ret.data.description = second.data.description;
        if(second.data.title && !ret.data.title) // title
            ret.data.title = second.data.title;
        if(second.data.urls && !ret.data.urls) // history url list
            ret.data.urls = second.data.urls;

        return ret;
    },
    // not really cloning the object !!!
    clone: function(entry) {
        var ret = Result.generic(entry.style, entry.val, null, entry.comment, entry.label, entry.query, null);
        ret.data = JSON.parse(JSON.stringify(entry.data)); // nasty way of cloning an object
        if(entry.autocompleted) ret.autocompleted = true;
        return ret;
    },
    // check if a result should be kept in final result list
    isValid: function (url, urlparts) {

        // Google Filters
        if(urlparts.name.toLowerCase() == "google" &&
           urlparts.subdomains.length > 0 && urlparts.subdomains[0].toLowerCase() == "www" &&
           (urlparts.extra.indexOf("/search") != -1 || // "/search?" for regular SERPS and ".*/search/.*" for maps
            urlparts.extra.indexOf("/url?") == 0 ||    // www.google.*/url? - for redirects
            urlparts.extra.indexOf("q=") != -1 )) {    // for instant search results
            log("Discarding result page from history: " + url)
            return false;
        }
        // Bing Filters
        // Filter all like:
        //    www.bing.com/search?
        if(urlparts.name.toLowerCase() == "bing" && urlparts.extra.indexOf("q=") != -1) {
            log("Discarding result page from history: " + url)
            return false;
        }
        // Yahoo filters
        // Filter all like:
        //   search.yahoo.com/search
        //   *.search.yahooo.com/search - for international 'de.search.yahoo.com'
        //   r.search.yahoo.com - for redirects 'r.search.yahoo.com'
        if(urlparts.name.toLowerCase() == "yahoo" &&
           ((urlparts.subdomains.length == 1 && urlparts.subdomains[0].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[1].toLowerCase() == "search" && urlparts.path.indexOf("/search") == 0) ||
            (urlparts.subdomains.length == 2 && urlparts.subdomains[0].toLowerCase() == "r" && urlparts.subdomains[1].toLowerCase() == "search"))) {
            log("Discarding result page from history: " + url)
            return false;
        }

        // Ignore bitly redirections
        if (url.search(/http(s?):\/\/bit\.ly\/.*/i) === 0) {
            log("Discarding result page from history: " + url)
            return false;
        }

        // Ignore Twitter redirections
        if (url.search(/http(s?):\/\/t\.co\/.*/i) === 0) {
            log("Discarding result page from history: " + url)
            return false;
        }

        return true;
    },
    // rich data and image
    getData: function(result){
        //TODO: rethink the whole image filtering
        if(!result.snippet)
            return;

        var urlparts = CliqzUtils.getDetailsFromUrl(result.url),
            resp = {
                richData: result.snippet.rich_data,
                adult: result.snippet.adult || false,
                media: result.snippet.media
            },
            source = getSuperType(result) || result.source;

        resp.type = "other";
        for(var type in Result.RULES){
            var rules = Result.RULES[type];

            for(var rule_i in rules) {
                var rule = rules[rule_i];
                if(rule.domain && urlparts.host.indexOf(rule.domain) != -1)
                    for(var ogtype in (rule.ogtypes || []))
                        if(result.snippet && result.snippet.og &&
                           result.snippet.og.type == rule.ogtypes[ogtype])
                                resp.type = type;

                var verticals = source.split(',');
                for(var v in verticals){
                    if(verticals[v].trim() == rule.vertical)
                        resp.type = type;
                }
            }


        var snip = result.snippet;
        resp.description = snip && (snip.desc || snip.snippet || (snip.og && snip.og.description));
        resp.title = result.snippet.title;
        // mobile specific url
        resp.mobile_url = snip.amp_url || snip.m_url;

        var ogT = snip && snip.og? snip.og.type: null,
            imgT = snip && snip.image? snip.image.type: null;

        if(resp.type != 'other' || ogT == 'cliqz' || imgT == 'cliqz')
            resp.image = Result.getVerticalImage(result.snippet.image, result.snippet.rich_data) ||
                         Result.getOgImage(result.snippet.og)
        }

        return resp;
    },
    getOgImage: function(og) {
        if(og && og.image){
            var image = { src: og.image };

            if(og.duration && parseInt(og.duration)){
                var parsedDuration = Result.tryGetImageDuration(og.duration)
                if(parsedDuration) image.duration = parsedDuration;
            }

            return image;
        }
    },
    getVerticalImage: function(imageData, richData){
        if(imageData == undefined || imageData.src == undefined) return;

        var image = {
            src: imageData.src
        };


        if(imageData.width) image.width = imageData.width;
        if(imageData.height) image.height = imageData.height;
        if(imageData.ratio) image.ratio = imageData.ratio;

        // add duration from rich data
        if(richData && richData.duration){
            var parsedDuration = Result.tryGetImageDuration(richData.duration)
            if(parsedDuration) image.duration = parsedDuration;
        }

        return image
    },
    tryGetImageDuration: function(duration){
        try {
            var totalSeconds = parseInt(duration),
                min = Math.floor(totalSeconds/60),
                seconds = totalSeconds%60;
            return min + ':' + (seconds < 10 ? '0' + seconds : seconds);
        }
        catch(e){}

        return undefined;
    }
}
; ctx[EXPORTED_SYMBOLS[0]] = Result;
})(this, CLIQZ,CLIQZEnvironment);
// end module Result


// start module UrlCompare
(function(ctx,Q,E){
'use strict';
/*
 * This module handles results(url) comparison
 *
 */

var EXPORTED_SYMBOLS = ['UrlCompare'];

// TLD list extracted from http://www.iana.org/domains/root/db,
// cc stands fro country code, the other are generic
var TLDs = {gw: 'cc', gu: 'cc', gt: 'cc', gs: 'cc', gr: 'cc', gq: 'cc', gp: 'cc', dance: 'na', tienda: 'na', gy: 'cc', gg: 'cc', gf: 'cc', ge: 'cc', gd: 'cc', gb: 'cc', ga: 'cc', edu: 'na', gn: 'cc', gm: 'cc', gl: 'cc', '\u516c\u53f8': 'na', gi: 'cc', gh: 'cc', tz: 'cc', zone: 'na', tv: 'cc', tw: 'cc', tt: 'cc', immobilien: 'na', tr: 'cc', tp: 'cc', tn: 'cc', to: 'cc', tl: 'cc', bike: 'na', tj: 'cc', tk: 'cc', th: 'cc', tf: 'cc', tg: 'cc', td: 'cc', tc: 'cc', coop: 'na', '\u043e\u043d\u043b\u0430\u0439\u043d': 'na', cool: 'na', ro: 'cc', vu: 'cc', democrat: 'na', guitars: 'na', qpon: 'na', '\u0441\u0440\u0431': 'cc', zm: 'cc', tel: 'na', futbol: 'na', za: 'cc', '\u0628\u0627\u0632\u0627\u0631': 'na', '\u0440\u0444': 'cc', zw: 'cc', blue: 'na', mu: 'cc', '\u0e44\u0e17\u0e22': 'cc', asia: 'na', marketing: 'na', '\u6d4b\u8bd5': 'na', international: 'na', net: 'na', '\u65b0\u52a0\u5761': 'cc', okinawa: 'na', '\u0baa\u0bb0\u0bbf\u0b9f\u0bcd\u0b9a\u0bc8': 'na', '\u05d8\u05e2\u05e1\u05d8': 'na', '\uc0bc\uc131': 'na', sexy: 'na', institute: 'na', '\u53f0\u7063': 'cc', pics: 'na', '\u516c\u76ca': 'na', '\u673a\u6784': 'na', social: 'na', domains: 'na', '\u9999\u6e2f': 'cc', '\u96c6\u56e2': 'na', limo: 'na', '\u043c\u043e\u043d': 'cc', tools: 'na', nagoya: 'na', properties: 'na', camera: 'na', today: 'na', club: 'na', company: 'na', glass: 'na', berlin: 'na', me: 'cc', md: 'cc', mg: 'cc', mf: 'cc', ma: 'cc', mc: 'cc', tokyo: 'na', mm: 'cc', ml: 'cc', mo: 'cc', mn: 'cc', mh: 'cc', mk: 'cc', cat: 'na', reviews: 'na', mt: 'cc', mw: 'cc', mv: 'cc', mq: 'cc', mp: 'cc', ms: 'cc', mr: 'cc', cab: 'na', my: 'cc', mx: 'cc', mz: 'cc', '\u0b87\u0bb2\u0b99\u0bcd\u0b95\u0bc8': 'cc', wang: 'na', estate: 'na', clothing: 'na', monash: 'na', guru: 'na', technology: 'na', travel: 'na', '\u30c6\u30b9\u30c8': 'na', pink: 'na', fr: 'cc', '\ud14c\uc2a4\ud2b8': 'na', farm: 'na', lighting: 'na', fi: 'cc', fj: 'cc', fk: 'cc', fm: 'cc', fo: 'cc', sz: 'cc', kaufen: 'na', sx: 'cc', ss: 'cc', sr: 'cc', sv: 'cc', su: 'cc', st: 'cc', sk: 'cc', sj: 'cc', si: 'cc', sh: 'cc', so: 'cc', sn: 'cc', sm: 'cc', sl: 'cc', sc: 'cc', sb: 'cc', rentals: 'na', sg: 'cc', se: 'cc', sd: 'cc', '\u7ec4\u7ec7\u673a\u6784': 'na', shoes: 'na', '\u4e2d\u570b': 'cc', industries: 'na', lb: 'cc', lc: 'cc', la: 'cc', lk: 'cc', li: 'cc', lv: 'cc', lt: 'cc', lu: 'cc', lr: 'cc', ls: 'cc', holiday: 'na', ly: 'cc', coffee: 'na', ceo: 'na', '\u5728\u7ebf': 'na', ye: 'cc', '\u0625\u062e\u062a\u0628\u0627\u0631': 'na', ninja: 'na', yt: 'cc', name: 'na', moda: 'na', eh: 'cc', '\u0628\u06be\u0627\u0631\u062a': 'cc', ee: 'cc', house: 'na', eg: 'cc', ec: 'cc', vote: 'na', eu: 'cc', et: 'cc', es: 'cc', er: 'cc', ru: 'cc', rw: 'cc', '\u0aad\u0abe\u0ab0\u0aa4': 'cc', rs: 'cc', boutique: 'na', re: 'cc', '\u0633\u0648\u0631\u064a\u0629': 'cc', gov: 'na', '\u043e\u0440\u0433': 'na', red: 'na', foundation: 'na', pub: 'na', vacations: 'na', org: 'na', training: 'na', recipes: 'na', '\u0438\u0441\u043f\u044b\u0442\u0430\u043d\u0438\u0435': 'na', '\u4e2d\u6587\u7f51': 'na', support: 'na', onl: 'na', '\u4e2d\u4fe1': 'na', voto: 'na', florist: 'na', '\u0dbd\u0d82\u0d9a\u0dcf': 'cc', '\u049b\u0430\u0437': 'cc', management: 'na', '\u0645\u0635\u0631': 'cc', '\u0622\u0632\u0645\u0627\u06cc\u0634\u06cc': 'na', kiwi: 'na', academy: 'na', sy: 'cc', cards: 'na', '\u0938\u0902\u0917\u0920\u0928': 'na', pro: 'na', kred: 'na', sa: 'cc', mil: 'na', '\u6211\u7231\u4f60': 'na', agency: 'na', '\u307f\u3093\u306a': 'na', equipment: 'na', mango: 'na', luxury: 'na', villas: 'na', '\u653f\u52a1': 'na', singles: 'na', systems: 'na', plumbing: 'na', '\u03b4\u03bf\u03ba\u03b9\u03bc\u03ae': 'na', '\u062a\u0648\u0646\u0633': 'cc', '\u067e\u0627\u06a9\u0633\u062a\u0627\u0646': 'cc', gallery: 'na', kg: 'cc', ke: 'cc', '\u09ac\u09be\u0982\u09b2\u09be': 'cc', ki: 'cc', kh: 'cc', kn: 'cc', km: 'cc', kr: 'cc', kp: 'cc', kw: 'cc', link: 'na', ky: 'cc', voting: 'na', cruises: 'na', '\u0639\u0645\u0627\u0646': 'cc', cheap: 'na', solutions: 'na', '\u6e2c\u8a66': 'na', neustar: 'na', partners: 'na', '\u0b87\u0ba8\u0bcd\u0ba4\u0bbf\u0baf\u0bbe': 'cc', menu: 'na', arpa: 'na', flights: 'na', rich: 'na', do: 'cc', dm: 'cc', dj: 'cc', dk: 'cc', photography: 'na', de: 'cc', watch: 'na', dz: 'cc', supplies: 'na', report: 'na', tips: 'na', '\u10d2\u10d4': 'cc', bar: 'na', qa: 'cc', shiksha: 'na', '\u0443\u043a\u0440': 'cc', vision: 'na', wiki: 'na', '\u0642\u0637\u0631': 'cc', '\ud55c\uad6d': 'cc', computer: 'na', best: 'na', voyage: 'na', expert: 'na', diamonds: 'na', email: 'na', wf: 'cc', jobs: 'na', bargains: 'na', '\u79fb\u52a8': 'na', jp: 'cc', jm: 'cc', jo: 'cc', ws: 'cc', je: 'cc', kitchen: 'na', '\u0a2d\u0a3e\u0a30\u0a24': 'cc', '\u0627\u06cc\u0631\u0627\u0646': 'cc', ua: 'cc', buzz: 'na', com: 'na', uno: 'na', ck: 'cc', ci: 'cc', ch: 'cc', co: 'cc', cn: 'cc', cm: 'cc', cl: 'cc', cc: 'cc', ca: 'cc', cg: 'cc', cf: 'cc', community: 'na', cd: 'cc', cz: 'cc', cy: 'cc', cx: 'cc', cr: 'cc', cw: 'cc', cv: 'cc', cu: 'cc', pr: 'cc', ps: 'cc', pw: 'cc', pt: 'cc', holdings: 'na', wien: 'na', py: 'cc', ai: 'cc', pa: 'cc', pf: 'cc', pg: 'cc', pe: 'cc', pk: 'cc', ph: 'cc', pn: 'cc', pl: 'cc', pm: 'cc', '\u53f0\u6e7e': 'cc', aero: 'na', catering: 'na', photos: 'na', '\u092a\u0930\u0940\u0915\u094d\u0937\u093e': 'na', graphics: 'na', '\u0641\u0644\u0633\u0637\u064a\u0646': 'cc', '\u09ad\u09be\u09b0\u09a4': 'cc', ventures: 'na', va: 'cc', vc: 'cc', ve: 'cc', vg: 'cc', iq: 'cc', vi: 'cc', is: 'cc', ir: 'cc', it: 'cc', vn: 'cc', im: 'cc', il: 'cc', io: 'cc', in: 'cc', ie: 'cc', id: 'cc', tattoo: 'na', education: 'na', parts: 'na', events: 'na', '\u0c2d\u0c3e\u0c30\u0c24\u0c4d': 'cc', cleaning: 'na', kim: 'na', contractors: 'na', mobi: 'na', center: 'na', photo: 'na', nf: 'cc', '\u0645\u0644\u064a\u0633\u064a\u0627': 'cc', wed: 'na', supply: 'na', '\u7f51\u7edc': 'na', '\u0441\u0430\u0439\u0442': 'na', careers: 'na', build: 'na', '\u0627\u0644\u0627\u0631\u062f\u0646': 'cc', bid: 'na', biz: 'na', '\u0627\u0644\u0633\u0639\u0648\u062f\u064a\u0629': 'cc', gift: 'na', '\u0434\u0435\u0442\u0438': 'na', works: 'na', '\u6e38\u620f': 'na', tm: 'cc', exposed: 'na', productions: 'na', koeln: 'na', dating: 'na', christmas: 'na', bd: 'cc', be: 'cc', bf: 'cc', bg: 'cc', ba: 'cc', bb: 'cc', bl: 'cc', bm: 'cc', bn: 'cc', bo: 'cc', bh: 'cc', bi: 'cc', bj: 'cc', bt: 'cc', bv: 'cc', bw: 'cc', bq: 'cc', br: 'cc', bs: 'cc', post: 'na', by: 'cc', bz: 'cc', om: 'cc', ruhr: 'na', '\u0627\u0645\u0627\u0631\u0627\u062a': 'cc', repair: 'na', xyz: 'na', '\u0634\u0628\u0643\u0629': 'na', viajes: 'na', museum: 'na', fish: 'na', '\u0627\u0644\u062c\u0632\u0627\u0626\u0631': 'cc', hr: 'cc', ht: 'cc', hu: 'cc', hk: 'cc', construction: 'na', hn: 'cc', solar: 'na', hm: 'cc', info: 'na', '\u0b9a\u0bbf\u0b99\u0bcd\u0b95\u0baa\u0bcd\u0baa\u0bc2\u0bb0\u0bcd': 'cc', uy: 'cc', uz: 'cc', us: 'cc', um: 'cc', uk: 'cc', ug: 'cc', builders: 'na', ac: 'cc', camp: 'na', ae: 'cc', ad: 'cc', ag: 'cc', af: 'cc', int: 'na', am: 'cc', al: 'cc', ao: 'cc', an: 'cc', aq: 'cc', as: 'cc', ar: 'cc', au: 'cc', at: 'cc', aw: 'cc', ax: 'cc', az: 'cc', ni: 'cc', codes: 'na', nl: 'cc', no: 'cc', na: 'cc', nc: 'cc', ne: 'cc', actor: 'na', ng: 'cc', '\u092d\u093e\u0930\u0924': 'cc', nz: 'cc', '\u0633\u0648\u062f\u0627\u0646': 'cc', np: 'cc', nr: 'cc', nu: 'cc', xxx: 'na', '\u4e16\u754c': 'na', kz: 'cc', enterprises: 'na', land: 'na', '\u0627\u0644\u0645\u063a\u0631\u0628': 'cc', '\u4e2d\u56fd': 'cc', directory: 'na'};

var UrlCompare = {

  // Compare two URLs and return true if same or differing only by
  // country code in subdomain or path.
  sameUrls: function(url1, url2) {
      // Get generalized representation of each url
      var keys1 = UrlCompare._extractKeys(url1, '');
      var keys2 = UrlCompare._extractKeys(url2, '');

      // Compare the second one, which takes path into account
      return keys1[1] == keys2[1];
    },

  _filterTLDs: function(domain) {
    var v = domain.toLowerCase().split('.');

    // remove the first level yes or yes
    var first_level = TLDs[v[v.length - 1]];
    v[v.length - 1] = null;

    if ((v.length > 2) && (first_level == 'cc')) {
      // check if we also have to remove the second level, only if 3 or more
      //  levels and the first_level was a country code
      if (TLDs[v[v.length - 2]]) {
        v[v.length - 2] = null;
      }
    }

    // remove the nulls
    v = v.filter(function(n) { return n !== null; });

    // let's go to remove locales from the beginning, only if at least 2 or
    // more levels remaining and if the first_level was not a country code
    if ((v.length > 1) && (first_level != 'cc')) {

      // cover the case de.wikipedia.org
      if (TLDs[v[0]] == 'cc' || v[0] == 'en') {
        v[0] = null;
      }      else {
        // cover the case de-de.facebook.com
        var w = v[0].split('-');
        if ((w.length == 2) && (TLDs[w[0]] == 'cc' || w[0] == 'en') &&
            (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
          v[0] = null;
        }
      }
    }

    // remove the nulls and join
    return v.filter(function(n) { return n !== null; }).join('.');
  },

  _filterTLDsInPath: function(path) {

    var v = path.toLowerCase().split('/');

    // it should have at least 2, "/".split('/') => ['', '']

    // we only consider the top level element in the path
    if (v.length > 1) {
      if (TLDs[v[1]] == 'cc') {
        v[1] = null;
      }      else {
        var w = v[1].split('-');
        if ((w.length == 2) && (TLDs[w[0]] == 'cc' || w[0] == 'en') && (TLDs[w[1]] == 'cc' || w[1] == 'en')) {
          v[1] = null;
        }
      }
    }

    // remove the nulls and join

    var clean_v = v.filter(function(n) { return n !== null; });

    var new_path = '/';

    if (clean_v.length > 1) {
      new_path = v.filter(function(n) { return n !== null; }).join('/');
    }    else {
      // special case when clean_v has only one element, it will not join the
      // initial slash
      new_path = '/' + v.filter(function(n) { return n !== null; }).join('/');
    }

    new_path = new_path.replace('//', '/');

    return new_path;

  },

  _extractKeys: function(url, title) {
    var clean_url =
      url.toLowerCase().replace(/^http[s]*:\/\//, '').replace(/^www\./, '');
    var v = clean_url.split('/');
    var domain = v[0];
    var path = '/';

    if (v.length > 1) {
      // remove the query string
      v[v.length - 1] = v[v.length - 1].split('?')[0];

      if (v[1] == '#') {
        // the path starts with # which is used for internal routing,
        // remove for keys
        // http://klout.com/#/solso == http://klout.com/solso
        if (v.length > 2) path = '/' + v.splice(2, v.length - 1).join('/');
      }      else path = '/' + v.splice(1, v.length - 1).join('/');
    }

    domain = UrlCompare._filterTLDs(domain);
    path = UrlCompare._filterTLDsInPath(path);

    // if no title or empty, generate a random key.
    // This is a fail-safe mechanism
    if ((title === undefined) || (title === null) || (title.trim() === '')) {
      title = '' + Math.random();
    }

    // remove debug info from title on the de-duplication, so that we have
    // consistent behaviour.
    // the debug info is anything that has ( foo bar )! end of line
    title = title.replace(/\(.*\)!$/, '').trim();

    return [domain, domain + path, domain + title];
  },
};

; ctx[EXPORTED_SYMBOLS[0]] = UrlCompare;
})(this, CLIQZ,CLIQZEnvironment);
// end module UrlCompare




//# sourceMappingURL=global.map