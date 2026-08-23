import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(170deg, #f1f5f9 0%, #f8fafc 40%, #ffffff 100%)",
        fontFamily: "'DM Sans', sans-serif",
        padding: 20,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-8%",
          width: 500,
          height: 500,
          background:
            "radial-gradient(circle, rgba(27,72,18,0.25) 0%, transparent 70%)",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#1b4812",
              marginBottom: 8,
              fontWeight: 800,
            }}
          >
            Empire Real Estate Firm
          </div>
          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 36,
              fontWeight: 400,
              color: "#0f172a",
              margin: 0,
              lineHeight: 1.05,
              letterSpacing: 2.5,
              marginBottom: 10,
            }}
          >
            CAPITAL REGION
            <br />
            INVESTOR HUB
          </h1>
          <p
            style={{
              color: "#475569",
              fontSize: 13,
              margin: "0 0 20px 0",
              lineHeight: 1.6,
            }}
          >
            Sign in to access deal analysis, market intelligence, and equity
            insights.
          </p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}
