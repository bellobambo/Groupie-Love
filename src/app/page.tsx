"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
  TransactionSponsor,
} from "@coinbase/onchainkit/transaction";
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownFundLink,
  WalletDropdownLink,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";
import { groupieContractABI, groupieContractAddress } from "./GroupieABI";
import { parseEther } from "viem";
import FanMintPage from "./components/FanMintPage";
import MyCollectibles from "./components/MyCollectibles";
import { useMiniKit } from "@coinbase/onchainkit/minikit";

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default function UploadArtForm() {
  const { address } = useAccount();
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState("");
  const [artworkURI, setArtworkURI] = useState("");
  const [artistName, setArtistName] = useState("");
  const [fileURI, setFileURI] = useState("");
  const [priceEth, setPriceEth] = useState("");
  const [availableMints, setAvailableMints] = useState("");
  const [ipfsUploading, setIpfsUploading] = useState(false);

  const isFormValid = Boolean(
    title &&
      artworkURI &&
      priceEth &&
      !isNaN(parseFloat(priceEth)) &&
      parseFloat(priceEth) > 0 &&
      availableMints
  );

  const handleUploadToIPFS = async (file: File) => {
    setIpfsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    console.log("Uploading to IPFS:", file);
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY!,
        pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_API_SECRET!,
      },
      body: formData,
    });
    const data = await res.json();
    console.log("file:", data);

    setIpfsUploading(false);
    return `ipfs://${data.IpfsHash}`;
  };

  const calls = useMemo(() => {
    try {
      return [
        {
          address: groupieContractAddress,
          abi: groupieContractABI,
          functionName: "uploadArt",
          args: [
            title,
            artistName,
            fileURI || "",
            artworkURI,
            parseEther(priceEth || "0"), // Convert to wei
            BigInt(availableMints || "0"),
          ],
        },
      ];
    } catch (error) {
      console.error("Error preparing transaction:", error);
      return [];
    }
  }, [title, artistName, fileURI, artworkURI, priceEth, availableMints]);

  const handleOnStatus = useCallback((status: any) => {
    console.log("Transaction status:", status);
    if (status === "success") {
      setRefreshKey((prev) => prev + 1);
    }
  }, []);

  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  return (
    <div className="w-full max-w-screen-sm sm:max-w-screen-md md:max-w-screen-lg lg:max-w-[40%] px-4 sm:px-6 mx-auto space-y-8">
      {/* Wallet connection */}
      {!address && (
        <p className="text-sm sm:text-[15px] text-white mt-[3rem] font-semibold font-georgia text-center sm:text-right">
          Connect Wallet to show some Groupie Love 💙!
        </p>
      )}
      <br />
      {!address ? (
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
        </Wallet>
      ) : (
        <>
          <Wallet>
            <ConnectWallet>
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownBasename />
              <WalletDropdownLink
                icon="wallet"
                href="https://keys.coinbase.com"
              >
                Wallet
              </WalletDropdownLink>
              <WalletDropdownFundLink />
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>

          <form
            className="space-y-4 p-4 sm:p-6 bg-white rounded-xl w-full shadow-lg border border-[#007FFF]/30 text-sm text-[#0B1B2B]"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#007FFF]">
                Artist Name
              </label>
              <input
                type="text"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="e.g. SZA"
                required
                className="w-full px-3 py-2 bg-white/80 border border-[#007FFF]/40 rounded-md focus:ring-2 focus:ring-[#007FFF] outline-none transition-all"
              />
            </div>

            {/* Art Title */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#007FFF]">
                Art Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fire & Soul"
                required
                className="w-full px-3 py-2 bg-white/80 border border-[#007FFF]/40 rounded-md focus:ring-2 focus:ring-[#007FFF] outline-none transition-all"
              />
            </div>

            {/* Artwork Image */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#007FFF]">
                Artwork
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const hash = await handleUploadToIPFS(file);
                    setArtworkURI(hash);
                  }
                }}
                disabled={ipfsUploading}
                className="w-full px-3 py-2 bg-white/80 border border-dashed border-[#007FFF]/40 rounded-md text-sm cursor-pointer file:cursor-pointer"
              />
            </div>

            {/* Any File Upload */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#007FFF]">
                Attach a File (you can upload the preview if no extra file)
              </label>
              <input
                type="file"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const hash = await handleUploadToIPFS(file);
                    setFileURI(hash);
                  }
                }}
                disabled={ipfsUploading}
                className="w-full px-3 py-2 bg-white/80 border border-dashed border-[#007FFF]/40 rounded-md text-sm cursor-pointer file:cursor-pointer"
              />
            </div>

            {/* Price & Mints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#007FFF]">
                  Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={priceEth}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setPriceEth(value);
                    }
                  }}
                  className="w-full px-3 py-2 bg-white/80 border border-[#007FFF]/40 rounded-md"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-[#007FFF]">
                  Available Mints
                </label>
                <input
                  type="number"
                  min="1"
                  value={availableMints}
                  onChange={(e) => setAvailableMints(e.target.value)}
                  className="w-full px-3 py-2 bg-white/80 border border-[#007FFF]/40 rounded-md"
                />
              </div>
            </div>

            {/* Submit Transaction */}
            <Transaction
              chainId={BASE_SEPOLIA_CHAIN_ID}
              calls={calls}
              onStatus={handleOnStatus}
            >
              <TransactionButton
                disabled={!isFormValid || ipfsUploading}
                text="Upload Art"
                className="w-full bg-[#007FFF] text-white py-2 rounded-md font-medium hover:bg-[#0066cc] transition-all"
              />
              <TransactionSponsor />
              <TransactionStatus className="mt-2 text-xs text-gray-600">
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          </form>
        </>
      )}

      <FanMintPage key={refreshKey} />

      <MyCollectibles />
    </div>
  );
}
