import React, { Component } from "react";
import { withRouter } from "react-router";
import Option from "./Option";

let sticky;

window.addEventListener("scroll", () => {
	const content = document.getElementById("Content");
	const header = document.getElementById("Header");

	if(! header) return;

	if(window.pageYOffset > sticky) header.classList.add("Sticky");
	else header.classList.remove("Sticky");

	if(! content) return;

	if(window.pageYOffset > sticky) content.style.paddingTop = header.clientHeight + 20 + "px";
	else content.style.paddingTop = "10px";
});

class Header extends Component {
	componentDidMount() {
		sticky = document.getElementById("Header").offsetTop;
		document.getElementById("Content").style.paddingTop = "10px";
	}

	render() {
		return (
			<div>
				<div className="Welcome">
					<p>coronavirus - covid-19</p>
					<p>grafici - proiezioni</p>
					<p>previsioni andamento</p>
				</div>
				<div className="Header" id="Header">
					Grafici a <Option enabled={true} desc="linee" onClick={() => this.props.history.push("/coronavirus/grafico/proiezioni")} style={{ fontSize: "26px" }} /> e ad{" "}
					<Option enabled={true} desc="erea" onClick={() => this.props.history.push("/coronavirus/grafico/proiezioni/andamento")} style={{ fontSize: "26px" }} />
				</div>
			</div>
		);
	}
}

export default withRouter(Header);
