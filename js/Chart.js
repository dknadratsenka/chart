class Chart {

	static TYPE = {
		LINE: "line",
		X: "x"
	};

	/**
	 * @param id
	 * @param {Object[]} data
	 */
	constructor(id, data, width, height) {
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
		this.DRAG_ITEM_WIDTH = 5;
		this.leftBlock;
		this.rightBlock;
		this.xValues = [];
		this.drawAxisX = this.throttle(this.drawAxisX, 300, this);
		this.parseXValues(data);
		this.parseLineColumns(data);
	}

	init() {
		if (!document.getElementById(this.id)) {
			window.addEventListener("DOMContentLoaded", this.onDomReady.bind(this));
		} else {
			this.onDomReady();
		}
	}

	parseLineColumns(data) {
		const lineColumns = data.columns.filter(item => data.types[item[0]] === Chart.TYPE.LINE);

		this.maxY = this.findMax(lineColumns);
		this.maxYArea = this.maxY;

		for (let i = 0; i < lineColumns.length; i++) {
			const columns = lineColumns[i];
			const key = columns.splice(0, 1);
			const color = this.colors[key];
			const name = this.names[key];
			const lineCanvas = new LineCanvas(
				this,
				key,
				columns,
				color,
				name,
				this.textPadding,
				this.maxY
			);
			this.lines.push(lineCanvas);


			const areaLineCanvas = new LineCanvas(
				this,
				key,
				columns,
				color,
				name,
				0,
				this.maxY
			);
			this.areaLines.push(areaLineCanvas)
		}
	}

	parseXValues(data) {
		const xValues = data.columns.filter(item => this.types[item[0]] === Chart.TYPE.X)[0];
		xValues.splice(0, 1);
		this.scaleX = this.width / (xValues.length - 1);
		this.xValues = xValues;
		this.currentXValues = this.xValues;
	}

	onDomReady() {
		const container = document.getElementById(this.id);
		if (!container) return;
		container.style.height = this.fullHeight + "px";
		container.style.width = this.fullWidth + "px";

		const areaCanvasHeight = Math.round(this.fullHeight / 6);
		const mainCanvasHeight = this.fullHeight - areaCanvasHeight - this.switcherContainerHeight;
		this.height = this.fullHeight - this.textPadding * 2 - areaCanvasHeight - this.switcherContainerHeight;

		const MARGIN_TOP = 10;
		const areaContainer = this.createControlArea(areaCanvasHeight - MARGIN_TOP);
		areaContainer.style.marginTop = MARGIN_TOP + "px";

		const mainCanvasContainer = document.createElement("div");
		this.container = mainCanvasContainer;

		mainCanvasContainer.style.width = "100%";
		mainCanvasContainer.style.height = mainCanvasHeight + "px";


		container.appendChild(mainCanvasContainer);
		container.appendChild(areaContainer);
		container.appendChild(this.createSwitchersMainContainer());

		this.areaContainer = areaContainer;
		this.createCanvases();
		this.updateScales();
		this.draw();
	}

	findRelativeMouseCoords(e) {
		let m_posx = 0, m_posy = 0, e_posx = 0, e_posy = 0,
			obj = e.target;
		//get mouse position on document crossbrowser
		if (!e) {
			e = window.event;
		}
		if (e.pageX || e.pageY) {
			m_posx = e.pageX;
			m_posy = e.pageY;
		} else if (e.clientX || e.clientY) {
			m_posx = e.clientX + document.body.scrollLeft
				+ document.documentElement.scrollLeft;
			m_posy = e.clientY + document.body.scrollTop
				+ document.documentElement.scrollTop;
		}
		//get parent element position in document
		if (obj.offsetParent) {
			do {
				e_posx += obj.offsetLeft;
				e_posy += obj.offsetTop;
			} while (obj = obj.offsetParent);
		}
		return {x: m_posx - e_posx, y: m_posy - e_posy}
	}

	onMouseMove(event) {
		event.preventDefault();
		const coords = this.findRelativeMouseCoords(event);
		this.selectedCoordX = coords.x;
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			const lineCoords = line.getClosestCoordsByX();
			if (!line.selectedCoords || (lineCoords && lineCoords.indexX !== line.selectedCoords.indexX)) {
				line.draw();
				line.drawArcs(lineCoords);
			}
		}
		this.drawVerticalCanvas(coords);
		this.drawTipContainer();

	}

	throttle(fn, delay, context) {
		let timeout = null;
		let lastCall = null;

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
		}
	}

	drawTipContainer() {
		while (this.tipContainer.firstChild) {
			this.tipContainer.removeChild(this.tipContainer.firstChild);
		}
		if (this.selectedCoordX) {
			this.tipContainer.style.display = "block";
			this.tipContainer.style.left = (this.selectedCoordX - 15) + "px";

			const valuesContainer = document.createElement("div");
			valuesContainer.style.display = "flex";
			valuesContainer.style.justifyContent = "space-around";
			valuesContainer.style.flexDirection = "row";

			let xIndex = null;
			this.lines.forEach(line => {
				if (line.selectedCoords && line.active) {
					xIndex = line.selectedCoords.indexX;
					valuesContainer.appendChild(this.createTipSelectedLineValue(line.selectedCoords.valueY, line.color, line.name));
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

	createTipTitle(xIndex) {
		const span = document.createElement("span");
		span.classList.add("tip-container-title");
		span.innerHTML = this.formatDateForTip(this.currentXValues[xIndex]);
		return span;
	}

	createTipSelectedLineValue(value, color, name) {
		const div = document.createElement("div");
		div.style.display = "flex";
		div.style.justifyContent = "center";
		div.style.flexDirection = "column";
		div.style.margin = "5px";

		const valueSpan = document.createElement("span");
		valueSpan.style.color = color;
		valueSpan.style.fontWeight = "700";
		valueSpan.innerHTML = value;

		const nameSpan = document.createElement("span");
		nameSpan.style.color = color;
		nameSpan.innerHTML = name;

		div.appendChild(valueSpan);
		div.appendChild(nameSpan);
		return div;
	}

	formatDateForTip(timeInMillis) {
		const dateStr = new Date(timeInMillis).toDateString();
		const parts = dateStr.split(" ");
		return parts[0] + ", " + parts[1] + " " + parts[2];
	}

	drawVerticalCanvas(coords) {
		const context = this.verticalCanvas.getContext('2d');
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

	getLeftBoundaryIndex() {
		const index = (this.leftBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
		return Math.round(index);
	}

	getRightBoundaryIndex() {
		const index = (this.rightBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
		return Math.round(index);
	}

	findMaxY() {
		const leftIndex = this.getLeftBoundaryIndex();
		const rightIndex = this.getRightBoundaryIndex();

		const visibleValuesY = [];
		this.lines.forEach(line => {
			if (line.active) {
				line.recalculateBoundaries(leftIndex, rightIndex);
				visibleValuesY.push(line.columnsToDraw);
			}
		});
		return this.findMax(visibleValuesY);
	}

	findMaxYArea() {
		const visibleValuesY = [];
		this.lines.forEach(line => {
			if (line.active) {
				visibleValuesY.push(line.columns);
			}
		});
		return this.findMax(visibleValuesY);
	}

	updateScales() {
		this.selectedCoordX = 0;
		this.drawVerticalCanvas();
		this.drawTipContainer();

		const maxY = this.findMaxY();
		const maxYArea = this.findMaxYArea();

		this.selectedCoordX = 0;
		this.lastMaxY = this.maxY;
		this.maxY = maxY;
		this.maxYArea = maxYArea;
	}

	createTipContainer() {
		const tipParent = document.createElement("div");
		tipParent.style.position = "absolute";
		const div = document.createElement("div");
		div.classList.add("tip-container");

		tipParent.appendChild(div);
		return tipParent;
	}

	createCanvasContainer(height) {
		const div = document.createElement("div");
		div.style.position = "absolute";
		div.style.overflow = "hidden";
		div.style.height = height + "px";
		return div;
	}

	createSwitchersMainContainer() {
		const switcherContainer = document.createElement("div");
		switcherContainer.style.height = this.switcherContainerHeight + "px";
		switcherContainer.classList.add("line-switcher-main-container");
		for (let i = 0; i < this.lines.length; i++) {
			switcherContainer.appendChild(this.createLineSwitcher(this.lines[i]));
		}
		return switcherContainer;
	}

	/**
	 * @param {LineCanvas} line
	 */
	createLineSwitcher(line) {
		const code = "&#10003";
		const span = document.createElement("span");
		span.innerHTML = code;
		span.style.background = line.color;
		span.classList.add("line-switcher");
		line.switcher = span;
		span.addEventListener("click", (event) => {
			line.toggle();
			const newMaxY = this.findMaxY();
			const newMaxYArea = this.findMaxYArea();

			const areaCanvas = this.findAreaLineByKey(line.key).canvas;
			const chartCanvas = line.canvas;

			chartCanvas.style.opacity = line.active ? 0 : 1;
			areaCanvas.style.opacity = line.active ? 0 : 1;

			this.fadeCanvas(areaCanvas, this.getClassNameForLineCanvas(line.active, this.maxYArea, newMaxYArea));
			this.fadeCanvas(line.canvas, this.getClassNameForLineCanvas(line.active, this.maxY, newMaxY));
			this.drawFromLastToNewMaxY();
		});
		const name = document.createElement("span");
		name.innerHTML = line.name;
		name.style.padding = "5px 10px";

		const container = document.createElement("span");
		container.classList.add("line-switcher-container");
		container.appendChild(span);
		container.appendChild(name);

		return container;
	}

	getClassNameForLineCanvas(active, oldMaxY, newMaxY) {
		let className = "";
		if (this.isStepChanged(oldMaxY, newMaxY)) {
			const stepIncreased = this.isStepIncreased(oldMaxY, newMaxY);
			className = active ? this.getFadeInClassName(stepIncreased) : this.getFadeOutClassName(stepIncreased);

		} else {
			className = active ? "run-animation-show" : "run-animation-hide";
		}
		return className;
	}

	createCanvases() {
		for (let i = 0; i < this.lines.length; i++) {
			const canvasContainer = this.createCanvasContainer(this.container.offsetHeight);
			const canvas = this.createCanvas(this.container.offsetHeight, this.width, true);
			this.lines[i].canvas = canvas;
			canvasContainer.appendChild(canvas);
			this.container.appendChild(canvasContainer);
		}

		for (let i = 0; i < this.areaLines.length; i++) {
			const canvasContainer = this.createCanvasContainer(this.areaContainer.offsetHeight);
			const areaCanvas = this.createCanvas(this.areaContainer.offsetHeight, this.width, true);
			this.areaLines[i].canvas = areaCanvas;
			canvasContainer.appendChild(areaCanvas);
			this.areaContainer.appendChild(canvasContainer);
		}

		const canvasContainer = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
		this.verticalCanvas = this.createCanvas(this.container.offsetHeight - this.textPadding, this.width);
		canvasContainer.appendChild(this.verticalCanvas);
		this.verticalCanvas.style.zIndex = 10;
		this.verticalCanvas.addEventListener("mousemove", this.onMouseMove.bind(this));

		this.container.appendChild(canvasContainer);

		const canvasContainerX = this.createCanvasContainer(this.container.offsetHeight);
		this.axisCanvasX = this.createCanvasAxisX();
		canvasContainerX.appendChild(this.axisCanvasX);
		this.container.appendChild(canvasContainerX);

		const canvasContainerY = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
		this.axisCanvasY = this.createCanvasAxisY();
		canvasContainerY.appendChild(this.axisCanvasY);
		this.container.appendChild(canvasContainerY);

		const tipContainer = this.createTipContainer();
		this.tipContainer = tipContainer.firstChild;

		this.container.appendChild(tipContainer);
	}

	createCanvasAxisY() {
		return this.createAxisCanvas(this.container.offsetHeight - this.textPadding);
	}

	createCanvasAxisX() {
		return this.createAxisCanvas(this.container.offsetHeight);
	}

	createAxisCanvas(height) {
		const canvas = this.createCanvas(height, this.width);
		const context = canvas.getContext('2d');
		context.strokeStyle = "#c5c5c5";
		context.lineWidth = 0.3;
		context.font = "10px #c5c5c5";
		return canvas;
	}

	draw() {
		this.drawLines();
		this.drawAreaLines();
		this.drawAxisX();
		this.drawAxisY();
	}

	drawLines() {
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			line.draw();
			line.drawArcs(line.getClosestCoordsByX());
		}
	}

	drawAreaLines() {
		for (let i = 0; i < this.areaLines.length; i++) {
			this.areaLines[i].draw();
		}
	}

	applyBoundaries(columns, leftIndex, rightIndex) {
		const newColumns = columns.slice();
		if (leftIndex) {
			newColumns.splice(0, leftIndex);
		}
		if (rightIndex) {
			newColumns.splice(newColumns.length - rightIndex, newColumns.length);
		}
		return newColumns;
	}

	fadeCanvas(canvas, clazz, deleteOnEnd) {
		const classes = [];
		for (let i = 0; i < canvas.classList.length; i++) {
			const className = canvas.classList[i];
			if (className.indexOf("run-animation") > -1) {
				classes.push(className);
			}
		}

		classes.forEach((className) => {
			canvas.classList.remove(className);
		});
		setTimeout(() => {
			canvas.classList.add(clazz);
		}, 0);


		const that = this;
		if (deleteOnEnd) {
			if (this.fadingCanvas) {
				onAnimationEnd();
			}
			this.fadingCanvas = canvas;
			canvas.addEventListener("webkitAnimationEnd", onAnimationEnd);
			canvas.addEventListener("animationend", onAnimationEnd);
		}

		function onAnimationEnd(event) {
			const canvasContainer = that.fadingCanvas.parentNode;
			if (!canvasContainer) return;

			const parent = canvasContainer.parentNode;
			if (!parent) return;

			parent.removeChild(canvasContainer);
		}
	}

	isStepIncreased(oldMaxY, newMaxY) {
		const newStep = this.round(newMaxY / this.maxAxisYColumns);
		const oldStep = this.round(oldMaxY / this.maxAxisYColumns);

		return newStep > oldStep;
	}

	isStepChanged(oldMaxY, newMaxY) {
		const newStep = this.round(newMaxY / this.maxAxisYColumns);
		const oldStep = this.round(oldMaxY / this.maxAxisYColumns);

		return oldStep !== newStep;
	}

	getFadeOutClassName(isStepIncreased) {
		return isStepIncreased ? "run-animation-mid-bot" : "run-animation-mid-top";
	}

	getFadeInClassName(isStepIncreased) {
		return isStepIncreased ? "run-animation-top-mid" : "run-animation-bot-mid";
	}

	drawAxisX(movingRight, dragging, resizing) {
		if (dragging || resizing) {
			let oldCanvasClassName;
			let newCanvasClassName;
			if (movingRight) {
				oldCanvasClassName = dragging ? "run-animation-left-out" : "run-animation-mid-left";
				newCanvasClassName = dragging ? "run-animation-right-in" : "run-animation-right-mid";
			} else {
				oldCanvasClassName = dragging ? "run-animation-right-out" : "run-animation-mid-right";
				newCanvasClassName = dragging ? "run-animation-left-in" : "run-animation-left-mid";
			}
			const oldCanvas = this.axisCanvasX;
			this.fadeCanvas(oldCanvas, oldCanvasClassName, true);

			const canvasContainerX = this.createCanvasContainer(this.container.offsetHeight);
			this.axisCanvasX = this.createCanvasAxisX();
			this.axisCanvasX.classList.add(newCanvasClassName);
			this._drawAxisX();
			canvasContainerX.appendChild(this.axisCanvasX);
			this.container.appendChild(canvasContainerX);
		} else {
			this._drawAxisX();
		}
	}

	_drawAxisX() {
		this.maxX = new Date(this.findMax(this.currentXValues));
		this.minX = new Date(this.findMin(this.currentXValues));
		const axisColumns = this.maxAxisColumns > this.currentXValues.length ? this.currentXValues.length : this.maxAxisColumns;
		const stepX = (this.maxX - this.minX) / axisColumns;
		const stepCoordX = this.width / axisColumns;
		let coordValueX = 0;
		const context = this.axisCanvasX.getContext('2d');
		context.beginPath();
		context.clearRect(0, 0, this.width, this.container.offsetHeight);
		let valueX = this.minX;
		for (let i = 0; i < axisColumns; i++) {
			context.fillText(this.fromDateToMMDD(valueX), coordValueX, this.height + this.textPadding * 2);
			valueX = new Date(valueX.getTime() + stepX);
			coordValueX += stepCoordX;
		}
		context.stroke();
	}

	drawAxisY() {
		const isStepIncreased = this.isStepIncreased(this.lastMaxY, this.maxY);
		if (this.scaleY !== 1 && this.isStepChanged(this.lastMaxY, this.maxY)) {
			const oldCanvas = this.axisCanvasY;
			const canvasContainerY = this.createCanvasContainer(this.container.offsetHeight - this.textPadding);
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

	_drawAxisY() {
		const newScaleY = this.height / this.maxY;
		const context = this.axisCanvasY.getContext('2d');
		context.beginPath();
		context.clearRect(0, 0, this.width, this.container.offsetHeight);
		this.scaleY = newScaleY;
		let valueY = 0;
		let stepY = this.round(this.maxY / this.maxAxisYColumns);
		for (let i = 0; i < this.maxAxisColumns; i++) {
			const coordY = this.height + this.textPadding - valueY * this.scaleY;
			context.moveTo(0, coordY);
			context.lineTo(this.width, coordY);
			context.fillText(valueY, 0, coordY - 5);
			valueY += stepY;
		}
		context.stroke();
	}

	fromDateToMMDD(date) {
		const parts = date.toDateString().split(' ');
		return parts[1] + ' ' + parts[2];
	}

	round(d) {
		let str = String(Math.round(d));
		let pow = 1;
		if (str.length > 4) {
			pow = str.length - 1;
		} else if (str.length > 3) {
			pow = str.length - 2;
		} else {
			return Math.ceil(d);
		}
		return (Math.ceil(d / Math.pow(10, pow)) * Math.pow(10, pow));
	}

	createCanvas(height, width, isTranslated) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		canvas.style.position = "relative";
		if (isTranslated) {
			const context = canvas.getContext('2d');
			context.translate(0, height);
			context.scale(1, -1);
		}
		return canvas;
	}

	createControlArea(chartHeight) {
		const areaContainer = document.createElement("div");
		areaContainer.style.position = "relative";
		areaContainer.style.height = chartHeight;
		areaContainer.style.boxSizing = "border-box";

		const bottomHeight = chartHeight;

		const leftBlock = this.createDraggableAreaBlock(bottomHeight, true);
		const rightBlock = this.createDraggableAreaBlock(bottomHeight, false);

		this.leftBlock = leftBlock;
		this.rightBlock = rightBlock;

		this.addResizableBlockEvent(leftBlock.firstChild, leftBlock, true, rightBlock);
		this.addResizableBlockEvent(rightBlock.firstChild, rightBlock, false, leftBlock);
		const area = this.createDraggableArea(bottomHeight, leftBlock, rightBlock);

		areaContainer.appendChild(leftBlock);
		areaContainer.appendChild(area);
		areaContainer.appendChild(rightBlock);
		return areaContainer;
	}

	createDraggableAreaBlock(height, left) {
		const div = document.createElement("div");
		div.style.height = height + "px";
		div.style.width = this.DRAG_ITEM_WIDTH + "px";
		div.style.background = "rgb(227, 239, 247)";
		div.style.display = "inline-block";
		div.style.position = "absolute";
		div.style.opacity = 0.5;


		left ? div.style.left = 0 : div.style.right = 0;

		const dragDiv = document.createElement("div");
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

	createDraggableArea(height, leftBlock, rightBlock) {
		let lastX = 0;
		const area = document.createElement("div");
		area.style.cursor = "pointer";
		area.style.borderTop = "1px solid rgb(40, 112, 160)";
		area.style.borderBottom = "1px solid rgb(40, 112, 160)";
		area.style.boxSizing = "border-box";
		area.style.height = height + "px";
		area.style.width = this.width + "px";
		area.style.zIndex = 1;
		area.style.display = "inline-block";
		area.style.position = "absolute";
		const that = this;
		const DRAG_ITEM_WIDTH = this.DRAG_ITEM_WIDTH;
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

			function onMouseUp(event) {
				event.preventDefault();
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
				let step;
				if (event.movementX) {
					step = event.movementX;
				} else {
					step = event.touches[0].clientX - lastX;
					lastX = event.touches[0].clientX;
				}

				const leftBlockWidth = leftBlock.offsetWidth + step;
				const rightBlockWidth = rightBlock.offsetWidth - step;
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

	applyScales(movingRight, dragging, resizing) {
		this.updateScales();
		const leftIndex = this.getLeftBoundaryIndex();
		const rightIndex = this.getRightBoundaryIndex();

		const lastXValues = this.currentXValues;
		this.currentXValues = this.applyBoundaries(this.xValues, leftIndex, rightIndex);
		this.lines.forEach(line => line.maxY = this.maxY);
		this.drawLines();

		if (lastXValues[0] !== this.currentXValues[0] || lastXValues[lastXValues.length - 1] !== this.currentXValues[this.currentXValues.length - 1]) {
			this.drawAxisX(movingRight, dragging, resizing);
		}
		this.drawAxisY();
	}

	drawFromLastToNewMaxY() {
		const maxYArea = this.maxYArea;
		this.updateScales();

		this.stretch(this.lastMaxY, this.maxY, Math.abs(this.lastMaxY - this.maxY) / 50);
		this.stretchArea(maxYArea, this.maxYArea, Math.abs(maxYArea - this.maxYArea) / 50);

		this.drawAxisY();
	}

	stretch(current, final, step) {
		this.lines.forEach(line => line.maxY = current);
		this.drawLines();
		if (current !== final) {
			if (Math.abs(current - final) < step) {
				setTimeout(() => {
					this.stretch(final, final);
				}, 0);
			} else {
				const next = current < final ? current + step : current - step;
				setTimeout(() => {
					this.stretch(next, final, step);
				}, 0);
			}
		}
	}

	stretchArea(current, final, step) {
		this.areaLines.forEach(line => line.maxY = current);
		this.drawAreaLines();
		if (current !== final) {
			if (Math.abs(current - final) < step) {
				setTimeout(() => {
					this.stretchArea(final, final);
				}, 0);
			} else {
				const next = current < final ? current + step : current - step;
				setTimeout(() => {
					this.stretchArea(next, final, step);
				}, 0);
			}
		}
	}

	addResizableBlockEvent(element, container, left, otherBlock) {
		let lastX = 0;
		const MIN_VISIBLE_AREA = 20;
		const DRAG_ITEM_WIDTH = this.DRAG_ITEM_WIDTH;
		const that = this;
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
				const elementX = element.getBoundingClientRect().x;
				let step;
				if (event.movementX) {
					step = event.movementX;
				} else {
					step = event.touches[0].clientX - lastX;
					lastX = event.touches[0].clientX;
				}
				if ((left && elementX < event.clientX && step < 0)
					|| (left && elementX > event.clientX && step > 0)
					|| (!left && event.clientX < elementX && step > 0)
					|| (!left && event.clientX > elementX && step < 0)
				) {
					return;
				}
				const maxWidth = that.areaContainer.offsetWidth - otherBlock.offsetWidth - MIN_VISIBLE_AREA;
				let resultWidth = left
					? container.offsetWidth + step
					: container.offsetWidth - step;
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

	findMax(arrays) {
		const arr = [].concat.apply([], arrays)
		let max = null;
		for (let i = 0; i < arr.length; i++) {
			var item = arr[i];
			if (typeof item === "number" && (item > max || !max)) max = item;
		}
		return max || 0;
	}

	findMin(arrays) {
		const arr = [].concat.apply([], arrays)
		let min = null;
		for (let i = 0; i < arr.length; i++) {
			var item = arr[i];
			if (typeof item === "number" && (item < min || !min)) min = item;
		}
		return min;
	}

	findAreaLineByKey(key) {
		return this.areaLines.find(line => line.key === key);
	}
}