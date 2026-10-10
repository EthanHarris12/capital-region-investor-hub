import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Capital Region Investor Hub | Empire Real Estate Firm",
  description:
    "Multifamily deal analysis, market intelligence, and equity insights for the Capital District.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#080d09" },
  ],
};

// Applies the saved theme (or the OS preference on a first visit) before
// first paint so the page never flashes light before switching to dark.
const noFlashTheme = `(function(){var d=document.documentElement;try{var t=localStorage.getItem('crih_theme');if(t!=='dark'&&t!=='light'){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}d.setAttribute('data-theme',t);}catch(e){d.setAttribute('data-theme','light');}})();`;

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#1b4812",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#0f172a",
          colorText: "#0f172a",
          colorTextSecondary: "#475569",
          colorNeutral: "#475569",
          colorTextOnPrimaryBackground: "#ffffff",
          borderRadius: "8px",
          fontFamily: "'DM Sans', sans-serif",
        },
        elements: {
          rootBox: {
            width: "100%",
          },
          card: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
            borderRadius: "14px",
          },
          headerTitle: {
            color: "#0f172a",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
          },
          headerSubtitle: {
            color: "#475569",
          },
          socialButtonsBlockButton: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#475569",
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.02)",
              borderColor: "rgba(0,0,0,0.2)",
            },
          },
          socialButtonsBlockButtonText: {
            color: "#475569",
            fontWeight: 500,
          },
          dividerLine: {
            backgroundColor: "rgba(0,0,0,0.1)",
          },
          dividerText: {
            color: "#64748b",
          },
          formFieldLabel: {
            color: "#475569",
            fontWeight: 600,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          },
          formFieldInput: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#0f172a",
            "&:focus": {
              borderColor: "#1b4812",
              boxShadow: "0 0 0 1px #1b4812",
            },
          },
          formFieldAction: {
            color: "#2a6b1a",
            fontWeight: 600,
          },
          formButtonPrimary: {
            backgroundColor: "#1b4812",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            "&:hover": {
              backgroundColor: "#2a6b1a",
            },
          },
          footerAction: {
            color: "#64748b",
          },
          footerActionLink: {
            color: "#2a6b1a",
            fontWeight: 600,
          },
          identityPreview: {
            backgroundColor: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.1)",
          },
          identityPreviewText: {
            color: "#0f172a",
          },
          identityPreviewEditButton: {
            color: "#2a6b1a",
          },
          otpCodeFieldInput: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#0f172a",
          },
          formResendCodeLink: {
            color: "#2a6b1a",
          },
          alert: {
            backgroundColor: "rgba(27,72,18,0.05)",
            border: "1px solid rgba(27,72,18,0.1)",
            color: "#0f172a",
          },
          alertText: {
            color: "#475569",
          },
          badge: {
            backgroundColor: "rgba(27,72,18,0.1)",
            color: "#2a6b1a",
          },
        },
      }}
    >
      {/* The inline script below sets data-theme before hydration, so the
          server HTML and the client DOM differ on <html> by design. */}
      <html lang="en" className={dmSans.variable} suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: noFlashTheme }} />
          {/* Google Analytics */}
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-5MR0S7LSM1"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-5MR0S7LSM1');
            `}
          </Script>
          {/* Bebas Neue - loaded via @import since next/font doesn't support it directly with display fonts well */}
          <link
            href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
