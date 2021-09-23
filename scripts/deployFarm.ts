import { ethers } from "hardhat";
import { mainConfig, lottoConfig } from "./config";

const nftPrice = ethers.utils.parseEther("1")

async function main() {
    const metamaskAddr = process.env.MM_TEST_ADDRESS
    if (!metamaskAddr) throw Error("Set MM_TEST_ADDRESS in your enviroment to your metamask address")

    const [deployer] = await ethers.getSigners()
    console.log(`Deploying contracts with ${deployer.address}`);

    const balance = await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`)

    /**
     * @notice For testnets without Maker/DAI
     * @dev Comment out if using a network with DAI (ie Kovan) and use/insert
     *      DAI address in config.ts
     */
    const MockERC20 = await ethers.getContractFactory("MockERC20")
    const mockDai = await MockERC20.deploy("MockDai", "mDAI")
    const mockLink = await MockERC20.deploy("MockLink", "mLINK")
    console.log(`MockDai address: ${mockDai.address}`)
    console.log(`MocLink address: ${mockLink.address}`)

    const PmknToken = await ethers.getContractFactory("PmknToken")
    const pmknToken = await PmknToken.deploy()
    console.log(`PmknToken address: ${pmknToken.address}`)

    const JackOLantern = await ethers.getContractFactory("JackOLantern")
    const jackOLantern = await JackOLantern.deploy()
    console.log(`JackOLantern address: ${jackOLantern.address}`)

    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy(jackOLantern.address, pmknToken.address, ...lottoConfig);
    console.log(`Lottery contract address: ${lottery.address}`);

    const PmknFarm = await ethers.getContractFactory("PmknFarm");
    const pmknFarm = await PmknFarm.deploy(
        ...mainConfig, pmknToken.address, jackOLantern.address, lottery.address, nftPrice
        //...mainConfig, pmknToken.address, jackOLantern.address, nftPrice
        // mockDai.address, pmknToken.address, jackOLantern.address, nftPrice
        )
    console.log(`PmknFarm address: ${pmknFarm.address}`)
    console.log(`NFT Price: ${ethers.utils.formatEther(nftPrice)} PMKN`)

    const pmknMinter = await pmknToken.MINTER_ROLE()
    await pmknToken.grantRole(pmknMinter, pmknFarm.address)
    console.log(`PmknToken minter role transferred to: ${pmknFarm.address}`)

    const jackMinter = await jackOLantern.MINTER_ROLE()
    await jackOLantern.grantRole(jackMinter, pmknFarm.address)
    console.log(`Jack-O-Lantern NFT minter role transferred to ${pmknFarm.address}`)

    // Send some eth and mDai to metamask address
    await deployer.sendTransaction({ to: metamaskAddr, value: ethers.utils.parseEther("100.0") })
    await mockDai.mint(metamaskAddr, ethers.utils.parseEther("1000"))
    console.log("Metamask addr now has dai: ", await mockDai.balanceOf(metamaskAddr))

    const addresses = {
        dai      : mockDai.address,
        link     : mockLink.address,
        pmknTok  : pmknToken.address,
        jack     : jackOLantern.address,
        lottery  : lottery.address,
        pmknFarm : pmknFarm.address,
    }

    var fs = require('fs');

    console.log("Writing important addresses to frontend/src/addresses.test.json")
    fs.writeFileSync("frontend/src/addresses.test.json", JSON.stringify(addresses), function(err) {
        if (err) throw err;
    });

}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })
