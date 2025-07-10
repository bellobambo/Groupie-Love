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
    <div className=" py-10 space-y-8 ">
      <h2 className="text-2xl font-bold mb-6 text-[#007FFF]">
        Available Fan Collectibles
      </h2>

      {arts.map((art, index) => {
        const imageUrl = art.artworkURI.startsWith("ipfs://")
          ? art.artworkURI.replace("ipfs://", "https://ipfs.io/ipfs/")
          : art.artworkURI;

        return (
          <div
            key={index}
            className="p-6 border rounded-lg shadow-lg space-y-4 bg-black"
          >
            {/* Title */}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {art.title}
            </h3>

            {/* Artist */}
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Artist: {art.artist}
            </p>

            {/* Media - Increased height */}
            <div className="w-full h-96 overflow-hidden rounded-md">
              {" "}
              {/* Changed from max-h-80 to h-96 */}
              <img
                src={imageUrl}
                alt={art.title}
                className="w-full h-full object-cover rounded-md"
              />
            </div>

            {/* Mints and Price */}
            <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
              <p>
                Mints: {art.mintedCount.toString()} /{" "}
                {art.availableMints.toString()}
              </p>
              <p>Price: {formatEther(art.price)} ETH</p>
            </div>

            {/* Mint Button & Transaction */}
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
                <TransactionStatus className="mt-2">
                  <TransactionStatusLabel />
                  <TransactionStatusAction />
                </TransactionStatus>
              </Transaction>
            )}
          </div>
        );
      })}
    </div>
  );
}
