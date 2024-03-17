type ProjectRepositoryInfo = {
    name: string; 
    repoUrl: URL;
  };
  
  const projectRepositories: ProjectRepositoryInfo[] = [
    {
      name: "zkSync", 
      repoUrl: new URL(
        "https://raw.githubusercontent.com/code-423n4/2024-03-zksync/main/code/contracts/ethereum/contracts/state-transition/chain-deps/facets/Executor.sol"
      )
    }
    // Add more project repositories here if needed
  ]; 

export async const checkRepos() => {

}

const fetchCodeFromRawUrl = async (rawUrl) => {

}