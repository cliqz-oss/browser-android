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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy9nZW5lcmljLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7aUJBQ2dCLHdCQUFDLElBQUksRUFBRSxJQUFlLEVBQUU7Z0JBQWhCLEtBQUssR0FBTixJQUFlLENBQWQsS0FBSztnQkFBRSxNQUFNLEdBQWQsSUFBZSxDQUFQLE1BQU07OztBQUVqQyxnQkFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFlBQVksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFOzs7QUFHdEQsa0JBQU0sVUFBVSxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQSxHQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQSxHQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN4RSxrQkFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxVQUFVLEdBQUcsQ0FBQyxFQUFFO0FBQzVDLG9CQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsR0FBRyxLQUFLLENBQUM7ZUFDbEU7YUFDRjs7QUFHRCxpQkFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO0FBQ2hDLGtCQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7YUFDMUg7O0FBRUQsZ0JBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFO0FBQ3JELG1CQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUU7QUFDN0Msb0JBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLFVBQVUsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztlQUNwSjthQUNGOztBQUVELGFBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUEsQ0FBRSxPQUFPLENBQUMsVUFBQSxPQUFPLEVBQUk7QUFDbkMsa0JBQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDN0QscUJBQU8sQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQzthQUN0RCxDQUFDLENBQUM7O0FBRUgsZ0JBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO0FBQ3RDLGtCQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3JFLGtCQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFVBQVMsQ0FBQyxFQUFDLENBQUMsRUFBRTtBQUMzQyxvQkFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUU7QUFBQyx5QkFBTyxDQUFDLENBQUM7aUJBQUM7QUFDaEMsb0JBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFO0FBQUMseUJBQU8sQ0FBQyxDQUFDLENBQUM7aUJBQUM7QUFDakMsdUJBQU8sQ0FBQyxDQUFDO2VBQ1YsQ0FBQyxDQUFDO2FBQ0o7V0FDRjs7Ozs7Ozs7QUFDRixPQUFDIiwiZmlsZSI6Im1vYmlsZS11aS92aWV3cy9nZW5lcmljLmVzIiwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuICBlbmhhbmNlUmVzdWx0cyhkYXRhLCB7d2lkdGgsIGhlaWdodH0pIHtcbiAgICAvLyB0cmltIGRlc2NyaXB0aW9uIGluIGNhc2Ugb2YgZW1iZWRkZWQgaGlzdG9yeSByZXN1bHRzXG4gICAgaWYgKGRhdGEudGVtcGxhdGUgPT09ICdwYXR0ZXJuLWgyJyAmJiBkYXRhLmRlc2NyaXB0aW9uKSB7XG4gICAgICAvLyByb3VnaCBjYWxjdWxhdGlvbnMgdG8gZGV0ZXJtaW5lIGhvdyBtdWNoIG9mIGRlc2NyaXB0aW9uIHRvIHNob3dcbiAgICAgIC8vIGxpbmUgcGFkZGluZzogNjAsIGNoYXJhY3RlciB3aWR0aDogMTAsIGtleWJvYXJkIGhlaWdodDogNDAwLCBsaW5lIGhlaWdodDogMjBcbiAgICAgIGNvbnN0IGRlc2NMZW5ndGggPSAod2lkdGggLSA2MCkgLyAxMCAqIE1hdGgubWF4KChoZWlnaHQgLSA0MDApIC8gMjAsIDEpO1xuICAgICAgaWYgKGRhdGEuZGVzY3JpcHRpb24ubGVuZ3RoID4gZGVzY0xlbmd0aCArIDMpIHtcbiAgICAgICAgZGF0YS5kZXNjcmlwdGlvbiA9IGRhdGEuZGVzY3JpcHRpb24uc2xpY2UoMCwgZGVzY0xlbmd0aCkgKyAnLi4uJztcbiAgICAgIH1cbiAgICB9XG5cblxuICAgIGZvcih2YXIgaSBpbiBkYXRhLmV4dGVybmFsX2xpbmtzKSB7XG4gICAgICBkYXRhLmV4dGVybmFsX2xpbmtzW2ldLmxvZ29EZXRhaWxzID0gQ2xpcXpVdGlscy5nZXRMb2dvRGV0YWlscyhDbGlxelV0aWxzLmdldERldGFpbHNGcm9tVXJsKGRhdGEuZXh0ZXJuYWxfbGlua3NbaV0udXJsKSk7XG4gICAgfVxuXG4gICAgaWYoIGRhdGEucmljaERhdGEgJiYgZGF0YS5yaWNoRGF0YS5hZGRpdGlvbmFsX3NvdXJjZXMpIHtcbiAgICAgIGZvcih2YXIgaSBpbiBkYXRhLnJpY2hEYXRhLmFkZGl0aW9uYWxfc291cmNlcykge1xuICAgICAgICBkYXRhLnJpY2hEYXRhLmFkZGl0aW9uYWxfc291cmNlc1tpXS5sb2dvRGV0YWlscyA9IENsaXF6VXRpbHMuZ2V0TG9nb0RldGFpbHMoQ2xpcXpVdGlscy5nZXREZXRhaWxzRnJvbVVybChkYXRhLnJpY2hEYXRhLmFkZGl0aW9uYWxfc291cmNlc1tpXS51cmwpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAoZGF0YS5uZXdzIHx8IFtdKS5mb3JFYWNoKGFydGljbGUgPT4ge1xuICAgICAgY29uc3QgdXJsRGV0YWlscyA9IENsaXF6VXRpbHMuZ2V0RGV0YWlsc0Zyb21VcmwoYXJ0aWNsZS51cmwpO1xuICAgICAgYXJ0aWNsZS5sb2dvID0gQ2xpcXpVdGlscy5nZXRMb2dvRGV0YWlscyh1cmxEZXRhaWxzKTtcbiAgICB9KTtcblxuICAgIGlmKGRhdGEuYWN0aW9ucyAmJiBkYXRhLmV4dGVybmFsX2xpbmtzKSB7XG4gICAgICBkYXRhLmFjdGlvbnNFeHRlcm5hbE1peGVkID0gZGF0YS5hY3Rpb25zLmNvbmNhdChkYXRhLmV4dGVybmFsX2xpbmtzKTtcbiAgICAgIGRhdGEuYWN0aW9uc0V4dGVybmFsTWl4ZWQuc29ydChmdW5jdGlvbihhLGIpIHtcbiAgICAgICAgaWYgKGEucmFuayA8IGIucmFuaykge3JldHVybiAxO31cbiAgICAgICAgaWYgKGEucmFuayA+IGIucmFuaykge3JldHVybiAtMTt9XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG59O1xuIl19