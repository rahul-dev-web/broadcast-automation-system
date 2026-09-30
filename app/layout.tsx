import type { Metadata } from "next";
import "./globals.css";
import "./broadcast-visuals.css";
import "./broadcast-motion.css";

export const metadata: Metadata = {
  title: "Broadcast Automation System",
  description: "Free Fire tournament scoring and broadcast overlay control system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
\nimport "./saas.css";\n