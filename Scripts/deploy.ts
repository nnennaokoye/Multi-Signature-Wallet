import { ethers } from "hardhat";

async function deployMultisig(boardMembers) {
    console.log('\n======== Deploying MultiSig Contract ========');
    
    // Get the contract factory
    const Multisig = await ethers.getContractFactory("Multisig");

    
    const _multiSigContract = await Multisig.deploy(boardMembers);
    
    // Wait for deployment to complete
    await _multiSigContract.waitForDeployment();

    console.log(`\nMultiSig Contract deployed at: ${await _multiSigContract.getAddress()}`);
    return _multiSigContract;
}

async function main() {
    console.log('====== Starting deployment process ======');

    // Get all available signers
    const signers = await ethers.getSigners();

    // Select the first 20 as board members
    const boardMembers = signers.slice(0, 20).map(signer => signer.address);

    // Deploy the Multisig contract
    await deployMultisig(boardMembers);
}

// Execute the script
main().catch(error => {
    console.error(error);
    process.exit(1);
});
