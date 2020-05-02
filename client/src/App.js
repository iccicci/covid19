import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import { Charts } from "./Charts";
import { Home } from "./Home";
import "./App.css";

class App extends Component {
	render() {
		return (
			<BrowserRouter>
				<Switch>
					<Route path="/coronavirus/grafico" component={Charts} />
					<Route path="/" component={Home} exact />
					<Route component={Home} />
				</Switch>
			</BrowserRouter>
		);
	}
}

export default App;
