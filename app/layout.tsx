import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { AuthStateListener } from "@/components/auth-state-listener";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "GymRank",
  description: "Engagement and retention platform for gyms",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthStateListener />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
