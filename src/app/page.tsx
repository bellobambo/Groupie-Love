"use client";

import { useState, useCallback } from "react";
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

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default function UploadArtForm() {
  const { address } = useAccount();

  const [title, setTitle] = useState(""); // 🔧 NEW state
  const [artworkURI, setArtworkURI] = useState("");
  const [musicURI, setMusicURI] = useState("");
  const [priceEth, setPriceEth] = useState("0.01");
  const [availableMints, setAvailableMints] = useState(100);
  const [ipfsUploading, setIpfsUploading] = useState(false);

  const isFormValid = Boolean(
    title &&
      artworkURI &&
      priceEth &&
      !isNaN(parseFloat(priceEth)) &&
      availableMints > 0
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

  const calls = [
    {
      address: groupieContractAddress,
      abi: groupieContractABI,
      functionName: "uploadArt",
      args: [
        title,
        artworkURI,
        musicURI,
        parseEther(priceEth),
        BigInt(availableMints),
      ],
    },
  ];

  const handleOnStatus = useCallback((status: any) => {
    console.log("Transaction status:", status);
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-8">
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
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div>
              <label>Art Title:</label> {/* 🔧 NEW input */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fire & Soul"
                required
              />
            </div>

            <div>
              <label>Artwork Image:</label>
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
              />
            </div>

            <div>
              <label>Music File:</label>
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const hash = await handleUploadToIPFS(file);
                    setMusicURI(hash);
                  }
                }}
                disabled={ipfsUploading}
              />
            </div>

            <div>
              <label>Price (in ETH):</label>
              <input
                type="number"
                step="0.001"
                value={priceEth}
                onChange={(e) => setPriceEth(e.target.value)}
              />
            </div>

            <div>
              <label>Available Mints:</label>
              <input
                type="number"
                value={availableMints}
                onChange={(e) => setAvailableMints(Number(e.target.value))}
              />
            </div>

            <Transaction
              chainId={BASE_SEPOLIA_CHAIN_ID}
              calls={calls}
              onStatus={handleOnStatus}
            >
              <TransactionButton
                disabled={!isFormValid || ipfsUploading}
                text="Upload Art"
              />
              <TransactionSponsor />
              <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionStatusAction />
              </TransactionStatus>
            </Transaction>
          </form>
        </>
      )}

      <FanMintPage />

      <MyCollectibles />
    </div>
  );
}
