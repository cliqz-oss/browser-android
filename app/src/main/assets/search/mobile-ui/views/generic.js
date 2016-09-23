System.register('mobile-ui/views/generic', [], function (_export) {
  'use strict';

  var _default;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {
        function _default() {
          _classCallCheck(this, _default);
        }

        _createClass(_default, [{
          key: 'enhanceResults',
          value: function enhanceResults(data, _ref) {
            var width = _ref.width;
            var height = _ref.height;

            // trim description in case of embedded history results
            if (data.template === 'pattern-h2' && data.description) {
              // rough calculations to determine how much of description to show
              // line padding: 60, character width: 10, keyboard height: 400, line height: 20
              var descLength = (width - 60) / 10 * Math.max((height - 400) / 20, 1);
              if (data.description.length > descLength + 3) {
                data.description = data.description.slice(0, descLength) + '...';
              }
            }

            for (var i in data.external_links) {
              data.external_links[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.external_links[i].url));
            }

            if (data.richData && data.richData.additional_sources) {
              for (var i in data.richData.additional_sources) {
                data.richData.additional_sources[i].logoDetails = CliqzUtils.getLogoDetails(CliqzUtils.getDetailsFromUrl(data.richData.additional_sources[i].url));
              }
            }

            (data.news || []).forEach(function (article) {
              var urlDetails = CliqzUtils.getDetailsFromUrl(article.url);
              article.logo = CliqzUtils.getLogoDetails(urlDetails);
            });

            if (data.actions && data.external_links) {
              data.actionsExternalMixed = data.actions.concat(data.external_links);
              data.actionsExternalMixed.sort(function (a, b) {
                if (a.rank < b.rank) {
                  return 1;
                }
                if (a.rank > b.rank) {
                  return -1;
                }
                return 0;
              });
            }
          }
        }]);

        return _default;
      })();

      _export('default', _default);

      ;
    }
  };
});