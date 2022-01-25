const { ethers } = require("hardhat");
const deployed = require('../deployed.js');

/*

example: 

HARDHAT_NETWORK='izumiTest' node scripts/nfLimOrderManager/deployNfLimOrder.js

*/

const net = process.env.HARDHAT_NETWORK

async function main() {
    // deploy nft
    const NonfungibleLOrderManager = await ethers.getContractFactory("NonfungibleLOrderManager");
    const iZiSwapFactory = deployed[net].iZiSwapFactory;
    const weth = deployed[net].WETH9
    const nflom = await NonfungibleLOrderManager.deploy(iZiSwapFactory, weth);
    console.log("NonfungibleLOrderManager: ", nflom.address);
    await nflom.deployed();
}

main().then(() => process.exit(0))
.catch((error) => {
  console.error(error);
  process.exit(1);
})