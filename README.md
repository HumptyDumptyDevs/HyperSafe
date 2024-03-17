# HyperSafe

ZK Rollup Contract Verification Dashboard

## Projects to track

1. zkSync
2. Scroll
3. Polygon
4. Starknet

## Project Layout

**[src/](./src)** - Basic implementation to obtain contract source code, satisfy dependencies & compile with solcjs (currently working with zkSync ExecutorFacet as a POC)

**[app/](./app)** - Svelte web app (early WIP - not working)

_TODO:_

1. Move src code to svelte server code
2. ContractDeploymentVersionHandler.ts - basic implementation to detect a git branch/tag or contract deployments
3. FetchContractsHandler.ts - fetch smart contract and libs
4. ContractVerificationHandler.ts - compile smart contracts, retrieve bytecode via rpc and diff the bytecode
