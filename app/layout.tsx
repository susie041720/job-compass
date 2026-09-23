import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "求职航标｜个人求职管理",
  description: "集中管理投递记录、进度和岗位资料的个人求职工作台",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
