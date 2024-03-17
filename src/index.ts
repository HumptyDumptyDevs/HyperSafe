import solc from "solc";

interface ImportMap {
  [importPath: string]: URL;
}

// zkSync Executor.sol contract - main
const contractUrl: URL = new URL(
  "https://raw.githubusercontent.com/matter-labs/era-contracts/main/l1-contracts/contracts/zksync/facets/Executor.sol"
);

const systemConfigParamsUrl: URL = new URL(
  "https://raw.githubusercontent.com/matter-labs/era-contracts/main/SystemConfig.json"
);

// const contractUrl: URL = new URL(
//   "https://raw.githubusercontent.com/matter-labs/era-contracts/e77971dba8f589b625e72e69dd7e33ccbe697cc0/l1-contracts/contracts/zksync/facets/Executor.sol"
// );

// const systemConfigParamsUrl: URL = new URL(
//   "https://raw.githubusercontent.com/matter-labs/era-contracts/e77971dba8f589b625e72e69dd7e33ccbe697cc0/SystemConfig.json"
// );

const contracts = new Map<string, string>();

function extractImportPaths(code: string): string[] {
  const importRegex = /import\s*\{?([^\}]+)\}?\s*from\s*["'](.+)["'];/g;
  const importMatches = [...code.matchAll(importRegex)];

  return importMatches.map((match) => match[2]); // Extract the path part
}

async function fetchCodeFromUrl(contractUrl: URL) {
  try {
    const response = await fetch(contractUrl);
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    const code = await response.text();
    // Remove trailing whitespace
    return code.trim();
  } catch (error) {
    console.error("Error fetching file:", error);
    throw error;
  }
}

function buildImportUrls(baseUrl: URL, importPaths: string[]): ImportMap {
  const importMap: ImportMap = {};

  // Initialize the import map with null values
  importPaths.forEach((path) => (importMap[path] = null));

  // Build the URLs
  for (const importPath in importMap) {
    importMap[importPath] = new URL(importPath, baseUrl);
  }

  return importMap;
}

function substituteParams(code: string, contractParams: string): string {
  // Regular expression to match strings enclosed in $( )
  const substitutionRegex = /\$\(([A-Z0-9_]+)\)/g;

  // Try converting contractParams to an object
  try {
    const paramsDict = JSON.parse(contractParams);

    // Check if the regular expression finds any matches in the code
    if (code.match(substitutionRegex)) {
      return code.replace(substitutionRegex, (match, paramName) => {
        return paramsDict.hasOwnProperty(paramName)
          ? String(paramsDict[paramName])
          : match; // Keep the original placeholder
      });
    } else {
      return code; // Return original code if no matches
    }
  } catch (error) {
    console.error("Error parsing contract parameters:", error);
    // You could potentially either return the original code or throw an error here
    return code;
  }
}

function importCallback(path: string): { contents?: string; error?: string } {
  try {
    console.log("Hit importCallback with path:", path);

    const code = contracts.get(path);
    console.log("Code:", code);
    return { contents: code };
  } catch (error) {
    console.error("Error importing file:", error);
    return { error: "File not found" };
  }
}

async function compileSolidityCode(mainContractCode: string) {
  try {
    const input = {
      // https://docs.soliditylang.org/en/v0.5.8/using-the-compiler.html#compiler-input-and-output-json-description
      language: "Solidity",
      sources: {
        [contractUrl.toString()]: {
          // Use a placeholder filename for now
          content: mainContractCode,
        },
      },
      settings: {
        optimizer: {
          // disabled by default
          enabled: true,
          runs: 9999999,
        },
        evmVersion: "paris",
        outputSelection: {
          "*": {
            "*": ["metadata", "evm.bytecode", "evm.deployedBytecode"],
          },
        },
      },
    };

    console.log("Input:", input);

    // const compiledOutput = JSON.parse(solc.compile(JSON.stringify(input)));
    // Sadly the solc import callback requires contract lib data to be available synchronously
    // i.e. it doesn't support async/await fetching from http (Github in our case)
    const compiledOutput = JSON.parse(
      solc.compile(JSON.stringify(input), { import: importCallback })
    );
    console.log("Compiled Output:", JSON.stringify(compiledOutput));
    const contract = compiledOutput.contracts[contractUrl.toString()]; // Assuming a single contract in 'code'
    const contractNames = Object.keys(contract);
    // console.log("Contract:", contract);
    if (contractNames.length === 0) {
      throw new Error("Compiled contract appears to be empty");
    }
    const contractName = contractNames[0];

    const creationBytecode = contract[contractName].evm.bytecode.object;
    const creationBytecodeLinkRefs =
      contract[contractName].evm.bytecode.linkReferences;
    const deployedBytecode = contract[contractName].evm.deployedBytecode.object;
    const deployedBytecodeLinkRefs =
      contract[contractName].evm.deployedBytecode.linkReferences;
    const metadata = contract[contractName].metadata;
    // console.log("Bytecode:", bytecode);
    // console.log("Metadata:", metadata);

    return {
      creationBytecode,
      creationBytecodeLinkRefs,
      deployedBytecode,
      deployedBytecodeLinkRefs,
      metadata,
    };
  } catch (error) {
    console.error("Error compiling Solidity code:", error);
    throw error;
  }
}

async function recursiveFetchAndCompile(
  contractUrl: URL,
  contractParams: string,
  baseUrl: URL = contractUrl
) {
  let contractCode = await fetchCodeFromUrl(contractUrl);
  if (!contracts.has(contractUrl.href)) {
    contractCode = substituteParams(contractCode, contractParams);
    contracts.set(contractUrl.href, contractCode);
  }

  const imports = extractImportPaths(contractCode);
  const libUrls = buildImportUrls(baseUrl, imports);

  for (const libUrl of Object.values(libUrls)) {
    if (!contracts.has(libUrl.href)) {
      await recursiveFetchAndCompile(
        libUrl,
        contractParams,
        new URL("./", libUrl)
      );
    }
  }
}

async function getAndLogCode(contractUrl: URL) {
  try {
    const contractParams = await fetchCodeFromUrl(systemConfigParamsUrl);
    await recursiveFetchAndCompile(contractUrl, contractParams);
    console.log("Contracts:", contracts);
    // Now you can compile the main contract with all dependencies resolved
    const mainContractCode = contracts.get(contractUrl.href);
    if (mainContractCode) {
      const {
        creationBytecode,
        creationBytecodeLinkRefs,
        deployedBytecode,
        deployedBytecodeLinkRefs,
        metadata,
      } = await compileSolidityCode(mainContractCode);
      console.log("Creation Bytecode:", creationBytecode);
      console.log(
        "Creation Bytecode Link References:",
        creationBytecodeLinkRefs
      );
      console.log("Deployed Bytecode:", deployedBytecode);
      console.log(
        "Deployed Bytecode Link References:",
        deployedBytecodeLinkRefs
      );
      console.log("Metadata:", metadata);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

getAndLogCode(contractUrl);
