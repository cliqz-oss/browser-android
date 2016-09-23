System.register('mobile-touch/longpress', [], function (_export) {
	/* global CliqzUtils */
	/**
 * @namespace mobile-touch
 */
	'use strict';

	var _default;

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

	return {
		setters: [],
		execute: function () {
			_default =
			/**
   * @class Longpress
   * @constructor
   * @param settings
   * @param longpressCallback
   * @param tapCallback
   */
			function _default(elements, longpressCallback, tapCallback) {
				_classCallCheck(this, _default);

				var self = this;
				this.touchTimer = undefined;
				this.isTapBlocked = false;

				function clearTimer() {
					clearTimeout(self.touchTimer);
					self.touchTimer = null;
				}

				CliqzUtils.addEventListenerToElements(elements, 'touchstart', function () {
					self.touchTimer = setTimeout(function (context) {
						clearTimer();
						longpressCallback(context);
					}, 500, this);
				});

				CliqzUtils.addEventListenerToElements(elements, 'touchend', function () {
					if (self.touchTimer) {
						clearTimer();
						tapCallback(this);
					} else if (self.isTapBlocked) {
						self.isTapBlocked = false;
					}
				});

				CliqzUtils.addEventListenerToElements(elements, 'touchmove', function () {
					self.isTapBlocked = true;
					clearTimer();
				});
			};

			_export('default', _default);
		}
	};
});