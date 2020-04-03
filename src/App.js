import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Charts from "./Charts";
import Home from "./Home";
import "./App.css";

function Prova(props) {
	return (
		<div>
			<a href="/coronavirus/grafico/proiezioni#N4IgxiBcCMA0IBMpxAC2fAhhkAjHAljgHY4AOOAzjgC5QAM8ApjgGZQDaoATg/NZHAgAvrB58QAkKVHjIjSVBBFZIXvP5Kkq9SADMITYJVi1SgJyHFgiDotWpJuSEtHpI07tfW0HuefgAdygAFgAOYQBdeAAbJSJ4dQVgjRBWACZOOQUpW08laAM3W0jhIA=">
				prova
			</a>
		</div>
	);
}

class App extends Component {
	render() {
		return (
			<BrowserRouter>
				<Switch>
					<Route path="/coronavirus/grafico/proiezioni" component={Charts} />
					<Route path="/prova" component={Prova} />
					<Route component={Home} />
				</Switch>
			</BrowserRouter>
		);
	}
}

export default App;
