import React, { useState, useEffect } from "react";
import {
  BiconomySmartAccountV2,
  PaymasterMode,
  type SupportedSigner,
  createSmartAccountClient,
} from "@biconomy/account";
import { ethers } from "ethers";
import { ParticleAuthModule, ParticleProvider } from "@biconomy/particle-auth";
import { contractABI } from "../contract/contractABI"; // Assuming your ABI is in this file
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { privateKeyToAccount } from "viem/accounts";

export default function Home() {
  const [smartAccount, setSmartAccount] = useState<BiconomySmartAccountV2 | null>(null);
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | null>(null);
  const [count, setCount] = useState<string | null>(null);
  const [txnHash, setTxnHash] = useState<string | null>(null);
  const [chainSelected, setChainSelected] = useState<number>(0);
  const [particleSigner, setParticleSigner] = useState<SupportedSigner | null>(null); // Store the signer
  const [tokenBalance, setTokenBalance] = useState<string | null>(null); // State for token balance
  const [feeQuotes, setFeeQuotes] = useState<any[]>([]); // State to store fee quotes

  const chains = [
    {
      chainId: 11155420,
      name: "OP Sepolia",
      providerUrl: "https://sepolia.optimism.io",
      incrementCountContractAdd: "0xbF04612ff3067C170C911677D9A9c83A717de142",
      biconomyPaymasterApiKey: "s4AKWctFg.55929663-9cf2-419a-91ff-56e71bd6305c", // Make sure this is the correct API key for your paymaster
      explorerUrl: "https://sepolia-optimism.etherscan.io",
      usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      bundlerUrl: "https://bundler.biconomy.io/api/v2/11155420/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44", // Make sure this is the correct bundler URL for Sepolia
    },
    {
      chainId: 11155111,
      name: "Ethereum Sepolia",
      providerUrl: "https://eth-sepolia.public.blastapi.io",
      incrementCountContractAdd: "0xd9ea570eF1378D7B52887cE0342721E164062f5f",
      biconomyPaymasterApiKey: "4339CfYwM.bf9fb7a0-5534-4062-b08f-ba7d5a4eb203",
      explorerUrl: "https://sepolia.etherscan.io/tx/",
      usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      bundlerUrl: "https://bundler.biconomy.io/api/v2/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
    },
    {
      chainId: 80002,
      name: "Polygon Amoy",
      providerUrl: "https://rpc-amoy.polygon.technology/",
      incrementCountContractAdd: "0xfeec89eC2afD503FF359487967D02285f7DaA9aD",
      biconomyPaymasterApiKey: "Ku9PkEtK3.57cb3ccd-26d2-4ebd-9459-2f03481fd91f",
      explorerUrl: "https://www.oklink.com/amoy/tx/",
      usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
      bundlerUrl: "https://bundler.biconomy.io/api/v2/80002/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44",
    },
  ];

  let particle: any;

  useEffect(() => {
    particle = new ParticleAuthModule.ParticleNetwork({
      projectId: "277b3a4d-88be-40b1-a173-0e0a74cf0450",
      clientKey: "chbbTTPujluxLQmPtNIdakKZYVxggnSnKESQeMqy",
      appId: "85f3f8e2-119d-4a2e-afc6-ba3b37ed936b",
      chainId: chains[chainSelected].chainId,
      wallet: {
        displayWalletEntry: true,
        defaultWalletEntryPosition: ParticleAuthModule.WalletEntryPosition.BR,
      },
    });
  }, [chainSelected]);

  const connect = async () => {
    try {
      const userInfo = await particle.auth.login();
      console.log("Logged in user:", userInfo);
      const particleProvider = new ParticleProvider(particle.auth);
      const web3Provider = new ethers.providers.Web3Provider(particleProvider, "any");

      const particleSigner = web3Provider.getSigner();
      console.log("Particle Signer", particleSigner);

      setParticleSigner(particleSigner); // Store the signer in state

      const smartWallet = await createSmartAccountClient({
        signer: particleSigner, // Using the Particle signer here
        biconomyPaymasterApiKey: chains[chainSelected].biconomyPaymasterApiKey, // Use the API key from the chain object
        bundlerUrl: chains[chainSelected].bundlerUrl, // Use the bundler URL from the chain object
        rpcUrl: chains[chainSelected].providerUrl,
        chainId: chains[chainSelected].chainId,
      });

      setSmartAccount(smartWallet);
      const saAddress = await smartWallet.getAccountAddress();
      console.log("Smart Account Address", saAddress);
      setSmartAccountAddress(saAddress);

      // Get the token balance after connecting
      await getTokenBalance(saAddress);
    } catch (error) {
      console.error(error);
    }
  };

  const getTokenBalance = async (accountAddress: string) => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(chains[chainSelected].providerUrl);
      const usdcContract = new ethers.Contract(
        chains[chainSelected].usdcAddress,
        ["function balanceOf(address account) view returns (uint256)"],
        provider
      );
      const balance = await usdcContract.balanceOf(accountAddress);
      setTokenBalance(ethers.utils.formatUnits(balance, 6)); // Assuming USDC has 6 decimals
    } catch (error) {
      console.error("Error fetching token balance:", error);
    }
  };

  const getCountId = async () => {
    const contractAddress = chains[chainSelected].incrementCountContractAdd;
    const provider = new ethers.providers.JsonRpcProvider(chains[chainSelected].providerUrl);
    const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);
    const countId = await contractInstance.getCount();
    setCount(countId.toString());
  };

  const getFeeQuotes = async () => {
    try {
      if (!smartAccount) {
        throw new Error("Smart account is not initialized.");
      }

      const contractAddress = chains[chainSelected].incrementCountContractAdd;
      const provider = new ethers.providers.JsonRpcProvider(chains[chainSelected].providerUrl);
      const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);
      const encodedData = contractInstance.interface.encodeFunctionData("increment");

      const feeQuotesResponse = await smartAccount.getTokenFees(
        {
          to: contractAddress,
          data: encodedData,
        },
        {
          paymasterServiceData: { mode: PaymasterMode.ERC20 },
        }
      );

      console.log("Fee Quotes Response:", feeQuotesResponse); 
      setFeeQuotes(feeQuotesResponse.feeQuotes || []); // Handle undefined feeQuotes

      return feeQuotesResponse;
    } catch (error) {
      console.error("Error fetching fee quotes:", error);
    }
  };

  const incrementCount = async () => {
    try {
      const toastId = toast("Populating Transaction", { autoClose: false });

      const contractAddress = chains[chainSelected].incrementCountContractAdd;
      const provider = new ethers.providers.JsonRpcProvider(chains[chainSelected].providerUrl);
      const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);

      const encodedData = contractInstance.interface.encodeFunctionData("increment");

      if (!particleSigner) {
        throw new Error("Particle signer is not available.");
      }

      const smartAccount = await createSmartAccountClient({
        signer: particleSigner,
        biconomyPaymasterApiKey: chains[chainSelected].biconomyPaymasterApiKey,
        bundlerUrl: chains[chainSelected].bundlerUrl,
        rpcUrl: chains[chainSelected].providerUrl,
        chainId: chains[chainSelected].chainId,
      });

      const scwAddress = await smartAccount.getAccountAddress();
      console.log("SCW Address", scwAddress);

      const feeQuotesResponse = await getFeeQuotes();
      console.log("Fee Quotes", feeQuotesResponse);

      if (feeQuotesResponse && feeQuotesResponse.feeQuotes && feeQuotesResponse.feeQuotes.length > 0) {
        const userSelectedFeeQuote = feeQuotesResponse.feeQuotes[0]; 

        toast.update(toastId, {
          render: "Sending Transaction",
          autoClose: false,
        });

        const recommendedMaxPriorityFeePerGas = userSelectedFeeQuote.maxGasFee;
        console.log("recommendedMaxPriorityFeePerGas", recommendedMaxPriorityFeePerGas);
        console.log("Sending Transaction",feeQuotesResponse.tokenPaymasterAddress,userSelectedFeeQuote,feeQuotesResponse.feeQuotes[0].tokenAddress);

        const { waitForTxHash } = await smartAccount?.sendTransaction(
          {
            to: contractAddress,
            data: encodedData || "0x",
          },
          {
            paymasterServiceData: {
              mode: PaymasterMode.ERC20,
              feeQuote: userSelectedFeeQuote,
              preferredToken: feeQuotesResponse.feeQuotes[0].tokenAddress,
              spender: feeQuotesResponse.tokenPaymasterAddress,
              maxApproval: true,
              // maxPriorityFeePerGas: recommendedMaxPriorityFeePerGas, // Remove this line
            },
          }
        );

        const { transactionHash } = await waitForTxHash();
        console.log("transactionHash", transactionHash);

        if (transactionHash) {
          toast.update(toastId, {
            render: "Transaction Successful",
            type: "success",
            autoClose: 5000,
          });
          setTxnHash(transactionHash);
          await getCountId();
        }
      } else {
        toast.error("No fee quotes available", { autoClose: 5000 });
      }
    } catch (error) {
      console.log(error);
      toast.error("Transaction Unsuccessful", { autoClose: 5000 });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start gap-8 p-24">
      {!smartAccount && (
        <>
          <div className="flex flex-row justify-center items-center gap-4">
            <div
              className={`w-[8rem] h-[3rem] cursor-pointer rounded-lg flex flex-row justify-center items-center text-white ${
                chainSelected == 0 ? "bg-red" : "bg-black"
              } bg-black border-2 border-solid border-orange-400`}
              onClick={() => {
                setChainSelected(0);
              }}
            >
              OP SEPOLIA
            </div>
            <div
              className={`w-[8rem] h-[3rem] cursor-pointer rounded-lg flex flex-row justify-center items-center text-white ${
                chainSelected == 1 ? "bg-white" : "bg-black"
              } bg-black border-2 border-solid border-orange-400`}
              onClick={() => {
                setChainSelected(1);
              }}
            >
              ETH SEPOLIA
            </div>
            <div
              className={`w-[8rem] h-[3rem] cursor-pointer rounded-lg flex flex-row justify-center items-center text-white ${
                chainSelected == 2 ? "bg-white" : "bg-black"
              } bg-black border-2 border-solid border-orange-400`}
              onClick={() => {
                setChainSelected(2);
              }}
            >
              POLY AMOY
            </div>
          </div>
          <button
            className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
            onClick={connect}
          >
            Particle Sign in
          </button>
        </>
      )}

      {smartAccount && (
        <>
          {" "}
          <span>Smart Account Address</span>
          <span>{smartAccountAddress}</span>
          <span>Network: {chains[chainSelected].name}</span>
          <div className="flex flex-row justify-between items-start gap-8">
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={getCountId}
              >
                Get Count Id
              </button>
              <span>{count}</span>
            </div>
            <div className="flex flex-col justify-center items-center gap-4">
              <button
                className="w-[10rem] h-[3rem] bg-orange-300 text-black font-bold rounded-lg"
                onClick={incrementCount}
              >
                Increment Count
              </button>
              {txnHash && (
                <a target="_blank" href={`${chains[chainSelected].explorerUrl + txnHash}`}>
                  <span className="text-white font-bold underline">Txn Hash</span>
                </a>
              )}
            </div>
          </div>
          <div>
            <span>USDC Balance: </span>
            <span>{tokenBalance}</span>
          </div>
        
        </>
      )}
    </main>
  );
}