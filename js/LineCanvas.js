class LineCanvas {
	constructor(chart, key, columns, color, name, offsetY, maxY, canvas) {
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
	}

	toggle() {
		const state = !this.active;
		this.active = state;
		if (state) {
			this.switcher.style.background = this.color;
			this.switcher.style.border = "none";
		} else {
			this.switcher.style.background = "white";
			this.switcher.style.border = "1px solid " + this.color;
		}
	}

	recalculateBoundaries(leftIndex, rightIndex) {
		this.scaleX = this.canvas.width / (this.columns.length - 1 - leftIndex - rightIndex);
		this.columnsToDraw = this.chart.applyBoundaries(this.columns, leftIndex, rightIndex);
	}

	draw() {
		const chartHeight = Math.round(this.canvas.height - this.offsetY * 2);
		const context = this.canvas.getContext('2d');
		const scaleY = chartHeight / this.maxY;
		context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		context.beginPath();
		context.strokeStyle = this.color;
		context.lineWidth = 2;
		context.moveTo(0, this.offsetY + scaleY * this.columnsToDraw[0]);
		for (let j = 0; j < this.columnsToDraw.length; j++) {
			const scaleX = this.scaleX || this.chart.scaleX;
			context.lineTo(scaleX * j, this.offsetY + scaleY * this.columnsToDraw[j]);
		}
		context.stroke();
	}

	drawArcs(coords) {
		const context = this.canvas.getContext('2d');
		if (coords) {
			context.beginPath();
			context.fillStyle = "white";
			context.arc(coords.x, coords.y, 3, 0, 2 * Math.PI, true);
			context.fill();
			context.stroke();
		}
		this.selectedCoords = coords;
	}

	getClosestCoordsByX() {
		const coordX = this.chart.selectedCoordX;
		const scaleX = this.scaleX || this.chart.scaleX;
		const index = Math.round(coordX / scaleX);

		const chartHeight = Math.round(this.canvas.height - this.offsetY * 2);
		const scaleY = chartHeight / this.maxY;
		const y = Math.round(this.offsetY + scaleY * this.columnsToDraw[index]);
		const x = scaleX * index;
		if (isNaN(y) || isNaN(x)) {
			return null;
		}
		return {y: y, x: x, valueY: this.columnsToDraw[index], indexX: index};
	}
}