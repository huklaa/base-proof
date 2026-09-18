import fs from "node:fs";
import solc from "solc";

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
}

const fatal =
  output.errors?.some(
    error => error.severity === "error"
  ) ?? false;

if (fatal) {
  process.exit(1);
}

const artifact =
  output.contracts[
    "BaseProofRegistryV2.sol"
  ][
    "BaseProofRegistryV2"
  ];

if (
  !artifact?.evm?.bytecode?.object
) {
  throw new Error(
    "Missing V2 bytecode"
  );
}

console.log(
  "BaseProofRegistryV2 compiled successfully"
);
