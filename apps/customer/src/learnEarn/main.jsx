import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import LearnEarnExperience from "./LearnEarnExperience.jsx";

createRoot(document.getElementById("learn-earn-root")).render(
  <StrictMode>
    <LearnEarnExperience onExit={() => { window.location.href = "/"; }} />
  </StrictMode>
);
