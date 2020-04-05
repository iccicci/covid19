import React, { Component } from "react";
import { Link } from "react-router-dom";

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

export class Header extends Component {
	componentDidMount() {
		sticky = document.getElementById("Header").offsetTop;
		document.getElementById("Content").style.paddingTop = "10px";
	}

	render() {
		const path = window.location.pathname === "/" ? "" : window.location.pathname;

		return (
			<div>
				<div className="Welcome">
					<p>coronavirus - covid-19</p>
					<p>grafici - proiezioni</p>
					<p>previsioni andamento</p>
				</div>
				<div className="Header" id="Header">
					Grafici: a <Link to={"/coronavirus/grafico/proiezioni" + path}>linee</Link> - ad <Link to={"/coronavirus/grafico/proiezioni/andamento" + path}>area</Link>
				</div>
			</div>
		);
	}
}
