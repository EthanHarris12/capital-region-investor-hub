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
        background: "linear-gradient(170deg, #f1f5f9 0%, #f8fafc 40%, #ffffff 100%)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div style={{ color: "#475569", fontSize: 14 }}>Loading...</div>
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
