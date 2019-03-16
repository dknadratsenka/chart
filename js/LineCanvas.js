class LineCanvas {
	constructor(chart, canvas, columns, color, name, scaleY, offsetY) {
		this.chart = chart;
		this.canvas = canvas;
		this.columns = columns;
		this.color = color;
		this.name = name;
		this.scaleY = scaleY;
		this.offsetY = offsetY;
	}
	
	draw() {
		const context = this.canvas.getContext('2d');
		context.clearRect(0, 0, this.canvas.width, this.canvas.height);
		context.beginPath();
		context.strokeStyle = this.color;
		context.moveTo(0, this.offsetY + this.scaleY * this.columns[0]);
		for (let j = 0; j < this.columns.length; j++) {
			context.lineTo(this.chart.scaleX * j, this.offsetY + this.scaleY * this.columns[j]);
		}
		context.stroke();
	}
	
	drawArcs() {
		const context = this.canvas.getContext('2d');
		const x = this.chart.selectedCoordX;
		const coordY = this.getYByX(x);
		if (!isNaN(coordY)) {
			context.beginPath();
			context.fillStyle = "white";
			context.arc(x, coordY, 3, 0, 2 * Math.PI, true);
			context.fill();
			context.stroke();
		}
	}

	getYByX(coordX) {
		const j = Math.round(coordX / this.chart.scaleX);
		return Math.round(this.chart.textPadding + this.scaleY * this.columns[j]);
	}
}