import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "School Calc",
  description: "A Missouri Algebra 1 process-notation calculator.",
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

