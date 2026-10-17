import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import JobCompass from "@/components/job-compass";
import "@/app/globals.css";

const root = document.getElementById("root");

if (!root) throw new Error("找不到页面入口");

createRoot(root).render(
  <StrictMode>
    <JobCompass publicDemo />
  </StrictMode>,
);
