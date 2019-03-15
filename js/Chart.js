class Chart {

	static TYPE = {
		LINE: "line",
		X: "x"
	};

	/**
	 *
	 * @param id
	 * @param {Object[]} data
	 */
	constructor(id, data, width, height) {
		this.coords = {};
		this.maxAxisYColumns = 6;
		this.maxAxisXColumns = 6;
		this.minAxisXColumns = 2;
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
		this.height = height - this.textPadding;
		this.scaleX = 1;
		this.scaleY = 1;
		this.verticalCanvas = null;
		this.mouseCoordX = null;
		this.lines = [];
		this.selectedCoordX;
	}

	init() {
		if (!document.getElementById(this.id)) {
			window.addEventListener("DOMContentLoaded", this.onDomReady.bind(this));
		} else {
			this.onDomReady();
		}
	}

	onDomReady() {
		this.container = document.getElementById(this.id);
		this.container.width = this.width;
		this.container.height = this.height + this.textPadding * 2;
		this.container.style.width = this.width;
		this.container.style.height = this.height + this.textPadding * 2;
		this.verticalCanvas = this.createCanvas(this.createId('vertical-info'));
		this.container.appendChild(this.verticalCanvas);
		const context = this.verticalCanvas.getContext('2d');
		context.translate(0, this.container.height);
		context.scale(1, -1);
		this.container.addEventListener("mousemove", this.onMouseMove.bind(this));
		this.draw();
	}
	
	onMouseMove(event) {
		event.preventDefault();
		let x = event.clientX - event.target.offsetLeft;
		let y = this.height - this.textPadding - event.clientY;
		const context = this.verticalCanvas.getContext('2d');
		context.clearRect(0, 0, this.verticalCanvas.width, this.verticalCanvas.height);
		context.beginPath();
		context.strokeStyle = "gray";
		context.lineWidth = 0.3;
		context.moveTo(x, 0);
		context.lineTo(x, this.verticalCanvas.height - this.textPadding);
		this.selectedCoordX = x;
		context.stroke();
		this.drawLines();
	}

	draw() {
		const xColumn = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.X)[0];
		const lineColumns = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.LINE);
		this.maxY = this.findMax(lineColumns);
		this.scaleX = this.width / xColumn.length;
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
				this.textPadding
			);
			this.lines.push(lineCanvas)
			this.container.appendChild(canvas);
			const context = canvas.getContext('2d');
			context.translate(0, this.container.height);
			context.scale(1, -1);
		}
		this.drawLines();
		this.drawAxis(xColumn);
	}

	drawLines() {
		for (let i = 0; i < this.lines.length; i++) {
			this.lines[i].draw();
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
		return parts[1] + ' '  + parts[2];
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
	
	createVerticalCanvas(id) {
		const canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.style.width = this.width;
		canvas.style.height = this.height;
		canvas.style.position = "absolute";
		canvas.id = id;
		return canvas;
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