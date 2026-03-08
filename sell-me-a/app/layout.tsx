import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "sell me this | AI Pitch Trainer",
  description: "Practice your sales and public speaking pitches with AI-powered feedback.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
