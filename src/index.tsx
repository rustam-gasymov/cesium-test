import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { App } from "./App";

declare global {
  interface Window {
    CESIUM_BASE_URL: any;
  }
}

window.CESIUM_BASE_URL = process.env.PUBLIC_URL + "/cesium/Build/Cesium";

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
