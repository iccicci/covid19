import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import Chart from "./Chart";

class Charts extends Component {
	render() {
		return (
			<BrowserRouter>
				<Switch>
					<Route path="/coronavirus/grafico/proiezioni/andamento" component={() => <Chart surface={true} />} />
					<Route component={Chart} />
				</Switch>
			</BrowserRouter>
		);
	}
}

export default Charts;
