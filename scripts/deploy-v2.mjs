import fs from "node:fs";
import solc from "solc";
import { ethers } from "ethers";

const RPC_URL =
  process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is required");
}

const source = fs.readFileSync(
  "contracts/BaseProofRegistryV2.sol",
  "utf8"
);

const input = {
  language: "Solidity",
  sources: {
    "BaseProofRegistryV2.sol": {
      content: source
    }
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200
    },
    outputSelection: {
      "*": {
        "*": [
          "abi",
          "evm.bytecode.object"
        ]
      }
    }
  }
};

const output = JSON.parse(
  solc.compile(JSON.stringify(input))
);

if (output.errors) {
  for (const error of output.errors) {
    console.log(error.formattedMessage);
  }

  if (
    output.errors.some(
      error => error.severity === "error"
    )
  ) {
    process.exit(1);
  }
}

const artifact =
  output.contracts[
    "BaseProofRegistryV2.sol"
  ][
    "BaseProofRegistryV2"
  ];

const provider =
  new ethers.JsonRpcProvider(RPC_URL);

const network =
  await provider.getNetwork();

if (network.chainId !== 84532n) {
  throw new Error(
    `Expected Base Sepolia 84532, got ${network.chainId}`
  );
}

const wallet =
  new ethers.Wallet(
    PRIVATE_KEY,
    provider
  );

console.log(
  "Deployer:",
  wallet.address
);

console.log(
  "Balance:",
  ethers.formatEther(
    await provider.getBalance(
      wallet.address
    )
  ),
  "ETH"
);

const factory =
  new ethers.ContractFactory(
    artifact.abi,
    "0x" +
      artifact.evm.bytecode.object,
    wallet
  );

console.log(
  "Deploying BaseProofRegistryV2..."
);

const contract =
  await factory.deploy();

await contract.waitForDeployment();

const address =
  await contract.getAddress();

const tx =
  contract.deploymentTransaction();

console.log("");
console.log(
  "=== BASE PROOF V2 DEPLOYED ==="
);
console.log(
  "Contract:",
  address
);
console.log(
  "Transaction:",
  tx?.hash
);

fs.mkdirSync(
  "deployments",
  {
    recursive: true
  }
);

fs.writeFileSync(
  "deployments/base-sepolia-v2.json",
  JSON.stringify(
    {
      chainId: 84532,
      network: "base-sepolia",
      contract: address,
      deploymentTx: tx?.hash,
      deployer: wallet.address,
      deployedAt:
        new Date().toISOString()
    },
    null,
    2
  )
);
