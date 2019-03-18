class LineCanvas {
	constructor(chart, canvas, columns, color, name, height, offsetY, scaleX, maxY) {
		this.chart = chart;
		this.canvas = canvas;
		this.columns = columns;
		this.color = color;
		this.name = name;
		this.height = height;
		this.offsetY = offsetY;
		this.scaleX = scaleX;
		this.columnsToDraw = columns;
		this.maxY = maxY;
	}

	recalculateBoundaries(leftIndex, rightIndex) {
		this.scaleX = this.canvas.width / (this.columns.length - 1 - leftIndex - rightIndex);
		this.columnsToDraw = this.chart.applyBoundaries(this.columns, leftIndex, rightIndex);
	}

	draw() {
		const context = this.canvas.getContext('2d');
		const scaleY = this.height / this.maxY;
		context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		context.beginPath();
		context.strokeStyle = this.color;
		context.moveTo(0, this.offsetY + scaleY * this.columnsToDraw[0]);
		for (let j = 0; j < this.columnsToDraw.length; j++) {
			console.log(this.name, "x: " + this.scaleX * j, "j: " + j);
			context.lineTo(this.scaleX * j, this.offsetY + scaleY * this.columnsToDraw[j]);
		}
		context.stroke();
	}

	drawArcs() {
		const context = this.canvas.getContext('2d');
		const x = this.chart.selectedCoordX;
		const coords = this.getClosestCoordsByX(x);
		if (coords) {
			context.beginPath();
			context.fillStyle = "white";
			context.arc(coords.x, coords.y, 3, 0, 2 * Math.PI, true);
			context.fill();
			context.stroke();
		}
	}

	getClosestCoordsByX(coordX) {
		const scaleY = this.height / this.maxY;
		const j = Math.round(coordX / this.scaleX);
		const y = Math.round(this.offsetY + scaleY * this.columnsToDraw[j]);
		const x = this.scaleX * j;
		if (isNaN(y) || isNaN(x)) {
			return null;
		}
		return {y: y, x: x};
	}
}