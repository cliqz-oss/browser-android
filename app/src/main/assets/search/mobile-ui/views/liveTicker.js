System.register('mobile-ui/views/liveTicker', [], function (_export) {
  /**
  * @namespace ui.views
  */
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

          /**
          * @method enhanceResults
          * @param data
          */
          value: function enhanceResults(data) {
            data.matches.forEach(function (matchday) {
              matchday.matches.forEach(function (match) {
                match.gameTimeHour = match.gameTime.split(', ')[1];
                match['class'] = match.isLive ? 'cqz-live' : '';
              });
            });
          }
        }]);

        return _default;
      })();

      _export('default', _default);
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vYmlsZS11aS92aWV3cy9saXZlVGlja2VyLmVzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztpQkFTZ0Isd0JBQUMsSUFBSSxFQUFFO0FBQ25CLGdCQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFBLFFBQVEsRUFBSTtBQUMvQixzQkFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBQSxLQUFLLEVBQUk7QUFDaEMscUJBQUssQ0FBQyxZQUFZLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQscUJBQUssU0FBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsVUFBVSxHQUFHLEVBQUUsQ0FBQztlQUM5QyxDQUFDLENBQUM7YUFDSixDQUFDLENBQUM7V0FDSiIsImZpbGUiOiJtb2JpbGUtdWkvdmlld3MvbGl2ZVRpY2tlci5lcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuKiBAbmFtZXNwYWNlIHVpLnZpZXdzXG4qL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuXG4gIC8qKlxuICAqIEBtZXRob2QgZW5oYW5jZVJlc3VsdHNcbiAgKiBAcGFyYW0gZGF0YVxuICAqL1xuICBlbmhhbmNlUmVzdWx0cyhkYXRhKSB7XG4gICAgZGF0YS5tYXRjaGVzLmZvckVhY2gobWF0Y2hkYXkgPT4ge1xuICAgICAgbWF0Y2hkYXkubWF0Y2hlcy5mb3JFYWNoKG1hdGNoID0+IHtcbiAgICAgICAgbWF0Y2guZ2FtZVRpbWVIb3VyID0gbWF0Y2guZ2FtZVRpbWUuc3BsaXQoJywgJylbMV07XG4gICAgICAgIG1hdGNoLmNsYXNzID0gbWF0Y2guaXNMaXZlID8gJ2Nxei1saXZlJyA6ICcnO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==