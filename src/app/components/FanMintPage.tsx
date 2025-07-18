"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { formatEther } from "viem";
import { groupieContractABI, groupieContractAddress } from "../GroupieABI";
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from "@coinbase/onchainkit/transaction";

interface Art {
  title: string;
  artistName: string;
  artistWallet: string;
  mediaUrl: string;
  previewImage: string;
  priceInWei: bigint;
  totalMinted: bigint;
  maxSupply: bigint;
}

export default function FanMintPage() {
  const { address, chain } = useAccount();
  const [arts, setArts] = useState<Art[]>([]);

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const shortenAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const { data: nextArtIdData } = useReadContracts({
    contracts: [
      {
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "getArtCount",
      },
    ],
  });

  const nextArtId = Number(nextArtIdData?.[0]?.result || 0);

  const contracts = Array.from({ length: nextArtId }, (_, i) => ({
    address: groupieContractAddress,
    abi: groupieContractABI,
    functionName: "arts",
    args: [BigInt(i)],
  }));

  const { data: artsData } = useReadContracts({
    contracts,
  });

  useEffect(() => {
    if (artsData) {
      const parsed = artsData
        .map((item, i) => {
          const result = item.result as any;
          if (!result) return undefined;

          return {
            title: result[0],
            artistName: result[1],
            artistWallet: result[2],
            mediaUrl: result[3],
            previewImage: result[4],
            priceInWei: BigInt(result[5]),
            totalMinted: BigInt(result[6]),
            maxSupply: BigInt(result[7]),
          } satisfies Art;
        })
        .filter(Boolean) as Art[];

      setArts(parsed);
    }
  }, [artsData]);

  return (
    <div className="py-10 space-y-8 px-4 sm:px-6 w-full max-w-screen-lg mx-auto">
      <h2 className="text-2xl sm:text-3xl font-bold text-[#007FFF]">
        Available Fan Collectibles
      </h2>

      <div className="space-y-6">
        {arts.map((art, index) => {
          const imageUrl = art.previewImage.startsWith("ipfs://")
            ? art.previewImage.replace("ipfs://", "https://ipfs.io/ipfs/")
            : art.previewImage;

          return (
            <div
              key={index}
              className="p-4 sm:p-6 border rounded-lg shadow-lg space-y-4 bg-black"
            >
              <h3 className="text-xl font-semibold text-white">{art.title}</h3>

              <p className="text-sm text-gray-400">
                Artist:{" "}
                <span className="relative inline-flex items-center gap-1">
                  ...
                  <span
                    onClick={() => handleCopyAddress(art.artistWallet)}
                    className="cursor-pointer hover:underline"
                    title={art.artistWallet}
                  >
                    {shortenAddress(art.artistWallet)}
                  </span>
                </span>
              </p>

              <div className="w-full h-64 sm:h-96 overflow-hidden rounded-md">
                <img
                  src={imageUrl}
                  alt={art.title}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-400 gap-2">
                <p>Price: {formatEther(art.priceInWei)} ETH</p>
                <p>
                  Mints: {art.totalMinted.toString()} /{" "}
                  {art.maxSupply.toString()}
                </p>
              </div>

              {address && (
                <Transaction
                  chainId={chain?.id}
                  calls={[
                    {
                      address: groupieContractAddress,
                      abi: groupieContractABI,
                      functionName: "mintArt",
                      args: [BigInt(index), BigInt(1)],
                      value: art.priceInWei,
                    },
                  ]}
                >
                  <TransactionButton
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold"
                    text="Mint Collectible"
                  />
                  <TransactionStatus className="mt-2 text-xs text-gray-400">
                    <TransactionStatusLabel />
                    <TransactionStatusAction />
                  </TransactionStatus>
                </Transaction>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
