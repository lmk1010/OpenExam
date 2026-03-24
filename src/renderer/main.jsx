import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { DialogProvider } from "./components/DialogProvider.jsx";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <DialogProvider>
    <App />
  </DialogProvider>
);
