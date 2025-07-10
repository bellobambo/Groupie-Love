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
  artist: string;
  title: string;
  artworkURI: string;
  musicURI: string;
  price: bigint;
  availableMints: bigint;
  mintedCount: bigint;
}

export default function FanMintPage() {
  const { address, chain } = useAccount();
  const [arts, setArts] = useState<Art[]>([]);

  const { data: nextArtIdData } = useReadContracts({
    contracts: [
      {
        address: groupieContractAddress,
        abi: groupieContractABI,
        functionName: "nextArtId",
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
            artist: result[0],
            title: result[1],
            artworkURI: result[2],
            musicURI: result[3],
            price: BigInt(result[4]),
            availableMints: BigInt(result[5]),
            mintedCount: BigInt(result[6]),
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
          const imageUrl = art.artworkURI.startsWith("ipfs://")
            ? art.artworkURI.replace("ipfs://", "https://ipfs.io/ipfs/")
            : art.artworkURI;

          return (
            <div
              key={index}
              className="p-4 sm:p-6 border rounded-lg shadow-lg space-y-4 bg-black"
            >
              <h3 className="text-xl font-semibold text-white">{art.title}</h3>

              <p className="text-sm text-gray-400">Artist: {art.artist}</p>

              <div className="w-full h-64 sm:h-96 overflow-hidden rounded-md">
                <img
                  src={imageUrl}
                  alt={art.title}
                  className="w-full h-full object-cover rounded-md"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between text-sm text-gray-400 gap-2">
                <p>
                  Mints: {art.mintedCount.toString()} /{" "}
                  {art.availableMints.toString()}
                </p>
                <p>Price: {formatEther(art.price)} ETH</p>
              </div>

              {address && (
                <Transaction
                  chainId={chain?.id}
                  calls={[
                    {
                      address: groupieContractAddress,
                      abi: groupieContractABI,
                      functionName: "mintArt",
                      args: [BigInt(index)],
                      value: art.price,
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
