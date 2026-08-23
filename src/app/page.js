"use client";

import { Suspense } from "react";
import App from "@/components/App";

function LoadingFallback() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(170deg, var(--b-navy-deep) 0%, var(--b-navy) 40%, var(--b-navy-light) 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ color: "var(--b-gray-text)", fontSize: 14 }}>Loading...</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <App />
    </Suspense>
  );
}
