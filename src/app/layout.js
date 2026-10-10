import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata = {
  title: "Capital Region Investor Hub | Empire Real Estate Firm",
  description:
    "Multifamily deal analysis, market intelligence, and equity insights for the Capital District.",
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a08" },
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
          colorPrimary: "#0c0a08",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#0c0a08",
          colorText: "#0c0a08",
          colorTextSecondary: "#6e6a68",
          colorNeutral: "#6e6a68",
          colorTextOnPrimaryBackground: "#ffffff",
          borderRadius: "6px",
          fontFamily: "var(--font-inter), Arial, sans-serif",
        },
        elements: {
          rootBox: {
            width: "100%",
          },
          card: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
            borderRadius: "12px",
          },
          headerTitle: {
            color: "#0c0a08",
            fontFamily: "var(--font-inter), Arial, sans-serif",
            fontWeight: 700,
          },
          headerSubtitle: {
            color: "#6e6a68",
          },
          socialButtonsBlockButton: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#6e6a68",
            "&:hover": {
              backgroundColor: "rgba(0,0,0,0.02)",
              borderColor: "rgba(0,0,0,0.2)",
            },
          },
          socialButtonsBlockButtonText: {
            color: "#6e6a68",
            fontWeight: 500,
          },
          dividerLine: {
            backgroundColor: "rgba(0,0,0,0.1)",
          },
          dividerText: {
            color: "#64748b",
          },
          formFieldLabel: {
            color: "#6e6a68",
            fontWeight: 600,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          },
          formFieldInput: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#0c0a08",
            "&:focus": {
              borderColor: "#0c0a08",
              boxShadow: "0 0 0 1px #0c0a08",
            },
          },
          formFieldAction: {
            color: "#1a1919",
            fontWeight: 600,
          },
          formButtonPrimary: {
            backgroundColor: "#0c0a08",
            fontWeight: 400,
            "&:hover": {
              backgroundColor: "#1a1919",
            },
          },
          footerAction: {
            color: "#64748b",
          },
          footerActionLink: {
            color: "#1a1919",
            fontWeight: 600,
          },
          identityPreview: {
            backgroundColor: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.1)",
          },
          identityPreviewText: {
            color: "#0c0a08",
          },
          identityPreviewEditButton: {
            color: "#1a1919",
          },
          otpCodeFieldInput: {
            backgroundColor: "#ffffff",
            border: "1px solid rgba(0,0,0,0.1)",
            color: "#0c0a08",
          },
          formResendCodeLink: {
            color: "#1a1919",
          },
          alert: {
            backgroundColor: "rgba(27,72,18,0.05)",
            border: "1px solid rgba(27,72,18,0.1)",
            color: "#0c0a08",
          },
          alertText: {
            color: "#6e6a68",
          },
          badge: {
            backgroundColor: "rgba(27,72,18,0.1)",
            color: "#1a1919",
          },
        },
      }}
    >
      {/* The inline script below sets data-theme before hydration, so the
          server HTML and the client DOM differ on <html> by design. */}
      <html lang="en" className={inter.variable} suppressHydrationWarning>
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
