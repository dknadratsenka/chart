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
		this.scaleX = 1;
		this.scaleY = 1;
		this.verticalCanvas = null;
		this.lines = [];
		this.selectedCoordX;
		this.areaCanvas;
	}

	init() {
		if (!document.getElementById(this.id)) {
			window.addEventListener("DOMContentLoaded", this.onDomReady.bind(this));
		} else {
			this.onDomReady();
		}
	}

	onDomReady() {
		const container = document.getElementById(this.id);
		if (!container) return;
		container.style.height = this.fullHeight;
		container.style.width = this.fullWidth;

		const areaCanvasHeight = Math.round(this.fullHeight / 6);
		this.height = this.fullHeight - this.textPadding * 2 - areaCanvasHeight;


		const areaContainer = this.createAreaCanvas(areaCanvasHeight);

		const mainCanvasContainer = document.createElement("div");
		this.container = mainCanvasContainer;

		mainCanvasContainer.width = "100%";
		mainCanvasContainer.height = this.height + this.textPadding * 2;
		mainCanvasContainer.style.width = "100%";
		mainCanvasContainer.style.height = this.height + this.textPadding * 2;

		this.verticalCanvas = this.createCanvas(this.createId('vertical-info'));
		const context = this.verticalCanvas.getContext('2d');
		context.translate(0, this.container.height);
		context.scale(1, -1);

		mainCanvasContainer.appendChild(this.verticalCanvas);

		container.appendChild(mainCanvasContainer);
		container.appendChild(areaContainer);


		mainCanvasContainer.addEventListener("mousemove", this.onMouseMove.bind(this));
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
		this.drawLinesAndArcs(this.lines);
	}

	draw() {
		const areaLines = [];
		const xColumn = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.X)[0];
		xColumn.splice(0, 1);
		const lineColumns = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.LINE);
		this.maxY = this.findMax(lineColumns);
		this.scaleX = this.width / (xColumn.length - 1);
		this.scaleY = this.height / this.maxY;
		for (let i = 0; i < lineColumns.length; i++) {
			const canvas = this.createCanvas(this.createId(i));
			const columns = lineColumns[i];
			const key = columns.splice(0, 1);
			const color = this.colors[key];
			const name = this.names[key];
			const lineCanvas = new LineCanvas(
				this,
				canvas,
				columns,
				color,
				name,
				this.scaleY,
				this.textPadding
			);
			this.lines.push(lineCanvas);
			this.container.appendChild(canvas);
			const context = canvas.getContext('2d');
			context.translate(0, this.container.height);
			context.scale(1, -1);

			const areaLineCanvas = new LineCanvas(
				this,
				this.areaCanvas,
				columns,
				color,
				name,
				this.areaCanvas.height / this.maxY,
				0
			);
			areaLines.push(areaLineCanvas)
		}
		this.drawLinesAndArcs(this.lines);
		this.drawLines(areaLines);
		this.drawAxis(xColumn);
	}

	drawLinesAndArcs(lines) {
		for (let i = 0; i < lines.length; i++) {
			lines[i].redraw();
			lines[i].drawArcs();
		}
	}

	drawLines(lines) {
		for (let i = 0; i < lines.length; i++) {
			lines[i].draw();
		}
	}

	drawAxis(xColumn) {
		this.maxX = new Date(this.findMax(xColumn));
		this.minX = new Date(this.findMin(xColumn));
		const stepX = (this.maxX - this.minX) / this.maxAxisXColumns;
		const stepCoordX = this.width / this.maxAxisXColumns;
		let coordValueX = stepCoordX;
		const canvas = this.createCanvas(this.createId('x'));
		this.container.appendChild(canvas);

		const context = canvas.getContext('2d');
		context.beginPath();
		context.strokeStyle = "gray";
		context.lineWidth = 0.3;
		context.font = "10px gray";

		let valueY = 0;
		let valueX = this.minX;
		let stepY = this.round(this.maxY / this.maxAxisYColumns);
		for (let i = 0; i < this.maxAxisXColumns; i++) {
			const coordY = this.height + this.textPadding - valueY * this.scaleY;
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
		}
		return (Math.ceil(d / Math.pow(10, pow)) * Math.pow(10, pow));
	}

	createId(id) {
		return this.id + "-canvas-" + id;
	}

	createCanvas(id) {
		const canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = this.height + this.textPadding * 2;
		canvas.style.width = this.width;
		canvas.style.height = this.height + this.textPadding * 2;
		canvas.style.position = "absolute";
		canvas.id = id;
		return canvas;
	}

	createAreaCanvas(height) {
		const MIN_VISIBLE_AREA = 20;
		const DRAG_ITEM_WIDTH = 5;
		const PADDING_TOP = 10;
		const chartHeight = height - PADDING_TOP;

		const canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = chartHeight;
		canvas.style.width = "100%";
		canvas.style.height = chartHeight;
		canvas.style.position = "absolute";
		canvas.style.cursor = "pointer";
		canvas.style.borderTop = "1px solid rgb(40, 112, 160)";
		canvas.style.borderBottom = "1px solid rgb(40, 112, 160)";

		canvas.id = this.id + "-area-canvas";
		const context = canvas.getContext('2d');
		context.translate(0, chartHeight);
		context.scale(1, -1);


		const areaContainer = document.createElement("div");
		areaContainer.style.paddingTop = PADDING_TOP;
		areaContainer.style.position = "relative";
		areaContainer.appendChild(canvas);

		const leftBlock = createDraggableArea(chartHeight, true);
		const rightBlock = createDraggableArea(chartHeight, false);

		addResizableBlockEvent(leftBlock.firstChild, leftBlock, true, rightBlock);
		addResizableBlockEvent(rightBlock.firstChild, rightBlock, false, leftBlock);
		addDraggableArea(canvas);

		areaContainer.appendChild(leftBlock);
		areaContainer.appendChild(rightBlock);

		this.areaCanvas = canvas;
		return areaContainer;

		function createDraggableArea(height, left) {
			const div = document.createElement("div");
			div.style.height = height;
			div.style.width = "50px";
			div.style.background = "rgb(227, 239, 247)";
			div.style.display = "inline-block";
			div.style.position = "absolute";
			div.style.opacity = 0.5;

			left ? div.style.left = 0 : div.style.right = 0;

			const dragDiv = document.createElement("div");
			dragDiv.style.height = height;
			dragDiv.style.width = DRAG_ITEM_WIDTH;
			dragDiv.style.background = "rgb(40, 112, 160)";
			dragDiv.style.opacity = 0.5;
			dragDiv.style.position = "absolute";
			dragDiv.style.cursor = "e-resize";

			left ? dragDiv.style.right = 0 : dragDiv.style.left = 0;

			div.appendChild(dragDiv);
			return div;


		}

		function addDraggableArea(area) {
			area.onmousedown = function (event) {
				document.addEventListener('mousemove', onMouseMove);
				document.addEventListener('mouseup', onMouseUp);

				function onMouseUp() {

					document.removeEventListener('mousemove', onMouseMove);
					document.removeEventListener('mouseup', onMouseUp);
				}

				function onMouseMove(event) {
					if (!canvas.parentElement.contains(event.target)) {
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
				}
			};

			area.ondragstart = function () {
				return false;
			};
		}

		function addResizableBlockEvent(element, container, left, otherBlock) {
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
					const maxWidth = canvas.width - otherBlock.offsetWidth - MIN_VISIBLE_AREA;
					let resultWidth = left
						? container.offsetWidth + event.movementX
						: container.offsetWidth - event.movementX;

					if (resultWidth > maxWidth) {
						resultWidth = maxWidth;
					} else if (resultWidth < DRAG_ITEM_WIDTH) {
						resultWidth = DRAG_ITEM_WIDTH;
					}
					container.style.width = resultWidth + "px";
				}
			};

			element.ondragstart = function () {
				return false;
			};
		}
	}

	findMax(arrays) {
		const arr = [].concat.apply([], arrays)
		let max = null;
		for (let i = 1; i < arr.length; i++) {
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