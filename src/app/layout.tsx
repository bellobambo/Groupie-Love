import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "./wagmi";
import { Providers } from "./Providers";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Groupiee Love",
  description: "Support your favorite artist",
};

export default async function RootLayout(props: { children: ReactNode }) {
  const headersList = await headers();
  const initialState = cookieToInitialState(
    getConfig(),
    headersList.get("cookie")
  );

  return (
    <html lang="en">
      <body className={`bg-[#85B09A] ${inter.className}`}>
        <Header />
        <Providers initialState={initialState}>{props.children}</Providers>
      </body>
    </html>
  );
}
