"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Chart = function () {
	function Chart(id, data, width, height) {
		_classCallCheck(this, Chart);

		this.parent = null;
		this.maxAxisYColumns = 6;
		this.maxAxisColumns = 6;
		this.textPadding = 15;
		this.id = id;
		this.container = null;
		this.columns = data.columns;
		this.names = data.names;
		this.types = data.types;
		this.colors = data.colors;
		this.maxY = null;
		this.lastMaxY = null;
		this.maxYArea = null;
		this.maxX = null;
		this.minX = null;
		this.width = width;
		this.fullWidth = width;
		this.fullHeight = height;
		this.height;
		this.switcherContainerHeight = 50;
		this.scaleY = 1;
		this.verticalCanvas = null;
		this.lines = [];
		this.areaLines = [];
		this.axisCanvasX;
		this.fadingCanvas = null;
		this.selectedCoordX;
		this.DRAG_ITEM_WIDTH = 10;
		this.leftBlock;
		this.rightBlock;
		this.xValues = [];
		this.parseXValues(data);
		this.parseLineColumns(data);
		this.slowMode = this.xValues.length > 100000;
		this.nightMode = false;
		this.drawAxisX = this.throttle(this.drawAxisX, 300, this);
		this.applyScales = this.throttle(this.applyScales, this.slowMode ? 300 : 50, this);
		this.onMouseMove = this.throttle(this.onMouseMove, this.slowMode ? 300 : 50, this);
	}

	_createClass(Chart, [{
		key: "init",
		value: function init() {
			if (!document.getElementById(this.id)) {
				window.addEventListener("DOMContentLoaded", this.onDomReady.bind(this));
			} else {
				this.onDomReady();
			}
		}
	}, {
		key: "parseLineColumns",
		value: function parseLineColumns(data) {
			var lineColumns = data.columns.filter(function (item) {
				return data.types[item[0]] === Chart.TYPE.LINE;
			});

			this.maxY = this.findMaxInArrays(lineColumns);
			this.maxYArea = this.maxY;

			for (var i = 0; i < lineColumns.length; i++) {
				var columns = lineColumns[i];
				var key = columns.splice(0, 1);
				var color = this.colors[key];
				var name = this.names[key];
				var lineCanvas = new LineCanvas(this, key, columns, color, name, this.textPadding, this.maxY);
				this.lines.push(lineCanvas);

				var areaLineCanvas = new LineCanvas(this, key, columns, color, name, 0, this.maxY);
				this.areaLines.push(areaLineCanvas);
			}
		}
	}, {
		key: "parseXValues",
		value: function parseXValues(data) {
			var _this = this;

			var xValues = data.columns.filter(function (item) {
				return _this.types[item[0]] === Chart.TYPE.X;
			})[0];
			xValues.splice(0, 1);
			this.scaleX = this.width / (xValues.length - 1);
			this.xValues = xValues;
			this.currentXValues = this.xValues;
		}
	}, {
		key: "onDomReady",
		value: function onDomReady() {
			var container = document.getElementById(this.id);
			if (!container) return;
			container.style.height = this.fullHeight + "px";
			container.style.width = this.fullWidth + "px";

			var areaCanvasHeight = Math.round(this.fullHeight / 6);
			var mainCanvasHeight = this.fullHeight - areaCanvasHeight - this.switcherContainerHeight;
			this.height = this.fullHeight - this.textPadding * 2 - areaCanvasHeight - this.switcherContainerHeight;

			var MARGIN_TOP = 10;
			var areaContainer = this.createControlArea(areaCanvasHeight - MARGIN_TOP);
			areaContainer.style.marginTop = MARGIN_TOP + "px";

			var mainCanvasContainer = document.createElement("div");
			this.container = mainCanvasContainer;

			mainCanvasContainer.style.width = "100%";
			mainCanvasContainer.style.height = mainCanvasHeight + "px";

			container.appendChild(mainCanvasContainer);
			container.appendChild(areaContainer);
			container.appendChild(this.createSwitchersMainContainer());
			container.appendChild(this.createDayNightModeButton());
			this.parent = container;

			this.areaContainer = areaContainer;
			this.createCanvases();
			this.updateScales();
			this.draw();
		}
	}, {
		key: "createDayNightModeButton",
		value: function createDayNightModeButton() {
			var button = document.createElement("span");
			button.innerHTML = "Day/Night mode";
			button.classList.add("day-night-button");
			button.addEventListener("click", this.toggleNightMode.bind(this));
			return button;
		}
	}, {
		key: "findRelativeMouseCoords",
		value: function findRelativeMouseCoords(e) {
			var m_posx = 0,
			    m_posy = 0,
			    e_posx = 0,
			    e_posy = 0,
			    obj = e.target;
			//get mouse position on document crossbrowser
			if (!e) {
				e = window.event;
			}
			if (e.pageX || e.pageY) {
				m_posx = e.pageX;
				m_posy = e.pageY;
			} else if (e.clientX || e.clientY) {
				m_posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
				m_posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
			}
			//get parent element position in document
			if (obj.offsetParent) {
				do {
					e_posx += obj.offsetLeft;
					e_posy += obj.offsetTop;
				} while (obj = obj.offsetParent);
			}
			return { x: m_posx - e_posx, y: m_posy - e_posy };
		}
	}, {
		key: "onMouseMove",
		value: function onMouseMove(event) {
			event.preventDefault();
			var coords = this.findRelativeMouseCoords(event);
			this.selectedCoordX = coords.x;
			for (var i = 0; i < this.lines.length; i++) {
				var line = this.lines[i];
				var lineCoords = line.getClosestCoordsByX();
				if (!line.selectedCoords || lineCoords && lineCoords.indexX !== line.selectedCoords.indexX) {
					line.draw();
					line.drawArcs(lineCoords);
				}
			}
			this.drawVerticalCanvas(coords);
			this.drawTipContainer();
		}
	}, {
		key: "throttle",
		value: function throttle(fn, delay, context) {
			var timeout = null;
			var lastCall = null;

			return function () {
				if (timeout) {
					lastCall = fn.bind.apply(fn, [context].concat(Array.prototype.slice.call(arguments)));
				} else {
					fn.apply(context, arguments);
					timeout = timeOut();
				}

				function timeOut() {
					return setTimeout(function () {
						timeout = null;
						if (typeof lastCall === "function") {
							lastCall();
							lastCall = null;
							timeout = timeOut();
						}
					}, delay);
				}
			};
		}
	}, {
		key: "drawTipContainer",
		value: function drawTipContainer() {
			var _this2 = this;

			while (this.tipContainer.firstChild) {
				this.tipContainer.removeChild(this.tipContainer.firstChild);
			}
			if (this.selectedCoordX) {
				this.tipContainer.style.display = "block";
				this.tipContainer.style.left = this.selectedCoordX - 15 + "px";

				var valuesContainer = document.createElement("div");
				valuesContainer.style.display = "flex";
				valuesContainer.style.justifyContent = "space-around";
				valuesContainer.style.flexDirection = "row";

				var xIndex = null;
				this.lines.forEach(function (line) {
					if (line.selectedCoords && line.active) {
						xIndex = line.selectedCoords.indexX;
						valuesContainer.appendChild(_this2.createTipSelectedLineValue(line.selectedCoords.valueY, line.color, line.name));
					}
				});
				if (typeof xIndex === "number") {
					this.tipContainer.appendChild(this.createTipTitle(xIndex));
					this.tipContainer.appendChild(valuesContainer);
				} else {
					this.tipContainer.style.display = "none";
				}
			} else {
				this.tipContainer.style.display = "none";
			}
		}
	}, {
		key: "createTipTitle",
		value: function createTipTitle(xIndex) {
			var span = document.createElement("span");
			span.classList.add("tip-container-title");
			span.innerHTML = this.formatDateForTip(this.currentXValues[xIndex]);
			return span;
		}
	}, {
		key: "createTipSelectedLineValue",
		value: function createTipSelectedLineValue(value, color, name) {
			var div = document.createElement("div");
			div.style.display = "flex";
			div.style.justifyContent = "center";
			div.style.flexDirection = "column";
			div.style.margin = "5px";

			var valueSpan = document.createElement("span");
			valueSpan.style.color = color;
			valueSpan.style.fontWeight = "700";
			valueSpan.innerHTML = value;

			var nameSpan = document.createElement("span");
			nameSpan.style.color = color;
			nameSpan.innerHTML = name;

			div.appendChild(valueSpan);
			div.appendChild(nameSpan);
			return div;
		}
	}, {
		key: "formatDateForTip",
		value: function formatDateForTip(timeInMillis) {
			var dateStr = new Date(timeInMillis).toDateString();
			var parts = dateStr.split(" ");
			return parts[0] + ", " + parts[1] + " " + parts[2];
		}
	}, {
		key: "drawVerticalCanvas",
		value: function drawVerticalCanvas(coords) {
			var context = this.verticalCanvas.getContext('2d');
			context.beginPath();
			context.clearRect(0, 0, this.verticalCanvas.width, this.verticalCanvas.height);
			if (coords) {
				context.strokeStyle = "#c5c5c5";
				context.lineWidth = 0.3;
				context.moveTo(coords.x, 0);
				context.lineTo(coords.x, this.verticalCanvas.height - this.textPadding);
			}
			context.closePath();
			context.stroke();
		}
	}, {
		key: "getLeftBoundaryIndex",
		value: function getLeftBoundaryIndex() {
			var index = (this.leftBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
			return Math.round(index);
		}
	}, {
		key: "getRightBoundaryIndex",
		value: function getRightBoundaryIndex() {
			var index = (this.rightBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
			return Math.round(index);
		}
	}, {
		key: "findMaxY",
		value: function findMaxY() {
			var leftIndex = this.getLeftBoundaryIndex();
			var rightIndex = this.getRightBoundaryIndex();

			var visibleValuesY = [];
			this.lines.forEach(function (line) {
				if (line.active) {
					line.recalculateBoundaries(leftIndex, rightIndex);
					visibleValuesY.push(line.columnsToDraw);
				}
			});
			return this.findMaxInArrays(visibleValuesY);
		}
	}, {
		key: "findMaxYArea",
		value: function findMaxYArea() {
			var visibleValuesY = [];
			this.lines.forEach(function (line) {
				if (line.active) {
					visibleValuesY.push(line.columns);
				}
			});
			return this.findMaxInArrays(visibleValuesY);
		}
	}, {
		key: "updateScales",
		value: function updateScales() {
			this.selectedCoordX = 0;
			this.drawVerticalCanvas();
			this.drawTipContainer();

			var maxY = this.findMaxY();
			var maxYArea = this.findMaxYArea();

			this.selectedCoordX = 0;
			this.lastMaxY = this.maxY;
			this.maxY = maxY;
			this.maxYArea = maxYArea;
		}
	}, {
		key: "createTipContainer",
		value: function createTipContainer() {
			var tipParent = document.createElement("div");
			tipParent.style.position = "absolute";
			var div = document.createElement("div");
			div.classList.add("tip-container");

			tipParent.appendChild(div);
			return tipParent;
		}
	}, {
		key: "createCanvasContainer",
		value: function createCanvasContainer(height) {
			var div = document.createElement("div");
			div.style.position = "absolute";
			div.style.overflow = "hidden";
			div.style.height = height + "px";
			return div;
		}
	}, {
		key: "createSwitchersMainContainer",
		value: function createSwitchersMainContainer() {
			var switcherContainer = document.createElement("div");
			switcherContainer.style.height = this.switcherContainerHeight + "px";
			switcherContainer.classList.add("line-switcher-main-container");
			for (var i = 0; i < this.lines.length; i++) {
				switcherContainer.appendChild(this.createLineSwitcher(this.lines[i]));
			}
			return switcherContainer;
		}

		/**
   * @param {LineCanvas} line
   */

	}, {
		key: "createLineSwitcher",
		value: function createLineSwitcher(line) {
			var _this3 = this;

			var code = "&#10003";
			var span = document.createElement("span");
			span.innerHTML = code;
			span.style.background = line.color;
			span.classList.add("line-switcher");
			line.switcher = span;
			span.addEventListener("click", function (event) {
				line.toggle();
				var newMaxY = _this3.findMaxY();
				var newMaxYArea = _this3.findMaxYArea();

				var areaCanvas = _this3.findAreaLineByKey(line.key).canvas;
				var chartCanvas = line.canvas;

				chartCanvas.style.opacity = line.active ? 0 : 1;
				areaCanvas.style.opacity = line.active ? 0 : 1;

				_this3.fadeCanvas(areaCanvas, _this3.getClassNameForLineCanvas(line.active, _this3.maxYArea, newMaxYArea));
				_this3.fadeCanvas(line.canvas, _this3.getClassNameForLineCanvas(line.active, _this3.maxY, newMaxY));
				_this3.drawFromLastToNewMaxY();
			});
			var name = document.createElement("span");
			name.innerHTML = line.name;
			name.style.padding = "5px 10px";

			var container = document.createElement("span");
			container.classList.add("line-switcher-container");
			container.appendChild(span);
			container.appendChild(name);

			return container;
		}
	}, {
		key: "getClassNameForLineCanvas",
		value: function getClassNameForLineCanvas(active, oldMaxY, newMaxY) {
			var className = "";
			if (this.isStepChanged(oldMaxY, newMaxY)) {
				var stepIncreased = this.isStepIncreased(oldMaxY, newMaxY);
				className = active ? this.getFadeInClassName(stepIncreased) : this.getFadeOutClassName(stepIncreased);
			} else {
				className = active ? "run-animation-show" : "run-animation-hide";
			}
			return className;
		}
	}, {
		key: "createCanvases",
		value: function createCanvases() {
			for (var i = 0; i < this.lines.length; i++) {
				var _canvasContainer = this.createCanvasContainer(this.container.offsetHeight);
				var canvas = this.createCanvas(this.container.offsetHeight, this.width, true);
				this.lines[i].canvas = canvas;
				_canvasContainer.appendChild(canvas);
				this.container.appendChild(_canvasContainer);
			}

			for (var _i = 0; _i < this.areaLines.length; _i++) {
				var _canvasContainer2 = this.createCanvasContainer(this.areaContainer.offsetHeight);
				var areaCanvas = this.createCanvas(this.areaContainer.offsetHeight, this.width, true);
				this.areaLines[_i].canvas = areaCanvas;
				_canvasContainer2.appendChild(areaCanvas);
				this.areaContainer.appendChild(_canvasContainer2);
			}

			var canvasContainer = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
			this.verticalCanvas = this.createCanvas(this.container.offsetHeight - this.textPadding, this.width);
			canvasContainer.appendChild(this.verticalCanvas);
			this.verticalCanvas.style.zIndex = 10;
			this.verticalCanvas.addEventListener("mousemove", this.onMouseMove.bind(this));

			this.container.appendChild(canvasContainer);

			var canvasContainerX = this.createCanvasContainer(this.container.offsetHeight);
			this.axisCanvasX = this.createCanvasAxisX();
			canvasContainerX.appendChild(this.axisCanvasX);
			this.container.appendChild(canvasContainerX);

			var canvasContainerY = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
			this.axisCanvasY = this.createCanvasAxisY();
			canvasContainerY.appendChild(this.axisCanvasY);
			this.container.appendChild(canvasContainerY);

			var tipContainer = this.createTipContainer();
			this.tipContainer = tipContainer.firstChild;

			this.container.appendChild(tipContainer);
		}
	}, {
		key: "createCanvasAxisY",
		value: function createCanvasAxisY() {
			return this.createAxisCanvas(this.container.offsetHeight - this.textPadding);
		}
	}, {
		key: "createCanvasAxisX",
		value: function createCanvasAxisX() {
			return this.createAxisCanvas(this.container.offsetHeight);
		}
	}, {
		key: "createAxisCanvas",
		value: function createAxisCanvas(height) {
			var canvas = this.createCanvas(height, this.width);
			var context = canvas.getContext('2d');
			context.strokeStyle = "#adadad";
			context.fillStyle = "#adadad";
			context.lineWidth = 0.3;
			context.font = "10px";
			return canvas;
		}
	}, {
		key: "draw",
		value: function draw() {
			this.drawLines();
			this.drawAreaLines();
			this.drawAxisX();
			this.drawAxisY();
		}
	}, {
		key: "drawLines",
		value: function drawLines() {
			for (var i = 0; i < this.lines.length; i++) {
				var line = this.lines[i];
				line.draw();
				line.drawArcs(line.getClosestCoordsByX());
			}
		}
	}, {
		key: "drawAreaLines",
		value: function drawAreaLines() {
			for (var i = 0; i < this.areaLines.length; i++) {
				this.areaLines[i].draw();
			}
		}
	}, {
		key: "applyBoundaries",
		value: function applyBoundaries(columns, leftIndex, rightIndex) {
			var newColumns = columns.slice();
			if (leftIndex) {
				newColumns.splice(0, leftIndex);
			}
			if (rightIndex) {
				newColumns.splice(newColumns.length - rightIndex, newColumns.length);
			}
			return newColumns;
		}
	}, {
		key: "fadeCanvas",
		value: function fadeCanvas(canvas, clazz, deleteOnEnd) {
			var classes = [];
			for (var i = 0; i < canvas.classList.length; i++) {
				var className = canvas.classList[i];
				if (className.indexOf("run-animation") > -1) {
					classes.push(className);
				}
			}

			classes.forEach(function (className) {
				canvas.classList.remove(className);
			});
			setTimeout(function () {
				canvas.classList.add(clazz);
			}, 0);

			var that = this;
			if (deleteOnEnd) {
				if (this.fadingCanvas) {
					onAnimationEnd();
				}
				this.fadingCanvas = canvas;
				canvas.addEventListener("webkitAnimationEnd", onAnimationEnd);
				canvas.addEventListener("animationend", onAnimationEnd);
			}

			function onAnimationEnd(event) {
				var canvasContainer = that.fadingCanvas.parentNode;
				if (!canvasContainer) return;

				var parent = canvasContainer.parentNode;
				if (!parent) return;

				parent.removeChild(canvasContainer);
			}
		}
	}, {
		key: "isStepIncreased",
		value: function isStepIncreased(oldMaxY, newMaxY) {
			var newStep = this.round(newMaxY / this.maxAxisYColumns);
			var oldStep = this.round(oldMaxY / this.maxAxisYColumns);

			return newStep > oldStep;
		}
	}, {
		key: "isStepChanged",
		value: function isStepChanged(oldMaxY, newMaxY) {
			var newStep = this.round(newMaxY / this.maxAxisYColumns);
			var oldStep = this.round(oldMaxY / this.maxAxisYColumns);

			return oldStep !== newStep;
		}
	}, {
		key: "getFadeOutClassName",
		value: function getFadeOutClassName(isStepIncreased) {
			return isStepIncreased ? "run-animation-mid-bot" : "run-animation-mid-top";
		}
	}, {
		key: "getFadeInClassName",
		value: function getFadeInClassName(isStepIncreased) {
			return isStepIncreased ? "run-animation-top-mid" : "run-animation-bot-mid";
		}
	}, {
		key: "drawAxisX",
		value: function drawAxisX(movingRight, dragging, resizing) {
			if (dragging || resizing) {
				var oldCanvasClassName = void 0;
				var newCanvasClassName = void 0;
				if (movingRight) {
					oldCanvasClassName = dragging ? "run-animation-left-out" : "run-animation-mid-left";
					newCanvasClassName = dragging ? "run-animation-right-in" : "run-animation-right-mid";
				} else {
					oldCanvasClassName = dragging ? "run-animation-right-out" : "run-animation-mid-right";
					newCanvasClassName = dragging ? "run-animation-left-in" : "run-animation-left-mid";
				}
				var oldCanvas = this.axisCanvasX;
				this.fadeCanvas(oldCanvas, oldCanvasClassName, true);

				var canvasContainerX = this.createCanvasContainer(this.container.offsetHeight);
				this.axisCanvasX = this.createCanvasAxisX();
				this.axisCanvasX.classList.add(newCanvasClassName);
				this._drawAxisX();
				canvasContainerX.appendChild(this.axisCanvasX);
				this.container.appendChild(canvasContainerX);
			} else {
				this._drawAxisX();
			}
		}
	}, {
		key: "_drawAxisX",
		value: function _drawAxisX() {
			this.maxX = new Date(this.findMax(this.currentXValues));
			this.minX = new Date(this.findMin(this.currentXValues));
			var axisColumns = this.maxAxisColumns > this.currentXValues.length ? this.currentXValues.length : this.maxAxisColumns;
			var stepX = (this.maxX - this.minX) / axisColumns;
			var stepCoordX = this.width / axisColumns;
			var coordValueX = 0;
			var context = this.axisCanvasX.getContext('2d');
			context.beginPath();
			context.clearRect(0, 0, this.width, this.container.offsetHeight);
			var valueX = this.minX;
			for (var i = 0; i < axisColumns; i++) {
				context.fillText(this.fromDateToMMDD(valueX), coordValueX, this.height + this.textPadding * 2);
				valueX = new Date(valueX.getTime() + stepX);
				coordValueX += stepCoordX;
			}
			context.stroke();
		}
	}, {
		key: "drawAxisY",
		value: function drawAxisY() {
			var isStepIncreased = this.isStepIncreased(this.lastMaxY, this.maxY);
			if (this.scaleY !== 1 && this.isStepChanged(this.lastMaxY, this.maxY)) {
				var oldCanvas = this.axisCanvasY;
				var canvasContainerY = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
				this.axisCanvasY = this.createCanvasAxisY();
				canvasContainerY.appendChild(this.axisCanvasY);
				this.axisCanvasY.classList.add(this.getFadeInClassName(isStepIncreased));
				this._drawAxisY();
				this.container.appendChild(canvasContainerY);
				this.fadeCanvas(oldCanvas, this.getFadeOutClassName(isStepIncreased), true);
			} else {
				this._drawAxisY();
			}
		}
	}, {
		key: "_drawAxisY",
		value: function _drawAxisY() {
			var newScaleY = this.height / this.maxY;
			var context = this.axisCanvasY.getContext('2d');
			context.beginPath();
			context.clearRect(0, 0, this.width, this.container.offsetHeight);
			this.scaleY = newScaleY;
			var valueY = 0;
			var stepY = this.round(this.maxY / this.maxAxisYColumns);
			for (var i = 0; i < this.maxAxisColumns; i++) {
				var coordY = this.height + this.textPadding - valueY * this.scaleY;
				context.moveTo(0, coordY);
				context.lineTo(this.width, coordY);
				context.fillText(valueY, 0, coordY - 5);
				valueY += stepY;
			}
			context.stroke();
		}
	}, {
		key: "fromDateToMMDD",
		value: function fromDateToMMDD(date) {
			var parts = date.toDateString().split(' ');
			return parts[1] + ' ' + parts[2];
		}
	}, {
		key: "round",
		value: function round(d) {
			var str = String(Math.round(d));
			var pow = 1;
			if (str.length > 4) {
				pow = str.length - 1;
			} else if (str.length > 3) {
				pow = str.length - 2;
			} else {
				return Math.ceil(d);
			}
			return Math.ceil(d / Math.pow(10, pow)) * Math.pow(10, pow);
		}
	}, {
		key: "createCanvas",
		value: function createCanvas(height, width, isTranslated) {
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			canvas.style.width = width + "px";
			canvas.style.height = height + "px";
			canvas.style.position = "relative";
			if (isTranslated) {
				var context = canvas.getContext('2d');
				context.translate(0, height);
				context.scale(1, -1);
			}
			return canvas;
		}
	}, {
		key: "createControlArea",
		value: function createControlArea(chartHeight) {
			var areaContainer = document.createElement("div");
			areaContainer.style.position = "relative";
			areaContainer.style.height = chartHeight;
			areaContainer.style.boxSizing = "border-box";

			var bottomHeight = chartHeight;

			var leftBlock = this.createDraggableAreaBlock(bottomHeight, true);
			var rightBlock = this.createDraggableAreaBlock(bottomHeight, false);

			this.leftBlock = leftBlock;
			this.rightBlock = rightBlock;

			this.addResizableBlockEvent(leftBlock.firstChild, leftBlock, true, rightBlock);
			this.addResizableBlockEvent(rightBlock.firstChild, rightBlock, false, leftBlock);
			var area = this.createDraggableArea(bottomHeight, leftBlock, rightBlock);

			areaContainer.appendChild(leftBlock);
			areaContainer.appendChild(area);
			areaContainer.appendChild(rightBlock);
			return areaContainer;
		}
	}, {
		key: "createDraggableAreaBlock",
		value: function createDraggableAreaBlock(height, left) {
			var div = document.createElement("div");
			div.style.height = height + "px";
			div.style.width = this.DRAG_ITEM_WIDTH + "px";
			div.style.background = "rgb(227, 239, 247)";
			div.style.display = "inline-block";
			div.style.position = "absolute";
			div.style.opacity = 0.5;
			div.style.zIndex = 2;

			left ? div.style.left = 0 : div.style.right = 0;

			var dragDiv = document.createElement("div");
			dragDiv.style.height = height + "px";
			dragDiv.style.width = this.DRAG_ITEM_WIDTH + "px";
			dragDiv.style.background = "rgb(40, 112, 160)";
			dragDiv.style.opacity = 0.5;
			dragDiv.style.position = "absolute";
			dragDiv.style.cursor = "e-resize";
			div.style.zIndex = 2;

			left ? dragDiv.style.right = 0 : dragDiv.style.left = 0;

			div.appendChild(dragDiv);
			return div;
		}
	}, {
		key: "createDraggableArea",
		value: function createDraggableArea(height, leftBlock, rightBlock) {
			var lastX = 0;
			var area = document.createElement("div");
			area.style.cursor = "pointer";
			area.style.borderTop = "1px solid rgb(40, 112, 160)";
			area.style.borderBottom = "1px solid rgb(40, 112, 160)";
			area.style.boxSizing = "border-box";
			area.style.height = height + "px";
			area.style.width = this.width + "px";
			area.style.zIndex = 1;
			area.style.display = "inline-block";
			area.style.position = "absolute";
			var that = this;
			var DRAG_ITEM_WIDTH = this.DRAG_ITEM_WIDTH;
			area.addEventListener("mousedown", onMouseDown);
			area.addEventListener("touchstart", onMouseDown);

			function onMouseDown(event) {
				event.preventDefault();
				if (event.touches) {
					lastX = event.touches[0].clientX;
				}
				document.addEventListener('mousemove', onMouseMove);
				document.addEventListener('touchmove', onMouseMove);
				document.addEventListener('mouseup', onMouseUp);
				document.addEventListener('touchend', onMouseUp);

				function onMouseUp() {
					document.removeEventListener('mousemove', onMouseMove);
					document.removeEventListener('mouseup', onMouseUp);
					document.removeEventListener('touchend', onMouseUp);
					document.removeEventListener('touchmove', onMouseMove);
				}

				function onMouseMove(event) {
					if (!area.parentElement.contains(event.target)) {
						onMouseUp();
						return;
					}
					var step = void 0;
					if (event.touches) {
						step = event.touches[0].clientX - lastX;
						lastX = event.touches[0].clientX;
					} else {
						step = event.movementX;
					}

					var leftBlockWidth = leftBlock.offsetWidth + step;
					var rightBlockWidth = rightBlock.offsetWidth - step;
					if (leftBlockWidth < DRAG_ITEM_WIDTH || rightBlockWidth < DRAG_ITEM_WIDTH) {
						return;
					}
					leftBlock.style.width = leftBlockWidth + "px";
					rightBlock.style.width = rightBlockWidth + "px";
					that.applyScales(event.movementX > 0, true, false);
				}
			}

			area.ondragstart = function () {
				return false;
			};

			return area;
		}
	}, {
		key: "applyScales",
		value: function applyScales(movingRight, dragging, resizing) {
			var _this4 = this;

			this.updateScales();
			var leftIndex = this.getLeftBoundaryIndex();
			var rightIndex = this.getRightBoundaryIndex();

			var lastXValues = this.currentXValues;
			this.currentXValues = this.applyBoundaries(this.xValues, leftIndex, rightIndex);
			this.lines.forEach(function (line) {
				return line.maxY = _this4.maxY;
			});
			setTimeout(function () {
				_this4.drawLines();
			}, 0);
			if (lastXValues[0] !== this.currentXValues[0] || lastXValues[lastXValues.length - 1] !== this.currentXValues[this.currentXValues.length - 1]) {
				setTimeout(function () {
					_this4.drawAxisX(movingRight, dragging, resizing);
				}, 0);
			}
			setTimeout(function () {
				_this4.drawAxisY();
			}, 0);
		}
	}, {
		key: "drawFromLastToNewMaxY",
		value: function drawFromLastToNewMaxY() {
			var maxYArea = this.maxYArea;
			this.updateScales();

			this.stretch(this.lastMaxY, this.maxY, Math.abs(this.lastMaxY - this.maxY) / 50);
			this.stretchArea(maxYArea, this.maxYArea, Math.abs(maxYArea - this.maxYArea) / 50);

			this.drawAxisY();
		}
	}, {
		key: "stretch",
		value: function stretch(current, final, step) {
			var _this5 = this;

			this.lines.forEach(function (line) {
				return line.maxY = current;
			});
			this.drawLines();
			if (current !== final) {
				if (Math.abs(current - final) < step) {
					this.stretch(final, final);
				} else {
					var next = current < final ? current + step : current - step;
					if (this.slowMode) {
						this.stretch(next, final, step);
					} else {
						setTimeout(function () {
							_this5.stretch(next, final, step);
						}, 0);
					}
				}
			}
		}
	}, {
		key: "stretchArea",
		value: function stretchArea(current, final, step) {
			var _this6 = this;

			this.areaLines.forEach(function (line) {
				return line.maxY = current;
			});
			this.drawAreaLines();
			if (current !== final) {
				if (Math.abs(current - final) < step) {
					setTimeout(function () {
						_this6.stretchArea(final, final);
					}, 0);
				} else {
					var next = current < final ? current + step : current - step;
					setTimeout(function () {
						_this6.stretchArea(next, final, step);
					}, 0);
				}
			}
		}
	}, {
		key: "addResizableBlockEvent",
		value: function addResizableBlockEvent(element, container, left, otherBlock) {
			var lastX = 0;
			var MIN_VISIBLE_AREA = 20;
			var DRAG_ITEM_WIDTH = this.DRAG_ITEM_WIDTH;
			var that = this;
			element.addEventListener("mousedown", onMouseDown);
			element.addEventListener("touchstart", onMouseDown);

			function onMouseDown(event) {
				event.preventDefault();
				if (event.touches) {
					lastX = event.touches[0].clientX;
				}
				document.addEventListener('mousemove', onMouseMove);
				document.addEventListener('touchmove', onMouseMove);
				document.addEventListener('mouseup', onMouseUp);
				document.addEventListener('touchend', onMouseUp);

				function onMouseUp(event) {
					event.preventDefault();
					document.removeEventListener('mousemove', onMouseMove);
					document.removeEventListener('mouseup', onMouseUp);
					document.removeEventListener('touchend', onMouseUp);
					document.removeEventListener('touchmove', onMouseMove);
				}

				function onMouseMove(event) {
					var elementX = element.getBoundingClientRect().x;
					var step = void 0;
					if (event.touches) {
						step = event.touches[0].clientX - lastX;
						lastX = event.touches[0].clientX;
					} else {
						step = event.movementX;
					}
					if (left && elementX < event.clientX && step < 0 || left && elementX > event.clientX && step > 0 || !left && event.clientX < elementX && step > 0 || !left && event.clientX > elementX && step < 0) {
						return;
					}
					var maxWidth = that.areaContainer.offsetWidth - otherBlock.offsetWidth - MIN_VISIBLE_AREA;
					var resultWidth = left ? container.offsetWidth + step : container.offsetWidth - step;
					if (resultWidth > maxWidth) {
						resultWidth = maxWidth;
					} else if (resultWidth < DRAG_ITEM_WIDTH) {
						resultWidth = DRAG_ITEM_WIDTH;
					}
					container.style.width = resultWidth + "px";
					that.applyScales(step > 0, false, true);
				}
			}

			element.ondragstart = function () {
				return false;
			};
		}
	}, {
		key: "findMax",
		value: function findMax(arr) {
			var max = null;
			for (var i = 0; i < arr.length; i++) {
				var item = arr[i];
				if (typeof item === "number" && (item > max || !max)) max = item;
			}
			return max || 0;
		}
	}, {
		key: "findMin",
		value: function findMin(arr) {
			var min = null;
			for (var i = 0; i < arr.length; i++) {
				var item = arr[i];
				if (typeof item === "number" && (item < min || !min)) min = item;
			}
			return min;
		}
	}, {
		key: "findMaxInArrays",
		value: function findMaxInArrays(arrays) {
			var max = 0;
			for (var k = 0; k < arrays.length; k++) {
				var array = arrays[k];
				var maxCurr = this.findMax(array);
				if (maxCurr > max) max = maxCurr;
			}
			return max;
		}
	}, {
		key: "findAreaLineByKey",
		value: function findAreaLineByKey(key) {
			return this.areaLines.find(function (line) {
				return line.key === key;
			});
		}
	}, {
		key: "toggleNightMode",
		value: function toggleNightMode() {
			this.nightMode = !this.nightMode;
			this.parent.classList.toggle("chart-night-mode", this.nightMode);
			this.tipContainer.classList.toggle("night-mode", this.nightMode);
		}
	}]);

	return Chart;
}();

Chart.TYPE = {
	LINE: "line",
	X: "x"
};