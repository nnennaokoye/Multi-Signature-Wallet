import { expect } from "chai";
import { ethers } from "hardhat";

describe("Multisig Wallet", function () {
  let multisig;
  let owner, nonSigner, recipient;
  let signers;
  const TOTAL_SIGNERS = 20;

  beforeEach(async function () {
    [owner, nonSigner, recipient, ...signers] = await ethers.getSigners();
    signers = signers.slice(0, TOTAL_SIGNERS);
    const validSigners = signers.map(signer => signer.address);

    const Multisig = await ethers.getContractFactory("Multisig");
    multisig = await Multisig.deploy(validSigners);
    await multisig.waitForDeployment(); 
  });

  it("should deploy with valid signers", async function () {
    expect(await multisig.totalSigners()).to.equal(TOTAL_SIGNERS);

    for (const signer of signers) {
      const isMember = await multisig.isBoardMember(signer.address);
      expect(isMember).to.be.true;
    }
  });

  it("should allow a valid signer to submit a transaction", async function () {
    const tx = await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    await expect(tx)
      .to.emit(multisig, "TransactionSubmitted")
      .withArgs(1, recipient.address, ethers.parseEther("1"));
  });

  it("should prevent non-owners from submitting transactions", async function () {
    await expect(
      multisig.connect(nonSigner).submitTransaction(
        recipient.address,
        ethers.parseEther("1")
      )
    ).to.be.revertedWith("Caller is not a valid owner");
  });

  it("should allow valid owners to approve a transaction", async function () {
    await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    const tx = await multisig.connect(signers[1]).approveTransaction(1);

    await expect(tx)
      .to.emit(multisig, "TransactionApproved")
      .withArgs(1, signers[1].address);
  });

  it("should prevent double approval by the same owner", async function () {
    await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    await multisig.connect(signers[1]).approveTransaction(1);

    await expect(
      multisig.connect(signers[1]).approveTransaction(1)
    ).to.be.revertedWith("Already signed");
  });

  it("should prevent non-owners from approving transactions", async function () {
    await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    await expect(
      multisig.connect(nonSigner).approveTransaction(1)
    ).to.be.revertedWith("Caller is not a valid owner");
  });

  it("should execute transaction after reaching total signers approval", async function () {
    await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    await owner.sendTransaction({
      to: await multisig.getAddress(),
      value: ethers.parseEther("10")
    });

    const initialBalance = await ethers.provider.getBalance(recipient.address);

   
    for (let i = 0; i < TOTAL_SIGNERS - 1; i++) {
      await multisig.connect(signers[i]).approveTransaction(1);
    }

    
    expect(await multisig.noOfApproval(1)).to.equal(TOTAL_SIGNERS - 1);

   
    const finalApprovalTx = await multisig.connect(signers[TOTAL_SIGNERS - 1]).approveTransaction(1);
    await finalApprovalTx.wait();

    expect(await multisig.approved(1)).to.be.true;

    const finalBalance = await ethers.provider.getBalance(recipient.address);
    expect(finalBalance.sub(initialBalance)).to.equal(ethers.parseEther("1"));
  });

  it("should prevent execution before reaching total signers approval", async function () {
    await multisig.connect(signers[0]).submitTransaction(
      recipient.address,
      ethers.parseEther("1")
    );

    for (let i = 0; i < TOTAL_SIGNERS - 2; i++) {
      await multisig.connect(signers[i]).approveTransaction(1);
    }

    expect(await multisig.noOfApproval(1)).to.equal(TOTAL_SIGNERS - 2);

  
    await expect(
      multisig.connect(signers[0]).executeTransaction(1)
    ).to.be.revertedWith("Not enough approvals");

   
    await multisig.connect(signers[TOTAL_SIGNERS - 2]).approveTransaction(1);
    expect(await multisig.noOfApproval(1)).to.equal(TOTAL_SIGNERS - 1);

    /
    await expect(
      multisig.connect(signers[0]).executeTransaction(1)
    ).to.be.revertedWith("Not enough approvals");
  });

  it("should receive and track contract balance", async function () {
    const depositAmount = ethers.parseEther("10");

    await owner.sendTransaction({
      to: await multisig.getAddress(),
      value: depositAmount
    });

    
    const balance = await ethers.provider.getBalance(await multisig.getAddress());
    expect(balance).to.equal(depositAmount);
  });

  it("should require amount greater than zero for transaction submission", async function () {
    await expect(
      multisig.connect(signers[0]).submitTransaction(
        recipient.address,
        0
      )
    ).to.be.revertedWith("Amount must be greater than zero");
  });

  it("should require valid beneficiary address for transaction submission", async function () {
    await expect(
      multisig.connect(signers[0]).submitTransaction(
        ethers.ZeroAddress,
        ethers.parseEther("1")
      )
    ).to.be.revertedWith("Invalid beneficiary");
  });
});
