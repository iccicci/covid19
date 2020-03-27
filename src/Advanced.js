import React, { Component } from "react";
import { prociv } from "./definitions";

const dict = {
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
	mobile: { e: "horizontal zoom - vertical zoom", i: "zoom orizzontale - zoom verticale" }
};

const mobile = typeof window.orientation !== "undefined" || navigator.userAgent.indexOf("IEMobile") !== -1;

let shift;

document.addEventListener("keydown", event => (event.keyCode === 16 ? (shift = true) : null));
document.addEventListener("keyup", event => (event.keyCode === 16 ? (shift = false) : null));

class Advanced extends Component {
	constructor() {
		super();
		this.viewportHeight = window.innerHeight;
		this.viewportWidth = window.innerWidth;
		this.isPortrait = this.viewportHeight > this.viewportWidth;
		this.disappeared = false;
	}

	componentDidMount() {
		this.resize();
		this.handleResize = () => this.resize();
		window.addEventListener("resize", this.handleResize);
		console.log(this.refs.canvas, window.innerWidth, window.innerHeight);
		this.forecast(this.props.region);
	}

	componentWillUnmount() {
		window.removeEventListener("resize", this.handleResize);
	}

	forecast(region) {
		const last = prociv[0].data.lastIndexOf(prociv[0].data.slice(-1)[0]);

		if(last === this.last && region === this.region) return;

		this.last = last;
		this.region = region;
		console.log("prova", prociv.length);
	}

	render() {
		const { language, region } = this.props;

		return (
			<div>
				<p id="tip">{dict[mobile ? "mobile" : "desktop"][language]}</p>
				<div align="center">
					<canvas id="canv" ref="canvas" />
				</div>
			</div>
		);
	}

	resize() {
		const newViewportHeight = window.innerHeight;
		const newViewportWidth = window.innerWidth;
		const rest = document.getElementById("head").clientHeight + document.getElementById("foot").clientHeight + document.getElementById("tip").clientHeight;
		const hasOrientationChanged = newViewportHeight > newViewportWidth !== this.isPortrait;
		let doIt;

		if(hasOrientationChanged) window.location.reload();
		if(newViewportHeight !== this.viewportHeight && newViewportHeight >= this.viewportHeight) {
			this.disappeared = true;
			doIt = true;
		}

		if(doIt || ! mobile) {
			this.viewportHeight = newViewportHeight;
			this.viewportWidth = newViewportWidth;
			this.isPortrait = this.viewportHeight > this.viewportWidth;
		}

		var w = this.refs.canvas.width = this.canvasWidth = this.viewportWidth - 20;
		var h = this.refs.canvas.height = this.canvaSHeight = this.viewportHeight - 30 - rest - (this.disappeared || ! mobile ? 0 : 200);
		console.log(w, h);

		const ctx = this.refs.canvas.getContext("2d");
		var imgData = ctx.createImageData(w, h);
		imgData.data[0] = imgData.data[1] = imgData[2] = imgData[w * h * 4 - 4] = imgData[w * h * 4 - 3] = imgData[w * h * 4 - 2] = 0;
		imgData.data[3] = imgData.data[w * h * 4 - 1] = 255;
		ctx.putImageData(imgData, 0, 0);
	}
}

export default Advanced;
