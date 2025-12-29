
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { HackerModeProvider } from "./contexts/HackerModeContext.tsx";
import { SecurityProvider } from "./contexts/SecurityContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HackerModeProvider>
    <SecurityProvider>
      <App />
    </SecurityProvider>
  </HackerModeProvider>
);