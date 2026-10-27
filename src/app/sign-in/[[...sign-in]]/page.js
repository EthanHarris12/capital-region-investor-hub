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
          "var(--b-navy-deep)",
        fontFamily: "inherit",
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
            "transparent",
          borderRadius: "50%",
          pointerEvents: "none",
        }}
      />
      <div style={{ textAlign: "center" }}>
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 0.18,
              textTransform: "uppercase",
              color: "var(--b-white)",
              marginBottom: 8,
              fontWeight: 400,
            }}
          >
            Empire Real Estate Firm
          </div>
          <h1
            style={{
              fontFamily: "inherit",
              fontSize: 48,
              fontWeight: 400,
              color: "var(--b-white)",
              margin: 0,
              lineHeight: 1,
              letterSpacing: "-0.01px",
              marginBottom: 10,
            }}
          >
            CAPITAL REGION
            <br />
            INVESTOR HUB
          </h1>
          <p
            style={{
              color: "var(--b-gray-text)",
              fontSize: 16,
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
