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