System.register("core/storage", ["platform/storage"], function (_export) {
	/**
 * @namespace core
 */
	"use strict";

	var storage, _default;

	var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	return {
		setters: [function (_platformStorage) {
			storage = _platformStorage["default"];
		}],
		execute: function () {
			_default = (function () {
				/**
    * @class Storage
    * @constructor
    */

				function _default() {
					_classCallCheck(this, _default);

					this.storage = storage;
					this.getItem = this.storage.getItem.bind(this.storage);
					this.setItem = this.storage.setItem.bind(this.storage);
					this.removeItem = this.storage.removeItem.bind(this.storage);
					this.clear = this.storage.clear.bind(this.storage);
				}

				/**
    * @method setObject
    * @param key {string}
    * @param object
    */

				_createClass(_default, [{
					key: "setObject",
					value: function setObject(key, object) {
						this.storage.setItem(key, JSON.stringify(object));
					}

					/**
     * @method getObject
     * @param key {string}
     * @param notFound {Boolean}
     */
				}, {
					key: "getObject",
					value: function getObject(key) {
						var notFound = arguments.length <= 1 || arguments[1] === undefined ? false : arguments[1];

						var o = storage.getItem(key);
						if (o) {
							return JSON.parse(o);
						}
						return notFound;
					}
				}]);

				return _default;
			})();

			_export("default", _default);
		}
	};
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvcmUvc3RvcmFnZS5lcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVNZLHdCQUFHOzs7QUFDYixTQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztBQUN2QixTQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDdkQsU0FBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZELFNBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM3RCxTQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDbkQ7Ozs7Ozs7Ozs7WUFNUSxtQkFBQyxHQUFHLEVBQUUsTUFBTSxFQUFFO0FBQ3RCLFVBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7TUFDbEQ7Ozs7Ozs7OztZQU1RLG1CQUFDLEdBQUcsRUFBb0I7VUFBbEIsUUFBUSx5REFBRyxLQUFLOztBQUM3QixVQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9CLFVBQUksQ0FBQyxFQUFFO0FBQ04sY0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO09BQ3JCO0FBQ0QsYUFBTyxRQUFRLENBQUM7TUFDakIiLCJmaWxlIjoiY29yZS9zdG9yYWdlLmVzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHN0b3JhZ2UgZnJvbSBcInBsYXRmb3JtL3N0b3JhZ2VcIjtcbi8qKlxuKiBAbmFtZXNwYWNlIGNvcmVcbiovXG5leHBvcnQgZGVmYXVsdCBjbGFzcyB7XG4gIC8qKlxuICAqIEBjbGFzcyBTdG9yYWdlXG4gICogQGNvbnN0cnVjdG9yXG4gICovXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuc3RvcmFnZSA9IHN0b3JhZ2U7XG5cdFx0dGhpcy5nZXRJdGVtID0gdGhpcy5zdG9yYWdlLmdldEl0ZW0uYmluZCh0aGlzLnN0b3JhZ2UpO1xuXHRcdHRoaXMuc2V0SXRlbSA9IHRoaXMuc3RvcmFnZS5zZXRJdGVtLmJpbmQodGhpcy5zdG9yYWdlKTtcblx0XHR0aGlzLnJlbW92ZUl0ZW0gPSB0aGlzLnN0b3JhZ2UucmVtb3ZlSXRlbS5iaW5kKHRoaXMuc3RvcmFnZSk7XG5cdFx0dGhpcy5jbGVhciA9IHRoaXMuc3RvcmFnZS5jbGVhci5iaW5kKHRoaXMuc3RvcmFnZSk7XG5cdH1cbiAgLyoqXG4gICogQG1ldGhvZCBzZXRPYmplY3RcbiAgKiBAcGFyYW0ga2V5IHtzdHJpbmd9XG4gICogQHBhcmFtIG9iamVjdFxuICAqL1xuXHRzZXRPYmplY3Qoa2V5LCBvYmplY3QpIHtcblx0XHR0aGlzLnN0b3JhZ2Uuc2V0SXRlbShrZXksIEpTT04uc3RyaW5naWZ5KG9iamVjdCkpO1xuXHR9XG4gIC8qKlxuICAqIEBtZXRob2QgZ2V0T2JqZWN0XG4gICogQHBhcmFtIGtleSB7c3RyaW5nfVxuICAqIEBwYXJhbSBub3RGb3VuZCB7Qm9vbGVhbn1cbiAgKi9cblx0Z2V0T2JqZWN0KGtleSwgbm90Rm91bmQgPSBmYWxzZSkge1xuXHQgIGNvbnN0IG8gPSBzdG9yYWdlLmdldEl0ZW0oa2V5KTtcblx0ICBpZiAobykge1xuXHQgIFx0cmV0dXJuIEpTT04ucGFyc2Uobyk7XG5cdCAgfVxuXHQgIHJldHVybiBub3RGb3VuZDtcblx0fVxufVxuIl19