System.register('antitracking/hash', ['core/resource-loader'], function (_export) {
    'use strict';

    var ResourceLoader;

    _export('HashProb', HashProb);

    function HashProb() {
        this.probHashLogM = null;
        this.probHashThreshold = null;
        this.probHashChars = {};
        'abcdefghijklmnopqrstuvwxyz1234567890.- '.split('').forEach((function (e, idx) {
            this.probHashChars[e] = idx;
        }).bind(this));

        this.probLoader = new ResourceLoader(['antitracking', 'prob.json'], {
            remoteURL: 'https://cdn.cliqz.com/anti-tracking/prob.json',
            cron: 24 * 60 * 60 * 1000 // daily
        });

        this.probLoader.load().then((function (data) {
            this.probHashLogM = data.logM;
            this.probHashThreshold = data.thresh;
        }).bind(this));
        this.probLoader.onUpdate((function (data) {
            this.probHashLogM = data.logM;
            this.probHashThreshold = data.thresh;
        }).bind(this));
    }

    return {
        setters: [function (_coreResourceLoader) {
            ResourceLoader = _coreResourceLoader['default'];
        }],
        execute: function () {

            HashProb.prototype.isHashProb = function (str) {
                if (!this.probHashLogM || !this.probHashThreshold) {
                    return 0;
                }
                var logProb = 0.0;
                var transC = 0;
                str = str.toLowerCase().replace(/[^a-z0-9\.\- ]/g, '');
                for (var i = 0; i < str.length - 1; i++) {
                    var pos1 = this.probHashChars[str[i]];
                    var pos2 = this.probHashChars[str[i + 1]];

                    logProb += this.probHashLogM[pos1][pos2];
                    transC += 1;
                }
                if (transC > 0) {
                    return Math.exp(logProb / transC);
                } else {
                    return Math.exp(logProb);
                }
            };

            HashProb.prototype.isHash = function (str) {
                var p = this.isHashProb(str);
                return p < this.probHashThreshold;
            };
        }
    };
});
//# sourceMappingURL=data:application/json;base64,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R0FBRyxVQUFTLEdBQUcsRUFBRTtBQUN0QyxvQkFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM3Qix1QkFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFFO2FBQ3ZDLENBQUMiLCJmaWxlIjoiYW50aXRyYWNraW5nL2hhc2guanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVzb3VyY2VMb2FkZXIgZnJvbSAnY29yZS9yZXNvdXJjZS1sb2FkZXInO1xuXG5leHBvcnQgZnVuY3Rpb24gSGFzaFByb2IoKSB7XG4gICAgdGhpcy5wcm9iSGFzaExvZ00gPSBudWxsO1xuICAgIHRoaXMucHJvYkhhc2hUaHJlc2hvbGQgPSBudWxsO1xuICAgIHRoaXMucHJvYkhhc2hDaGFycyA9IHt9O1xuICAgICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejEyMzQ1Njc4OTAuLSAnLnNwbGl0KCcnKS5mb3JFYWNoKGZ1bmN0aW9uKGUsIGlkeCkge1xuICAgICAgICB0aGlzLnByb2JIYXNoQ2hhcnNbZV0gPSBpZHg7XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMucHJvYkxvYWRlciA9IG5ldyBSZXNvdXJjZUxvYWRlcihbJ2FudGl0cmFja2luZycsICdwcm9iLmpzb24nXSwge1xuICAgICAgICByZW1vdGVVUkw6ICdodHRwczovL2Nkbi5jbGlxei5jb20vYW50aS10cmFja2luZy9wcm9iLmpzb24nLFxuICAgICAgICBjcm9uOiAyNCAqIDYwICogNjAgKiAxMDAwICAvLyBkYWlseVxuICAgIH0pO1xuXG4gICAgdGhpcy5wcm9iTG9hZGVyLmxvYWQoKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgdGhpcy5wcm9iSGFzaExvZ00gPSBkYXRhLmxvZ007XG4gICAgICAgIHRoaXMucHJvYkhhc2hUaHJlc2hvbGQgPSBkYXRhLnRocmVzaDtcbiAgICB9LmJpbmQodGhpcykpO1xuICAgIHRoaXMucHJvYkxvYWRlci5vblVwZGF0ZShmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIHRoaXMucHJvYkhhc2hMb2dNID0gZGF0YS5sb2dNO1xuICAgICAgICB0aGlzLnByb2JIYXNoVGhyZXNob2xkID0gZGF0YS50aHJlc2g7XG4gICAgfS5iaW5kKHRoaXMpKTtcbn1cblxuSGFzaFByb2IucHJvdG90eXBlLmlzSGFzaFByb2IgPSBmdW5jdGlvbihzdHIpIHtcbiAgICBpZiAoIXRoaXMucHJvYkhhc2hMb2dNIHx8ICF0aGlzLnByb2JIYXNoVGhyZXNob2xkKSB7XG4gICAgICByZXR1cm4gMDtcbiAgICB9XG4gICAgdmFyIGxvZ1Byb2IgPSAwLjA7XG4gICAgdmFyIHRyYW5zQyA9IDA7XG4gICAgc3RyID0gc3RyLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvW15hLXowLTlcXC5cXC0gXS9nLCcnKTtcbiAgICBmb3IodmFyIGk9MDtpPHN0ci5sZW5ndGgtMTtpKyspIHtcbiAgICAgICAgdmFyIHBvczEgPSB0aGlzLnByb2JIYXNoQ2hhcnNbc3RyW2ldXTtcbiAgICAgICAgdmFyIHBvczIgPSB0aGlzLnByb2JIYXNoQ2hhcnNbc3RyW2krMV1dO1xuXG4gICAgICAgIGxvZ1Byb2IgKz0gdGhpcy5wcm9iSGFzaExvZ01bcG9zMV1bcG9zMl07XG4gICAgICAgIHRyYW5zQyArPSAxO1xuICAgIH1cbiAgICBpZiAodHJhbnNDID4gMCkge1xuICAgICAgICByZXR1cm4gTWF0aC5leHAobG9nUHJvYi90cmFuc0MpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgcmV0dXJuIE1hdGguZXhwKGxvZ1Byb2IpO1xuICAgIH1cbn07XG5cbkhhc2hQcm9iLnByb3RvdHlwZS5pc0hhc2ggPSBmdW5jdGlvbihzdHIpIHtcbiAgICB2YXIgcCA9IHRoaXMuaXNIYXNoUHJvYihzdHIpO1xuICAgIHJldHVybiAocCA8IHRoaXMucHJvYkhhc2hUaHJlc2hvbGQpO1xufTtcbiJdfQ==