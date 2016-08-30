System.register("antitracking/fixed-size-cache", [], function (_export) {
  "use strict";

  /* Fixed length lookup cache. Allows expensive operations to be cached for later lookup. Once
   * the cache limit is exceeded, least recently used values are removed.
   */

  var _default, LRU;

  var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  return {
    setters: [],
    execute: function () {
      _default = (function () {

        /* @param {function} buildValue - used to build a new value from key in case of cache miss.
         * @param {number} size - maximum elements stored in cache.
         * @param {function} buildKey - [Optional] used to extract key from argument.
         */

        function _default(buildValue, size, buildKey) {
          _classCallCheck(this, _default);

          this._buildValue = buildValue;
          this._buildKey = buildKey;
          this._maxKeySize = 1000;

          // Statistics
          this._hitCounter = 0;
          this._missCounter = 0;

          this.lru = new LRU(size);
        }

        /* Try to retrieve the value associated with `key` from the cache. If it's
         * not present, build it using `buildValue` and store it in the cache.
         *
         * This method always returns a value either from the LRU cache, or from a
         * direct call to `buildValue`.
         */

        _createClass(_default, [{
          key: "get",
          value: function get(argument) {
            var key = this._buildKey ? this._buildKey(argument) : argument;
            var value = this.lru.get(key);

            if (value !== undefined) {
              // Cache hit
              this._hitCounter++;
              return value;
            } else {
              // Cache miss
              this._missCounter++;

              // Compute value
              value = this._buildValue(argument);

              // if key is large, don't cache
              if (!key || key.length > this._maxKeySize) {
                return value;
              }

              this.lru.set(key, value);
              return value;
            }
          }
        }]);

        return _default;
      })();

      _export("default", _default);

      LRU = (function () {
        function LRU(size) {
          var _this = this;

          _classCallCheck(this, LRU);

          this.maxSize = size;

          // LRU structure
          this.reset = function () {
            _this.cache = new Map();
            _this.head = null;
            _this.tail = null;
            _this.size = 0;
          };
          this.reset();
        }

        /* Retrieve value associated with `key` from cache. If it doesn't
         * exist, return `undefined`, otherwise, update position of the
         * entry to "most recent seen".
         *
         * @param key - Key of value we want to get.
         */

        _createClass(LRU, [{
          key: "get",
          value: function get(key) {
            var node = this.cache.get(key);

            if (node) {
              this._touch(node);
              return node.value;
            } else {
              return undefined;
            }
          }

          /* Associate a new `value` to `key` in cache. If `key` isn't already
           * present in cache, create a new node at the position "most recent seen".
           * Otherwise, change the value associated with `key` and refresh the
           * position of the entry to "most recent seen".
           *
           * @param key   - Key add to the cache.
           * @param value - Value associated with key.
           */
        }, {
          key: "set",
          value: function set(key, value) {
            var node = this.cache.get(key);

            if (node) {
              // Hit - update value
              node.value = value;
              this._touch(node);
            } else {
              // Miss - Create a new node
              node = this._newNode(key, value);

              // Forget about oldest node
              if (this.size >= this.maxSize) {
                this.cache["delete"](this.tail.key);
                this._remove(this.tail);
              }

              this.cache.set(key, node);
              this._pushFront(node);
            }
          }

          // Private interface (Linked List)

          /* Create a new node (key, value) to store in the cache */
        }, {
          key: "_newNode",
          value: function _newNode(key, value) {
            return {
              "prev": null,
              "next": null,
              "key": key,
              "value": value
            };
          }

          /* Refresh timestamp of `node` by moving it to the front of the list.
           * It the becomes the (key, value) seen most recently.
           */
        }, {
          key: "_touch",
          value: function _touch(node) {
            this._remove(node);
            this._pushFront(node);
          }

          /* Remove `node` from the list. */
        }, {
          key: "_remove",
          value: function _remove(node) {
            if (node) {
              // Update previous node
              if (node.prev === null) {
                this.head = node.next;
              } else {
                node.prev.next = node.next;
              }

              // Update next node
              if (node.next === null) {
                this.tail = node.prev;
              } else {
                node.next.prev = node.prev;
              }

              this.size--;
            }
          }

          /* Add `node` in front of the list (most recent element). */
        }, {
          key: "_pushFront",
          value: function _pushFront(node) {
            if (node) {
              // Replace first node of the list
              node.prev = null;
              node.next = this.head;

              if (this.head !== null) {
                this.head.prev = node;
              }

              this.head = node;

              // Case: List was empty
              if (this.tail === null) {
                this.tail = node;
              }

              this.size++;
            }
          }
        }]);

        return LRU;
      })();
    }
  };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFudGl0cmFja2luZy9maXhlZC1zaXplLWNhY2hlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxjQUFZLENBQUM7Ozs7OztnQkF5RFAsR0FBRzs7Ozs7Ozs7Ozs7Ozs7OztBQTlDSSwwQkFBQyxVQUFVLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTs7O0FBQ3RDLGNBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO0FBQzlCLGNBQUksQ0FBQyxTQUFTLEdBQUssUUFBUSxDQUFDO0FBQzVCLGNBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDOzs7QUFHeEIsY0FBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUM7QUFDckIsY0FBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUM7O0FBRXRCLGNBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDMUI7Ozs7Ozs7Ozs7O2lCQVFFLGFBQUMsUUFBUSxFQUFFO0FBQ1osZ0JBQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxRQUFRLENBQUM7QUFDakUsZ0JBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOztBQUU5QixnQkFBSSxLQUFLLEtBQUssU0FBUyxFQUFFOztBQUV2QixrQkFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ25CLHFCQUFPLEtBQUssQ0FBQzthQUNkLE1BQ0k7O0FBRUgsa0JBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7O0FBR3BCLG1CQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQzs7O0FBR25DLGtCQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRTtBQUN6Qyx1QkFBTyxLQUFLLENBQUM7ZUFDZDs7QUFFRCxrQkFBSSxDQUFD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QUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7ZUFDNUI7O0FBRUQsa0JBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNiO1dBQ0Y7Ozs7O2lCQUdTLG9CQUFDLElBQUksRUFBRTtBQUNmLGdCQUFJLElBQUksRUFBRTs7QUFFUixrQkFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDakIsa0JBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQzs7QUFFdEIsa0JBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEVBQUU7QUFDdEIsb0JBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztlQUN2Qjs7QUFFRCxrQkFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7OztBQUdqQixrQkFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtBQUN0QixvQkFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7ZUFDbEI7O0FBRUQsa0JBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzthQUNiO1dBQ0Y7OztlQTlIRyxHQUFHIiwiZmlsZSI6ImFudGl0cmFja2luZy9maXhlZC1zaXplLWNhY2hlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIEZpeGVkIGxlbmd0aCBsb29rdXAgY2FjaGUuIEFsbG93cyBleHBlbnNpdmUgb3BlcmF0aW9ucyB0byBiZSBjYWNoZWQgZm9yIGxhdGVyIGxvb2t1cC4gT25jZVxuICogdGhlIGNhY2hlIGxpbWl0IGlzIGV4Y2VlZGVkLCBsZWFzdCByZWNlbnRseSB1c2VkIHZhbHVlcyBhcmUgcmVtb3ZlZC5cbiAqL1xuZXhwb3J0IGRlZmF1bHQgY2xhc3Mge1xuXG4gIC8qIEBwYXJhbSB7ZnVuY3Rpb259IGJ1aWxkVmFsdWUgLSB1c2VkIHRvIGJ1aWxkIGEgbmV3IHZhbHVlIGZyb20ga2V5IGluIGNhc2Ugb2YgY2FjaGUgbWlzcy5cbiAgICogQHBhcmFtIHtudW1iZXJ9IHNpemUgLSBtYXhpbXVtIGVsZW1lbnRzIHN0b3JlZCBpbiBjYWNoZS5cbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gYnVpbGRLZXkgLSBbT3B0aW9uYWxdIHVzZWQgdG8gZXh0cmFjdCBrZXkgZnJvbSBhcmd1bWVudC5cbiAgICovXG4gIGNvbnN0cnVjdG9yKGJ1aWxkVmFsdWUsIHNpemUsIGJ1aWxkS2V5KSB7XG4gICAgdGhpcy5fYnVpbGRWYWx1ZSA9IGJ1aWxkVmFsdWU7XG4gICAgdGhpcy5fYnVpbGRLZXkgICA9IGJ1aWxkS2V5O1xuICAgIHRoaXMuX21heEtleVNpemUgPSAxMDAwO1xuXG4gICAgLy8gU3RhdGlzdGljc1xuICAgIHRoaXMuX2hpdENvdW50ZXIgPSAwO1xuICAgIHRoaXMuX21pc3NDb3VudGVyID0gMDtcblxuICAgIHRoaXMubHJ1ID0gbmV3IExSVShzaXplKTtcbiAgfVxuXG4gIC8qIFRyeSB0byByZXRyaWV2ZSB0aGUgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIGBrZXlgIGZyb20gdGhlIGNhY2hlLiBJZiBpdCdzXG4gICAqIG5vdCBwcmVzZW50LCBidWlsZCBpdCB1c2luZyBgYnVpbGRWYWx1ZWAgYW5kIHN0b3JlIGl0IGluIHRoZSBjYWNoZS5cbiAgICpcbiAgICogVGhpcyBtZXRob2QgYWx3YXlzIHJldHVybnMgYSB2YWx1ZSBlaXRoZXIgZnJvbSB0aGUgTFJVIGNhY2hlLCBvciBmcm9tIGFcbiAgICogZGlyZWN0IGNhbGwgdG8gYGJ1aWxkVmFsdWVgLlxuICAgKi9cbiAgZ2V0KGFyZ3VtZW50KSB7XG4gICAgY29uc3Qga2V5ID0gdGhpcy5fYnVpbGRLZXkgPyB0aGlzLl9idWlsZEtleShhcmd1bWVudCkgOiBhcmd1bWVudDtcbiAgICBsZXQgdmFsdWUgPSB0aGlzLmxydS5nZXQoa2V5KTtcblxuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBDYWNoZSBoaXRcbiAgICAgIHRoaXMuX2hpdENvdW50ZXIrKztcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICAvLyBDYWNoZSBtaXNzXG4gICAgICB0aGlzLl9taXNzQ291bnRlcisrO1xuXG4gICAgICAvLyBDb21wdXRlIHZhbHVlXG4gICAgICB2YWx1ZSA9IHRoaXMuX2J1aWxkVmFsdWUoYXJndW1lbnQpO1xuXG4gICAgICAvLyBpZiBrZXkgaXMgbGFyZ2UsIGRvbid0IGNhY2hlXG4gICAgICBpZiAoIWtleSB8fCBrZXkubGVuZ3RoID4gdGhpcy5fbWF4S2V5U2l6ZSkge1xuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICB9XG5cbiAgICAgIHRoaXMubHJ1LnNldChrZXksIHZhbHVlKTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuXG5jbGFzcyBMUlUge1xuICBjb25zdHJ1Y3RvcihzaXplKSB7XG4gICAgdGhpcy5tYXhTaXplID0gc2l6ZTtcblxuICAgIC8vIExSVSBzdHJ1Y3R1cmVcbiAgICB0aGlzLnJlc2V0ID0gKCkgPT4ge1xuICAgICAgdGhpcy5jYWNoZSA9IG5ldyBNYXAoKTtcbiAgICAgIHRoaXMuaGVhZCAgPSBudWxsO1xuICAgICAgdGhpcy50YWlsICA9IG51bGw7XG4gICAgICB0aGlzLnNpemUgID0gMDtcbiAgICB9O1xuICAgIHRoaXMucmVzZXQoKTtcbiAgfVxuXG4gIC8qIFJldHJpZXZlIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCBga2V5YCBmcm9tIGNhY2hlLiBJZiBpdCBkb2Vzbid0XG4gICAqIGV4aXN0LCByZXR1cm4gYHVuZGVmaW5lZGAsIG90aGVyd2lzZSwgdXBkYXRlIHBvc2l0aW9uIG9mIHRoZVxuICAgKiBlbnRyeSB0byBcIm1vc3QgcmVjZW50IHNlZW5cIi5cbiAgICpcbiAgICogQHBhcmFtIGtleSAtIEtleSBvZiB2YWx1ZSB3ZSB3YW50IHRvIGdldC5cbiAgICovXG4gIGdldChrZXkpIHtcbiAgICBsZXQgbm9kZSA9IHRoaXMuY2FjaGUuZ2V0KGtleSk7XG5cbiAgICBpZiAobm9kZSkge1xuICAgICAgdGhpcy5fdG91Y2gobm9kZSk7XG4gICAgICByZXR1cm4gbm9kZS52YWx1ZTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgfVxuXG4gIC8qIEFzc29jaWF0ZSBhIG5ldyBgdmFsdWVgIHRvIGBrZXlgIGluIGNhY2hlLiBJZiBga2V5YCBpc24ndCBhbHJlYWR5XG4gICAqIHByZXNlbnQgaW4gY2FjaGUsIGNyZWF0ZSBhIG5ldyBub2RlIGF0IHRoZSBwb3NpdGlvbiBcIm1vc3QgcmVjZW50IHNlZW5cIi5cbiAgICogT3RoZXJ3aXNlLCBjaGFuZ2UgdGhlIHZhbHVlIGFzc29jaWF0ZWQgd2l0aCBga2V5YCBhbmQgcmVmcmVzaCB0aGVcbiAgICogcG9zaXRpb24gb2YgdGhlIGVudHJ5IHRvIFwibW9zdCByZWNlbnQgc2VlblwiLlxuICAgKlxuICAgKiBAcGFyYW0ga2V5ICAgLSBLZXkgYWRkIHRvIHRoZSBjYWNoZS5cbiAgICogQHBhcmFtIHZhbHVlIC0gVmFsdWUgYXNzb2NpYXRlZCB3aXRoIGtleS5cbiAgICovXG4gIHNldChrZXksIHZhbHVlKSB7XG4gICAgbGV0IG5vZGUgPSB0aGlzLmNhY2hlLmdldChrZXkpO1xuXG4gICAgaWYgKG5vZGUpIHtcbiAgICAgIC8vIEhpdCAtIHVwZGF0ZSB2YWx1ZVxuICAgICAgbm9kZS52YWx1ZSA9IHZhbHVlO1xuICAgICAgdGhpcy5fdG91Y2gobm9kZSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgLy8gTWlzcyAtIENyZWF0ZSBhIG5ldyBub2RlXG4gICAgICBub2RlID0gdGhpcy5fbmV3Tm9kZShrZXksIHZhbHVlKTtcblxuICAgICAgLy8gRm9yZ2V0IGFib3V0IG9sZGVzdCBub2RlXG4gICAgICBpZiAodGhpcy5zaXplID49IHRoaXMubWF4U2l6ZSkge1xuICAgICAgICB0aGlzLmNhY2hlLmRlbGV0ZSh0aGlzLnRhaWwua2V5KTtcbiAgICAgICAgdGhpcy5fcmVtb3ZlKHRoaXMudGFpbCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuY2FjaGUuc2V0KGtleSwgbm9kZSk7XG4gICAgICB0aGlzLl9wdXNoRnJvbnQobm9kZSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUHJpdmF0ZSBpbnRlcmZhY2UgKExpbmtlZCBMaXN0KVxuXG4gIC8qIENyZWF0ZSBhIG5ldyBub2RlIChrZXksIHZhbHVlKSB0byBzdG9yZSBpbiB0aGUgY2FjaGUgKi9cbiAgX25ld05vZGUoa2V5LCB2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBcInByZXZcIjogIG51bGwsXG4gICAgICBcIm5leHRcIjogIG51bGwsXG4gICAgICBcImtleVwiOiAgIGtleSxcbiAgICAgIFwidmFsdWVcIjogdmFsdWVcbiAgICB9O1xuICB9XG5cbiAgLyogUmVmcmVzaCB0aW1lc3RhbXAgb2YgYG5vZGVgIGJ5IG1vdmluZyBpdCB0byB0aGUgZnJvbnQgb2YgdGhlIGxpc3QuXG4gICAqIEl0IHRoZSBiZWNvbWVzIHRoZSAoa2V5LCB2YWx1ZSkgc2VlbiBtb3N0IHJlY2VudGx5LlxuICAgKi9cbiAgX3RvdWNoKG5vZGUpIHtcbiAgICB0aGlzLl9yZW1vdmUobm9kZSk7XG4gICAgdGhpcy5fcHVzaEZyb250KG5vZGUpO1xuICB9XG5cbiAgLyogUmVtb3ZlIGBub2RlYCBmcm9tIHRoZSBsaXN0LiAqL1xuICBfcmVtb3ZlKG5vZGUpIHtcbiAgICBpZiAobm9kZSkge1xuICAgICAgLy8gVXBkYXRlIHByZXZpb3VzIG5vZGVcbiAgICAgIGlmIChub2RlLnByZXYgPT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5oZWFkID0gbm9kZS5uZXh0O1xuICAgICAgfVxuICAgICAgZWxzZSB7XG4gICAgICAgIG5vZGUucHJldi5uZXh0ID0gbm9kZS5uZXh0O1xuICAgICAgfVxuXG4gICAgICAvLyBVcGRhdGUgbmV4dCBub2RlXG4gICAgICBpZiAobm9kZS5uZXh0ID09PSBudWxsKSB7XG4gICAgICAgIHRoaXMudGFpbCA9IG5vZGUucHJldjtcbiAgICAgIH1cbiAgICAgIGVsc2Uge1xuICAgICAgICBub2RlLm5leHQucHJldiA9IG5vZGUucHJldjtcbiAgICAgIH1cblxuICAgICAgdGhpcy5zaXplLS07XG4gICAgfVxuICB9XG5cbiAgLyogQWRkIGBub2RlYCBpbiBmcm9udCBvZiB0aGUgbGlzdCAobW9zdCByZWNlbnQgZWxlbWVudCkuICovXG4gIF9wdXNoRnJvbnQobm9kZSkge1xuICAgIGlmIChub2RlKSB7XG4gICAgICAvLyBSZXBsYWNlIGZpcnN0IG5vZGUgb2YgdGhlIGxpc3RcbiAgICAgIG5vZGUucHJldiA9IG51bGw7XG4gICAgICBub2RlLm5leHQgPSB0aGlzLmhlYWQ7XG5cbiAgICAgIGlmICh0aGlzLmhlYWQgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy5oZWFkLnByZXYgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLmhlYWQgPSBub2RlO1xuXG4gICAgICAvLyBDYXNlOiBMaXN0IHdhcyBlbXB0eVxuICAgICAgaWYgKHRoaXMudGFpbCA9PT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRhaWwgPSBub2RlO1xuICAgICAgfVxuXG4gICAgICB0aGlzLnNpemUrKztcbiAgICB9XG4gIH1cbn1cbiJdfQ==