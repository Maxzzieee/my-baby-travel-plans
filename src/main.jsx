import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { hasSupabase, loadChicken, saveChicken, subscribeChicken } from "./lib/supabase";

// Bridge for the standalone chicken widget (public/chicken-pet.js) so the joint
// chick can share state through the same Supabase project as the rest of the app.
window.ChickenSync = { hasSupabase, load: loadChicken, save: saveChicken, subscribe: subscribeChicken };

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
