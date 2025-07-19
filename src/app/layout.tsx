import "@coinbase/onchainkit/styles.css";
import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { headers } from "next/headers";
import { type ReactNode } from "react";
import { cookieToInitialState } from "wagmi";
import { getConfig } from "./wagmi";
import { Providers } from "./Providers";
import Header from "./components/Header";

const inter = Space_Grotesk({ subsets: ["latin"], weight: ["400"] });

export const metadata: Metadata = {
  title: "Groupie Love",
  description: "Support your favorite creatives",
};

export default async function RootLayout(props: { children: ReactNode }) {
  const headersList = await headers();
  const initialState = cookieToInitialState(
    getConfig(),
    headersList.get("cookie")
  );

  return (
    <html lang="en" className="h-full">
      <body
        className={`min-h-screen flex flex-col ${inter.className}`}
        style={{
          background: `#002233 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 1600'%3E%3Crect width='1600' height='1600' fill='%23002233'/%3E%3Cdefs%3E%3Cpath id='heart' d='M60,30 C30,0 0,12 12,44 C20,56 60,84 60,84 C60,84 100,56 108,44 C120,12 90,0 60,30 Z' fill='%230066FF'/%3E%3Cfilter id='soft-blur'%3E%3CfeGaussianBlur stdDeviation='1'/%3E%3C/filter%3E%3C/defs%3E%3Cuse href='%23heart' x='200' y='250' opacity='0.4' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='500' y='100' opacity='0.35' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='1200' y='300' opacity='0.45' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='450' y='650' opacity='0.5' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='1300' y='550' opacity='0.35' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='250' y='1200' opacity='0.4' filter='url(%23soft-blur)'/%3E%3Cuse href='%23heart' x='1000' y='1000' opacity='0.35' filter='url(%23soft-blur)'/%3E%3C/svg%3E")`,
          backgroundSize: "1200px",
          backgroundAttachment: "fixed",
        }}
      >
        <Header />
        <Providers initialState={initialState}>
          <main className="flex-1 overflow-y-auto">{props.children}</main>
        </Providers>
      </body>
    </html>
  );
}
