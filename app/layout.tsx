import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppNavLayout } from "@/app/components/app-nav";
import BiometricGate from "@/app/components/biometric-gate";
import NativeAuthListener from "@/app/components/native-auth-listener";
import NativeConnectivity from "@/app/components/native-connectivity";
import NativePushListener from "@/app/components/native-push-listener";
import NativeShell from "@/app/components/native-shell";
import { NativeOverlayProvider } from "@/app/contexts/native-overlay-context";
import {
  defaultDescription,
  defaultTitle,
  getSiteUrl,
  siteName,
} from "@/utils/site-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: `%s · ${siteName}`,
  },
  description: defaultDescription,
  applicationName: siteName,
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <NativeOverlayProvider>
          <NativeAuthListener />
          <NativePushListener />
          <NativeShell />
          <NativeConnectivity />
          <BiometricGate />
          <AppNavLayout>{children}</AppNavLayout>
        </NativeOverlayProvider>
      </body>
    </html>
  );
}
