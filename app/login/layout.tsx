import type { Metadata } from "next";
import { appRobots } from "@/utils/site-metadata";

export const metadata: Metadata = {
  title: "Sign in",
  robots: appRobots,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
