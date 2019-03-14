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
		this.id = id;
		this.container = null;
		this.columns = data.columns;
		this.names = data.names;
		this.types = data.types;
		this.colors = data.colors;
		this.maxY = null;
		this.maxX = null;
		this.width = width;
		this.height = height;
		this.scaleX = 1;
		this.scaleY = 1;
		this.visibleAxisXLength = null;
		this.maxAxisYColumns = 6;
		this.maxAxisXColumns = 6;
		this.minAxisXColumns = 2;
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
		this.container.height = this.height;
		this.container.style.width = this.width;
		this.container.style.height = this.height;
		this.draw();
		console.log(this);
	}

	draw() {
		const xColumn = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.X)[0];
		const lineColumns = this.columns.filter(item => this.types[item[0]] === Chart.TYPE.LINE);

		this.maxY = this.findMax(lineColumns);
		
		this.scaleX = this.width / (this.visibleAxisXLength || xColumn.length);
		this.scaleY = this.height / this.maxY;
		for (let i = 0; i < lineColumns.length; i++) {
			const canvas = this.createCanvas(this.createId(i));
			this.container.appendChild(canvas);
			const column = lineColumns[i];
			const key = column[0];
			const color = this.colors[key];
			const name = this.names[key];
			const context = canvas.getContext('2d');
			context.beginPath();
			context.strokeStyle = color;
			context.moveTo(0, 0);
			for (let j = 1; j < column.length; j++) {
				context.lineTo(this.scaleX * j, this.scaleY * column[j]);
			}
			context.stroke();
		}
		
		this.drawAxis(xColumn);
		
		//const parts = new Date(x).toDateString().split(' ');
		//const displayedX = parts[1] + ' '  + parts[2];
	}

	drawAxis(c) {
		const canvas = this.createCanvas(this.createId('x'));
		this.container.appendChild(canvas);
		const context = canvas.getContext('2d');
		context.beginPath();
		context.strokeStyle = "gray";
		
		let coordY = 0;
		let stepY = Math.floor(this.maxY / this.maxAxisYColumns);
		for (let i = 0; i < this.maxAxisXColumns; i++) {
			context.moveTo(0, coordY);
			context.lineTo(this.width, coordY);
			coordY += stepY;
		}
		context.stroke();
		
	}

	createId(index) {
		return this.id + "-canvas-" + index;
	}
	
	createCanvas(id) {
		const canvas = document.createElement('canvas');
		canvas.width = this.width;
		canvas.height = this.height;
		canvas.style.width = this.width;
		canvas.style.height = this.height;
		canvas.style.position = "absolute";
		canvas.id = id;
		const context = canvas.getContext('2d');
		context.translate(0, this.container.height);
		context.scale(1, -1);
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