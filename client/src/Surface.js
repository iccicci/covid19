import React, { Component } from "react";

const { models, schema, stats, tMax } = require("./schema");

const dict = {
	data:    { e: "data", i: "dato" },
	day:     { e: "day", i: "giorno" },
	desktop: {
		e: (
			<span>
				horizontal zoom: <b>wheel</b> - vertical zoom: <b>&lt;SHIFT> + wheel</b>
			</span>
		),
		i: (
			<span>
				zoom orizzontale: <b>rotella</b> - zoom verticale: <b>&lt;SHIFT> + rotella</b>
			</span>
		)
	},
	err:      { e: "error", i: "errore" },
	error:    { e: "Computing stats", i: "Calcolo statistiche in corso" },
	forecast: { e: "forecast", i: "proiezione" },
	mobile:   {
		e: (
			<span>
				<b>horizontal zoom</b> and <b>vertical zoom</b> are independent
			</span>
		),
		i: (
			<span>
				<b>zoom orizzontale</b> e <b>zoom verticale</b> sono indipendenti
			</span>
		)
	},
	record: { e: "record", i: "registrato" },
	units:  { e: "units", i: "unità" }
};

const bands = ["deceased", "intensive", "symptoms", "home", "cases", "white"];
const drawXOffset = 50;
const drawYOffset = 20;
const lines = {};
const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;
const relevant = ["home", "cases", "deceased", "intensive", "symptoms", "hospitalized", "positives", "healed"];
const rgb = {
	deceased:  { r: 200, g: 100, b: 30 },
	intensive: { r: 255, g: 0, b: 0 },
	symptoms:  { r: 255, g: 128, b: 0 },
	home:      { r: 255, g: 255, b: 0 },
	cases:     { r: 0, g: 255, b: 0 },
	white:     { r: 255, g: 255, b: 255 }
};

const tip = [
	["intensive", "#dd0000"],
	["symptoms", "#ff8000"],
	["hospitalized", "#000000"],
	["home", "#dddd00"],
	["positives", "#000000"],
	["deceased", "#c8641e"],
	["healed", "#00dd00"],
	["cases", "#000000"]
];

const records = [
	["#00c000", ["deceased", "intensive", "symptoms", "home", "healed"]],
	["#c0c000", ["deceased", "intensive", "symptoms", "home"]],
	["#c06000", ["deceased", "intensive", "symptoms"]],
	["#c00000", ["deceased", "intensive"]],
	["#64320f", ["deceased"]]
];

class ToolTip extends Component {
	constructor() {
		super();
		this.state = { day: 0, display: "none", left: "0px", top: "0px" };
	}

	hide() {
		this.setState({ day: -1 });
	}

	render() {
		const { language, region } = this.props;
		const { day, display, left, units, top } = this.state;
		const forecasts = {};
		const functions = {};
		const record = {};
		const date = new Date(2020, 1, 24 + day, 3).toISOString().substr(5, 5);

		if(schema[region][0].recordset.cases[day]) Object.keys(lines).forEach(stat => (record[stat] = schema[region][0].recordset[stat][day]));

		relevant.forEach(stat => {
			if(schema[region][0].recordset[stat][day]) record[stat] = schema[region][0].recordset[stat][day];
			forecasts[stat] = functions[stat] = Math.floor(lines[stat](day));
			if(stat === "healed") forecasts.healed = forecasts.cases - forecasts.deceased - forecasts.positives;
			if(stat === "positives") forecasts.positives = forecasts.home + forecasts.hospitalized;
			if(stat === "hospitalized") forecasts.hospitalized = forecasts.intensive + forecasts.symptoms;
		});

		const single = stat => (forecasts[stat] < 2 && functions[stat] < 2 ? 0 : Math.abs(forecasts[stat] - functions[stat]) / Math.max(forecasts[stat], functions[stat]));
		const error = 100 * ["healed", "positives", "hospitalized"].reduce((avg, stat) => avg + single(stat), 0);

		return (
			<div className="Table" style={{ display, left, top }} onTouchStart={() => this.hide()}>
				<div className="TRow">
					<div className="TCellL">{dict.day[language]}:</div>
					<div className="TCellR">{date}</div>
				</div>
				<div className="TRow">
					<div className="TCellL">{dict.units[language]}:</div>
					<div className="TCellR">{units}</div>
				</div>
				<div className="TRow">
					<div className="TCellL">{dict.data[language]}:</div>
					<div className="TCellR">{dict[record.cases ? "record" : "forecast"][language]}</div>
				</div>
				{tip.map(([stat, color]) => (
					<div className="TRow" key={stat}>
						<div className="TCellL">
							<span style={{ color }}>{stats[stat].legend[language]}</span>:
						</div>
						<div className="TCellR">{record.cases ? record[stat] : forecasts[stat]}</div>
					</div>
				))}
				<div className="TRow">
					<div className="TCellL">{dict.err[language]}:</div>
					<div className="TCellR">{record.cases ? "NA" : "±" + error.toFixed(2) + "%"}</div>
				</div>
			</div>
		);
	}

	setState(state) {
		const { day, units, x, y } = state;

		if(day < 0 || units < 0) return super.setState({ display: "none" });

		state.display = "table";

		const distance = mobile ? 50 : 5;
		const sizeX = 193 + distance;
		const sizeY = 212 + distance;

		if(y > sizeY) {
			state.left = (x > sizeX ? x - sizeX : 0) + "px";
			state.top = y - sizeY + "px";
		} else if(mobile && this.props.parent.isPortrait && x <= sizeX) {
			state.left = "0px";
			state.top = y + distance + "px";
		} else {
			state.left = x + (x > sizeX ? -sizeX : distance) + "px";
			state.top = "0px";
		}

		super.setState(state);
	}
}

export class SurfaceChart extends Component {
	constructor(props) {
		super(props);

		this.disableTimeout = 0;
		this.state = {};
		this.viewportHeight = window.innerHeight;
		this.viewportWidth = window.innerWidth;
		this.isPortrait = this.viewportHeight > this.viewportWidth;

		this.x2t = () => 0;
		this.y2units = () => 0;
	}

	componentDidMount() {
		this.refresh();
		this.handleResize = () => this.resize();
		window.addEventListener("resize", this.handleResize);
	}

	componentDidUpdate() {
		this.refresh();
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
	}

	refresh() {
		const { region } = this.props.parent.state;

		relevant.forEach(stat => (lines[stat] = models[stats[stat].model].f(schema[region][0].forecasts[stat])));

		this.resize();
	}

	disableTooltip() {
		this.disableTimeout = new Date().getTime() + 300;
	}

	getOffsets(event) {
		const { clientX, clientY, target } = event;
		const rect = target.getBoundingClientRect();
		const offsetX = clientX - rect.left;
		const offsetY = clientY - rect.top;
		const originX = this.x2t(offsetX);
		const originY = this.y2units(offsetY);

		return { offsetX, offsetY, originX, originY };
	}

	handleDrag(event) {
		const { chartXmax, chartXmin, chartYmax, chartYmin, dragging, view2CanvasXScale, view2CanvasYScale, viewHeight, viewWidth } = this;

		if(! dragging) return;

		const { clientX, clientY, viewXmax, viewXmin, viewYmax, viewYmin } = dragging;
		const dragX = (clientX - event.clientX) / view2CanvasXScale;
		const dragY = (event.clientY - clientY) / view2CanvasYScale;

		this.viewXmin = viewXmin + dragX;
		this.viewXmax = viewXmax + dragX;
		this.viewYmin = viewYmin + dragY;
		this.viewYmax = viewYmax + dragY;

		if(this.viewXmin < chartXmin) {
			this.viewXmin = chartXmin;
			this.viewXmax = chartXmin + viewWidth;
		}

		if(this.viewXmax > chartXmax) {
			this.viewXmax = chartXmax;
			this.viewXmin = chartXmax - viewWidth;
		}

		if(this.viewYmin < chartYmin) {
			this.viewYmin = chartYmin;
			this.viewYmax = chartYmin + viewHeight;
		}

		if(this.viewYmax > chartYmax) {
			this.viewYmax = chartYmax;
			this.viewYmin = chartYmax - viewHeight;
		}

		this.redraw();
	}

	handleToolTip(event) {
		const { clientX, clientY } = event;
		const { offsetX, offsetY, originX, originY } = this.getOffsets(event);

		if(this.disableTimeout > new Date().getTime() || offsetX < 0 || offsetY < 0) return this.tooltip.hide();

		this.tooltip.setState({ day: Math.floor(originX) + 1, units: Math.floor(originY), x: clientX, y: clientY });
	}

	handleHorizontalZoom(event, scale, originX) {
		const { chartXmax, chartXmin, drawWidth, imgWidth } = this;
		const { offsetX } = this.getOffsets(event);

		this.viewWidth *= scale;

		if(scale < 1) {
			this.view2ImgXScale = imgWidth / this.viewWidth;

			if(this.view2ImgXScale > 100) {
				this.view2ImgXScale = 100;
				this.viewWidth = imgWidth / this.view2ImgXScale;
			}

			this.view2CanvasXScale = drawWidth / this.viewWidth;

			this.viewXmin = originX - (offsetX - drawXOffset) / this.view2CanvasXScale;
			this.viewXmax = this.viewXmin + this.viewWidth;
		} else {
			if(this.viewWidth > this.viewWidthMax) this.viewWidth = this.viewWidthMax;

			this.view2ImgXScale = imgWidth / this.viewWidth;
			this.view2CanvasXScale = drawWidth / this.viewWidth;

			this.viewXmin = originX - (offsetX - drawXOffset) / this.view2CanvasXScale;

			if(this.viewXmin < chartXmin) this.viewXmin = chartXmin;

			this.viewXmax = this.viewXmin + this.viewWidth;

			if(this.viewXmax > chartXmax) {
				this.viewXmax = chartXmax;
				this.viewXmin = this.viewXmax - this.viewWidth;
			}
		}
	}

	handleVerticalZoom(event, scale, originY) {
		const { chartYmax, chartYmin, drawHeight, imgHeight } = this;
		const { offsetY } = this.getOffsets(event);

		if(scale < 1) {
			this.viewHeight /= 1.1;
			this.view2ImgYScale = imgHeight / this.viewHeight;

			if(this.view2ImgYScale > 0.1) {
				this.view2ImgYScale = 0.1;
				this.viewHeight = imgHeight / this.view2ImgYScale;
			}

			this.view2CanvasYScale = drawHeight / this.viewHeight;

			this.viewYmax = originY + offsetY / this.view2CanvasYScale;
			this.viewYmin = this.viewYmax - this.viewHeight;
		} else {
			this.viewHeight *= 1.1;

			if(this.viewHeight > this.viewHeightMax) this.viewHeight = this.viewHeightMax;

			this.view2ImgYScale = imgHeight / this.viewHeight;
			this.view2CanvasYScale = drawHeight / this.viewHeight;

			this.viewYmax = originY + offsetY / this.view2CanvasYScale;

			if(this.viewYmax > chartYmax) this.viewYmax = chartYmax;

			this.viewYmin = this.viewYmax - this.viewHeight;

			if(this.viewYmin < chartYmin) {
				this.viewYmin = chartYmin;
				this.viewYmax = this.viewYmin + this.viewHeight;
			}
		}
	}

	mousedown(event) {
		const { button, clientX, clientY } = event;
		const { viewXmax, viewXmin, viewYmax, viewYmin } = this;

		if(button) return;

		this.dragging = { clientX, clientY, viewXmax, viewXmin, viewYmax, viewYmin };
		this.tooltip.hide();
	}

	mousemove(event) {
		if(mobile) return;

		if(! this.dragging) {
			if(this.hideTimeout) clearTimeout(this.hideTimeout);

			return this.handleToolTip(event);
		}

		this.handleDrag(event);
	}

	mouseout() {
		if(this.hideTimeout) clearTimeout(this.hideTimeout);

		this.hideTimeout = setTimeout(() => this.tooltip.hide((this.hideTimeout = null)), 200);
	}

	mouseup(event) {
		const { button } = event;

		if(button) return;

		this.dragging = null;
	}

	touchend(event) {
		const { touches } = event;

		this.disableTooltip();

		if(touches.length === 0) this.dragging = null;
	}

	touchmove(event) {
		const { touches } = event;

		if(touches.length === 1) {
			if(this.dragging) this.handleDrag(touches[0]);
			this.handleToolTip(touches[0]);
		}
		if(touches.length === 2) {
			let { clientX, clientY } = touches[0];
			const pointA = { clientX, clientY };
			({ clientX, clientY } = touches[1]);
			const pointB = { clientX, clientY };
			const { originX, originY } = this.zooming;

			this.disableTooltip();

			if(this.animationFrame) return;

			if(Math.abs(pointA.clientX - pointB.clientX) > 30) {
				this.handleHorizontalZoom(
					{ clientX: (pointA.clientX + pointB.clientX) / 2, clientY: 0, target: touches[0].target },
					Math.min(1.2, Math.max(1 / 1.2, Math.abs((this.zooming.pointA.clientX - this.zooming.pointB.clientX) / (pointA.clientX - pointB.clientX)))),
					originX
				);
			}

			if(Math.abs(pointA.clientY - pointB.clientY) > 30) {
				this.handleVerticalZoom(
					{ clientX: 0, clientY: (pointA.clientY + pointB.clientY) / 2, target: touches[0].target },
					Math.min(1.2, Math.max(1 / 1.2, Math.abs((this.zooming.pointA.clientY - this.zooming.pointB.clientY) / (pointA.clientY - pointB.clientY)))),
					originY
				);
			}

			this.zooming = { pointA, pointB, originX, originY };

			this.redraw();
		}
	}

	touchstart(event) {
		const { touches } = event;
		const { viewXmax, viewXmin, viewYmax, viewYmin } = this;

		if(touches.length > 1 || ! mobile) event.preventDefault();

		if(touches.length === 1) {
			const { clientX, clientY } = touches[0];

			this.handleToolTip(touches[0]);
			this.dragging = { clientX, clientY, viewXmax, viewXmin, viewYmax, viewYmin };
		}
		if(touches.length === 2) {
			let { clientX, clientY } = touches[0];
			const pointA = { clientX, clientY };
			({ clientX, clientY } = touches[1]);
			const pointB = { clientX, clientY };

			const { originX, originY } = this.getOffsets({ clientX: (pointA.clientX + pointB.clientX) / 2, clientY: (pointA.clientY + pointB.clientY) / 2, target: touches[0].target });

			this.dragging = null;
			this.tooltip.hide();

			this.zooming = { pointA, pointB, originX, originY };
		}
	}

	wheel(event) {
		if(this.dragging) return;

		const { clientX, clientY, deltaY, shiftKey, target } = event;
		const { originX, originY } = this.getOffsets(event);
		const scale = deltaY > 0 ? 1.1 : 1 / 1.1;

		if(shiftKey) this.handleVerticalZoom(event, scale, originY);
		else this.handleHorizontalZoom(event, scale, originX);

		this.redraw(() => this.handleToolTip({ clientX, clientY, target }));
	}

	render() {
		const { language, region } = this.props.parent.state;

		return ! Object.keys(lines).length ? (
			<div align="center" className="Error">
				{dict.error[language]}
			</div>
		) : (
			<div>
				<p id="tip">{dict[mobile ? "mobile" : "desktop"][language]}</p>
				<div align="center">
					<canvas
						ref={ref => {
							this.canvas = ref;

							if(! ref) return;

							["mousedown", "mousemove", "mouseout", "mouseup", "touchend", "touchmove", "touchstart", "wheel"].forEach(handler =>
								ref.addEventListener(handler, event => this[handler](event), { passive: false })
							);
						}}
					/>
					<ToolTip language={language} parent={this} ref={ref => (this.tooltip = ref)} region={region} />
				</div>
			</div>
		);
	}

	resize() {
		if(! document.getElementById("tip")) return;

		const newViewportHeight = window.innerHeight;
		const newViewportWidth = window.innerWidth;
		const rest = document.getElementById("head").clientHeight + document.getElementById("foot").clientHeight + document.getElementById("tip").clientHeight;

		this.imgScale = window.devicePixelRatio;
		this.viewportHeight = newViewportHeight;
		this.viewportWidth = newViewportWidth;

		this.canvas.style.width = (this.canvasWidth = this.viewportWidth - 20) + "px";
		this.canvas.style.height = (this.canvasHeight = this.viewportHeight - 30 - rest) + "px";

		if(this.animationFrame) {
			window.cancelAnimationFrame(this.animationFrame);
			this.animationFrame = null;
		}

		this.tooltip.hide();

		this.draw();
	}

	draw() {
		const { canvas, canvasWidth, canvasHeight, imgScale } = this;

		if(! this.canvas) return;

		canvas.width = canvasWidth * imgScale;
		canvas.height = canvasHeight * imgScale;

		const ctx = (this.ctx = canvas.getContext("2d"));

		ctx.scale(imgScale, imgScale);

		let yMax = 0;

		for(let t = 0; t <= tMax; ++t) {
			const yc = lines.cases(t);

			if(yMax < yc) yMax = yc;
		}

		this.chartXmin = -0.5;
		this.chartXmax = tMax + 0.5;
		this.chartYmin = 0;
		this.chartYmax = yMax * 1.01;

		const { chartXmin, chartXmax, chartYmin, chartYmax } = this;

		this.chartWidth = chartXmax - chartXmin;
		this.chartHeight = chartYmax - chartYmin;

		const { chartWidth, chartHeight } = this;

		this.drawWidth = canvasWidth - drawXOffset;
		this.drawHeight = canvasHeight - drawYOffset;
		this.imgWidth = Math.floor((canvasWidth - drawXOffset) * imgScale);
		this.imgHeight = Math.floor((canvasHeight - drawYOffset) * imgScale);

		const { drawWidth, drawHeight, imgWidth, imgHeight } = this;

		this.viewXmin = chartXmin;
		this.viewXmax = chartXmax;
		this.viewWidth = chartWidth;
		this.view2CanvasXScale = drawWidth / this.viewWidth;
		this.view2ImgXScale = imgWidth / this.viewWidth;
		this.viewYmin = chartYmin;
		this.viewYmax = chartYmax;
		this.viewHeight = chartHeight;
		this.view2CanvasYScale = drawHeight / this.viewHeight;
		this.view2ImgYScale = imgHeight / this.viewHeight;

		this.viewWidthMax = this.viewWidth;
		this.viewHeightMax = this.viewHeight;

		this.redraw();
	}

	drawBackgroud() {
		const { ctx, img, imgHeight, imgScale, imgWidth, view2ImgXScale, view2ImgYScale, viewXmin, viewYmin } = this;
		const step = imgWidth * 4;
		const y2Img = y => imgHeight - Math.floor((y - viewYmin) * view2ImgYScale) - 1;

		for(let i = 0; i < imgWidth; ++i) {
			const t = viewXmin + i / view2ImgXScale;

			let y = (i + imgWidth * (imgHeight - 1)) * 4;
			let sum = 0;

			bands.forEach(stat => {
				const f = stat === "white" ? 0 : lines[stat](t);
				const last = stat === "white" ? 0 : y2Img((stat === "cases" ? 0 : sum) + f) * imgWidth * 4;
				const { r, g, b } = rgb[stat];

				for(; y > last && y > 0; y -= step) {
					img.data[y] = r;
					img.data[y + 1] = g;
					img.data[y + 2] = b;
					img.data[y + 3] = 255;
				}

				sum += f;
			});
		}

		ctx.putImageData(img, drawXOffset * imgScale, 0);
	}

	drawFunctions() {
		const { drawHeight, view2CanvasXScale, viewHeight, viewXmin, viewYmin } = this;
		const view2CanvasYScale = drawHeight / viewHeight;

		this.x2Canvas = x => (x - viewXmin) * view2CanvasXScale + drawXOffset;
		this.y2Canvas = y => drawHeight - (y - viewYmin) * view2CanvasYScale;

		this.x2t = x => (x - drawXOffset) / view2CanvasXScale + viewXmin;
		this.y2units = y => (drawHeight - y) / view2CanvasYScale + viewYmin;
	}

	drawRecords() {
		const { ctx, x2Canvas, y2Canvas } = this;
		const { region } = this.props.parent.state;

		records.forEach(([color, adds]) => {
			const sum = day => adds.reduce((tot, stat) => tot + schema[region][0].recordset[stat][day], 0);

			ctx.lineWidth = 2;
			ctx.strokeStyle = color;
			ctx.beginPath();
			ctx.moveTo(x2Canvas(0), y2Canvas(sum(0)));
			schema[region][0].recordset.cases.forEach((e, i) => ctx.lineTo(x2Canvas(i), y2Canvas(sum(i))));
			ctx.stroke();
		});
	}

	drawXGrid() {
		const { img, imgHeight, imgWidth, view2CanvasXScale, view2ImgXScale, viewXmax, viewXmin } = this;
		const step = imgWidth * 4;
		const x2Img = x => Math.floor((x - viewXmin) * view2ImgXScale);

		let stepXGrid = 1;

		while(stepXGrid * view2CanvasXScale < 35) ++stepXGrid;

		this.stepXGrid = stepXGrid;

		for(let t = Math.ceil(viewXmin / stepXGrid) * stepXGrid; t < viewXmax; t += stepXGrid) {
			const first = x2Img(t) * 4;
			const last = imgWidth * imgHeight * 4;

			for(let i = first; i < last; i += step) {
				img.data[i] = 64;
				img.data[i + 1] = 64;
				img.data[i + 2] = 64;
				img.data[i + 3] = 255;
			}
		}
	}

	drawXScale() {
		const { canvasHeight, canvasWidth, ctx, drawHeight, stepXGrid, viewXmax, viewXmin, x2Canvas } = this;

		ctx.fillStyle = "#ffffff";
		ctx.fillRect(drawXOffset, canvasHeight - drawYOffset, canvasWidth - drawXOffset, drawYOffset);
		ctx.fillStyle = "#000000";
		ctx.font = "12px Arial";
		ctx.textAlign = "center";
		ctx.textBaseline = "top";

		for(let t = Math.ceil(viewXmin / stepXGrid) * stepXGrid; t < viewXmax; t += stepXGrid) ctx.fillText(new Date(2020, 1, 24 + t, 3).toISOString().substr(5, 5), x2Canvas(t), drawHeight + 2);
	}

	drawYGrid() {
		const { ctx, drawHeight, img, imgHeight, imgWidth, view2ImgYScale, viewYmax, viewYmin, y2Canvas } = this;
		const y2Img = y => imgHeight - Math.floor((y - viewYmin) * view2ImgYScale) - 1;

		let next = true;
		let stepYGrid = (viewYmax - viewYmin) / (drawHeight / 50);
		let prev = 1;
		let diff = stepYGrid;
		let exp = 1;
		let uni = 0;

		while(next) {
			if(uni === 0) uni = 1;
			else if(uni === 1) uni = 2;
			else if(uni === 2) uni = 5;
			else {
				uni = 1;
				exp *= 10;
			}

			if(Math.abs(stepYGrid - uni * exp) < diff) {
				prev = uni * exp;
				diff = Math.abs(stepYGrid - prev);
			} else {
				next = false;
				stepYGrid = prev;
			}
		}

		this.stepYGrid = stepYGrid;

		for(let units = Math.floor(viewYmin / stepYGrid) * stepYGrid; units < viewYmax; units += stepYGrid) {
			const first = imgWidth * 4 * y2Img(units);
			const last = first + imgWidth * 4;

			for(let i = first; i < last; i += 4) {
				img.data[i] = 64;
				img.data[i + 1] = 64;
				img.data[i + 2] = 64;
				img.data[i + 3] = 255;
			}

			ctx.fillText(units, drawXOffset - 2, y2Canvas(units));
		}
	}

	drawYScale() {
		const { canvasHeight, ctx, stepYGrid, viewYmax, viewYmin, y2Canvas } = this;

		ctx.fillStyle = "#ffffff";
		ctx.fillRect(0, 0, drawXOffset, canvasHeight);
		ctx.fillStyle = "#000000";
		ctx.font = "12px Arial";
		ctx.textAlign = "right";
		ctx.textBaseline = "middle";

		for(let units = Math.floor(viewYmin / stepYGrid) * stepYGrid; units < viewYmax; units += stepYGrid) ctx.fillText(units, drawXOffset - 2, y2Canvas(units));
	}

	redraw(done) {
		const { ctx, imgHeight, imgScale, imgWidth } = this;

		if(this.animationFrame) return;

		this.animationFrame = window.requestAnimationFrame(() => {
			this.img = ctx.createImageData(imgWidth, imgHeight);

			this.drawFunctions();
			this.drawBackgroud();
			this.drawYGrid();
			this.drawXGrid();

			ctx.putImageData(this.img, drawXOffset * imgScale, 0);

			this.drawRecords();
			this.drawYScale();
			this.drawXScale();

			this.animationFrame = null;

			if(done) done();
		});
	}
}
