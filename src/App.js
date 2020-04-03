import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Chart from "./Chart";
import Home from "./Home";
import "./App.css";

class App extends Component {
	render() {
		return (
			<BrowserRouter>
				<Switch>
					<Route path="/coronavirus/grafico/proiezioni/andamento" component={() => <Chart surface={true} />}/>
					<Route path="/coronavirus/grafico/proiezioni" component={Chart} />
					<Route path="/grafico" component={Chart} />
					<Route component={Home} />
				</Switch>
			</BrowserRouter>
		);
	}
}

export default App;
