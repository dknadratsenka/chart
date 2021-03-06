"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var LineCanvas = function () {
	function LineCanvas(chart, key, columns, color, name, offsetY, maxY, canvas) {
		_classCallCheck(this, LineCanvas);

		this.chart = chart;
		this.key = key;
		this.canvas = canvas;
		this.columns = columns;
		this.color = color;
		this.name = name;
		this.offsetY = offsetY;
		this.scaleX;
		this.columnsToDraw = columns;
		this.maxY = maxY;
		this.active = true;
		this.switcher = null;
		this.selectedCoords = null;
		this.draw = this.chart.throttle(this.draw, 20, this);
		this.drawArcs = this.chart.throttle(this.drawArcs, 20, this);
	}

	_createClass(LineCanvas, [{
		key: "toggle",
		value: function toggle() {
			var state = !this.active;
			this.active = state;
			if (state) {
				this.switcher.style.background = this.color;
				this.switcher.style.border = "none";
			} else {
				this.switcher.style.background = "white";
				this.switcher.style.border = "1px solid " + this.color;
			}
		}
	}, {
		key: "recalculateBoundaries",
		value: function recalculateBoundaries(leftIndex, rightIndex) {
			this.scaleX = this.canvas.width / (this.columns.length - 1 - leftIndex - rightIndex);
			this.columnsToDraw = this.chart.applyBoundaries(this.columns, leftIndex, rightIndex);
		}
	}, {
		key: "draw",
		value: function draw() {
			this.canvas.style.display = "none";
			var chartHeight = Math.round(this.canvas.height - this.offsetY * 2);
			var context = this.canvas.getContext('2d');
			var scaleY = chartHeight / this.maxY;
			context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			context.beginPath();
			context.strokeStyle = this.color;
			context.lineWidth = 2;
			context.moveTo(0, this.offsetY + scaleY * this.columnsToDraw[0]);
			for (var j = 1; j < this.columnsToDraw.length; j++) {
				var scaleX = this.scaleX || this.chart.scaleX;
				context.lineTo(scaleX * j, this.offsetY + scaleY * this.columnsToDraw[j]);
			}
			context.stroke();
			this.canvas.style.display = "block";
		}
	}, {
		key: "drawArcs",
		value: function drawArcs(coords) {
			this.canvas.style.display = "none";
			var context = this.canvas.getContext('2d');
			if (coords) {
				context.beginPath();
				context.fillStyle = "white";
				context.arc(coords.x, coords.y, 3, 0, 2 * Math.PI, true);
				context.fill();
				context.stroke();
			}
			this.selectedCoords = coords;
			this.canvas.style.display = "block";
		}
	}, {
		key: "getClosestCoordsByX",
		value: function getClosestCoordsByX() {
			var coordX = this.chart.selectedCoordX;
			var scaleX = this.scaleX || this.chart.scaleX;
			var index = Math.round(coordX / scaleX);

			var chartHeight = Math.round(this.canvas.height - this.offsetY * 2);
			var scaleY = chartHeight / this.maxY;
			var y = Math.round(this.offsetY + scaleY * this.columnsToDraw[index]);
			var x = scaleX * index;
			if (isNaN(y) || isNaN(x)) {
				return null;
			}
			return { y: y, x: x, valueY: this.columnsToDraw[index], indexX: index };
		}
	}]);

	return LineCanvas;
}();