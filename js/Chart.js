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
		this.maxAxisXColumns = 6;
		this.textPadding = 15;
		this.id = id;
		this.container = null;
		this.columns = data.columns;
		this.names = data.names;
		this.types = data.types;
		this.colors = data.colors;
		this.maxY = null;
		this.maxX = null;
		this.minX = null;
		this.width = width;
		this.fullWidth = width;
		this.fullHeight = height;
		this.height;
		this.scaleY = 1;
		this.verticalCanvas = null;

		this.lines = [];
		this.areaLines = [];
		this.axisCanvas;

		this.selectedCoordX;
		this.DRAG_ITEM_WIDTH = 5;
		this.leftBlock;
		this.rightBlock;
		this.xValues = [];

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
		this.scaleY = this.height / this.maxY;

		for (let i = 0; i < lineColumns.length; i++) {
			const columns = lineColumns[i];
			const key = columns.splice(0, 1);
			const color = this.colors[key];
			const name = this.names[key];
			const lineCanvas = new LineCanvas(
				this,
				columns,
				color,
				name,
				this.textPadding,
				this.maxY
			);
			this.lines.push(lineCanvas);


			const areaLineCanvas = new LineCanvas(
				this,
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
	}

	onDomReady() {
		const container = document.getElementById(this.id);
		if (!container) return;
		container.style.height = this.fullHeight + "px";
		container.style.width = this.fullWidth + "px";

		const areaCanvasHeight = Math.round(this.fullHeight / 6);
		const mainCanvasHeight = this.fullHeight - areaCanvasHeight;
		this.height = this.fullHeight - this.textPadding * 2 - areaCanvasHeight;

		const MARGIN_TOP = 10;
		const areaContainer = this.createControlArea(areaCanvasHeight - MARGIN_TOP);
		areaContainer.style.marginTop = MARGIN_TOP + "px";

		const mainCanvasContainer = document.createElement("div");
		this.container = mainCanvasContainer;

		mainCanvasContainer.style.width = "100%";
		mainCanvasContainer.style.height = mainCanvasHeight + "px";

		this.verticalCanvas = this.createCanvas(this.createId('vertical-info'), mainCanvasHeight, this.width, true);


		mainCanvasContainer.appendChild(this.verticalCanvas);

		container.appendChild(mainCanvasContainer);
		container.appendChild(areaContainer);

		this.areaContainer = areaContainer;
		mainCanvasContainer.addEventListener("mousemove", this.onMouseMove.bind(this));
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
		const context = this.verticalCanvas.getContext('2d');
		context.clearRect(0, 0, this.verticalCanvas.width, this.verticalCanvas.height);
		context.beginPath();
		context.strokeStyle = "gray";
		context.lineWidth = 0.3;
		context.moveTo(coords.x, 0);
		context.lineTo(coords.x, this.verticalCanvas.height - this.textPadding);
		context.stroke();
		this.selectedCoordX = coords.x;
		this.drawLines();
	}

	getLeftBoundaryIndex() {
		const index = (this.leftBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
		return Math.round(index);
	}

	getRightBoundaryIndex() {
		const index = (this.rightBlock.offsetWidth - this.DRAG_ITEM_WIDTH) / this.scaleX;
		return Math.round(index);
	}

	updateScales() {
		this.selectedCoordX = 0;
		const leftIndex = this.getLeftBoundaryIndex();
		const rightIndex = this.getRightBoundaryIndex();

		const visibleValuesY = [];
		this.lines.forEach(line => {
			line.recalculateBoundaries(leftIndex, rightIndex);
			visibleValuesY.push(line.columnsToDraw);
		});
		this.maxY = this.findMax(visibleValuesY);
		this.lines.forEach(line => line.maxY = this.maxY);
		this.scaleY = this.height / this.maxY;
	}

	createCanvases() {
		for (let i = 0; i < this.lines.length; i++) {
			const canvas = this.createCanvas(this.createId(i), this.container.offsetHeight, this.width, true);
			this.lines[i].canvas = canvas;
			this.container.appendChild(canvas);
		}

		for (let i = 0; i < this.areaLines.length; i++) {
			const areaCanvas = this.createCanvas(this.createId("area-canvas-" + i), this.areaContainer.offsetHeight, this.width, true);
			this.areaLines[i].canvas = areaCanvas;
			this.areaContainer.appendChild(areaCanvas);
		}

		const axisCanvas = this.createCanvas(this.createId('x'), this.container.offsetHeight, this.width);
		this.container.appendChild(axisCanvas);

		const context = axisCanvas.getContext('2d');
		context.strokeStyle = "gray";
		context.lineWidth = 0.3;
		context.font = "10px gray";
		this.axisCanvas = axisCanvas;
	}

	draw() {
		this.drawLines();
		this.drawAreaLines();
		this.drawAxis();
	}

	drawLines() {
		for (let i = 0; i < this.lines.length; i++) {
			const line = this.lines[i];
			line.draw();
			line.drawArcs();
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
			newColumns.splice(newColumns.length - 1 - rightIndex, newColumns.length);
		}
		return newColumns;
	}

	drawAxis() {
		const leftIndex = this.getLeftBoundaryIndex();
		const rightIndex = this.getRightBoundaryIndex();
		const xColumn = this.applyBoundaries(this.xValues, leftIndex, rightIndex);
		const scaleY = this.height / this.maxY;

		this.maxX = new Date(this.findMax(xColumn));
		this.minX = new Date(this.findMin(xColumn));
		const stepX = (this.maxX - this.minX) / this.maxAxisXColumns;
		const stepCoordX = this.width / this.maxAxisXColumns;
		let coordValueX = stepCoordX;

		const context = this.axisCanvas.getContext('2d');
		context.beginPath();
		context.clearRect(0, 0, this.width, this.container.offsetHeight);

		let valueY = 0;
		let valueX = this.minX;
		let stepY = this.round(this.maxY / this.maxAxisYColumns);
		for (let i = 0; i < this.maxAxisXColumns; i++) {
			const coordY = this.height + this.textPadding - valueY * scaleY;
			context.moveTo(0, coordY);
			context.lineTo(this.width, coordY);
			context.fillText(valueY, 0, coordY - 5);
			context.fillText(this.fromDateToMMDD(valueX), coordValueX, this.height + this.textPadding * 2);


			valueX = new Date(valueX.getTime() + stepX);
			valueY += stepY;
			coordValueX += stepCoordX;
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

	createId(id) {
		return this.id + "-canvas-" + id;
	}

	createCanvas(id, height, width, isTranslated) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
		canvas.style.position = "absolute";
		canvas.id = id;

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
		area.onmousedown = function (event) {
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);

			function onMouseUp() {

				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
			}

			function onMouseMove(event) {
				if (!area.parentElement.contains(event.target)) {
					onMouseUp();
					return;
				}

				const step = event.movementX;
				const leftBlockWidth = leftBlock.offsetWidth + step;
				const rightBlockWidth = rightBlock.offsetWidth - step;
				if (leftBlockWidth < DRAG_ITEM_WIDTH || rightBlockWidth < DRAG_ITEM_WIDTH) {
					return;
				}
				leftBlock.style.width = leftBlockWidth + "px";
				rightBlock.style.width = rightBlockWidth + "px";
				that.applyScales();
			}
		};

		area.ondragstart = function () {
			return false;
		};

		return area;
	}

	applyScales() {
		this.updateScales();
		this.drawLines();
		this.drawAxis();
	}

	addResizableBlockEvent(element, container, left, otherBlock) {
		const MIN_VISIBLE_AREA = 20;
		const DRAG_ITEM_WIDTH = this.DRAG_ITEM_WIDTH;
		const that = this;
		element.onmousedown = function (event) {
			document.addEventListener('mousemove', onMouseMove);
			document.addEventListener('mouseup', onMouseUp);
			function onMouseUp() {
				document.removeEventListener('mousemove', onMouseMove);
				document.removeEventListener('mouseup', onMouseUp);
			}

			function onMouseMove(event) {
				const elementX = element.getBoundingClientRect().x;
				if ((left && elementX < event.clientX && event.movementX < 0)
					|| (left && elementX > event.clientX && event.movementX > 0)
					|| (!left && event.clientX < elementX && event.movementX > 0)
					|| (!left && event.clientX > elementX && event.movementX < 0)
				) {
					return;
				}
				const maxWidth = that.areaContainer.offsetWidth - otherBlock.offsetWidth - MIN_VISIBLE_AREA;
				let resultWidth = left
					? container.offsetWidth + event.movementX
					: container.offsetWidth - event.movementX;
				if (resultWidth > maxWidth) {
					resultWidth = maxWidth;
				} else if (resultWidth < DRAG_ITEM_WIDTH) {
					resultWidth = DRAG_ITEM_WIDTH;
				}
				container.style.width = resultWidth + "px";
				that.applyScales();
			}
		};

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
		return max;
	}

	findMin(arrays) {
		const arr = [].concat.apply([], arrays)
		let min = null;
		for (let i = 1; i < arr.length; i++) {
			var item = arr[i];
			if (typeof item === "number" && (item < min || !min)) min = item;
		}
		return min;
	}


	//
	// sortAxisY(data) {
	// 	const maxNum = this.maxY * 10;
	// 	let divisor = 10;
	//
	// 	while (divisor < maxNum) {
	// 		let buckets = this.create2DArray(10);
	// 		for (let item of data) {
	// 			buckets[Math.floor((this.toNumber(item.y) % divisor) / (divisor / 10))].push(item);
	// 		}
	// 		arr = [].concat.apply([], buckets);
	// 		divisor *= 10;
	// 	}
	// 	return arr;
	// }
	//
	// create2DArray(count) {
	// 	const arr = [];
	//
	// 	for (let i = 0; i < count; i++) {
	// 		arr[i] = [];
	// 	}
	//
	// 	return arr;
	// }
	//
	// toNumber(value) {
	// 	return value - 0;
	// }
	//
	// defineLimits(data) {
	// 	let maxY, minY, maxX, minX;
	// 	minY = maxY = this.toNumber(data[0].y);
	// 	minX = maxX = this.toNumber(data[0].x);
	//
	// 	for (let i = 1; i < data.length; i++) {
	// 		var item = data[i];
	// 		if (this.toNumber(item.y) > maxY) maxY = item.y;
	// 		if (this.toNumber(item.x) > maxX) maxX = item.x;
	// 		if (this.toNumber(item.y) < minY) minY = item.y;
	// 		if (this.toNumber(item.x) < minX) minX = item.x;
	// 	}
	// 	this.minY = minY;
	// 	this.maxY = maxY;
	// 	this.minX = minX;
	// 	this.maxX = maxX;
	// }

}