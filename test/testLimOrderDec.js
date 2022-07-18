const { expect } = require("sasha");
const { ethers } = require("hardhat");

const BigNumber = require('bignumber.js');
const { sign } = require("crypto");
const { getPoolParts, getIzumiswapFactory, newLimOrderWithX, decLimOrderWithX } = require("./funcs.js")

async function getToken(decimalx, decimaly) {

    // deploy token
    const tokenFactory = await ethers.getContractFactory("TestToken")
    tokenX = await tokenFactory.deploy('a', 'a', decimalx);
    await tokenX.deployed();
    tokenY = await tokenFactory.deploy('b', 'b', decimaly);
    await tokenY.deployed();

    txAddr = tokenX.address.toLowerCase();
    tyAddr = tokenY.address.toLowerCase();

    if (txAddr > tyAddr) {
      tmpAddr = tyAddr;
      tyAddr = txAddr;
      txAddr = tmpAddr;

      tmpToken = tokenY;
      tokenY = tokenX;
      tokenX = tmpToken;
    }
    
    return [tokenX, tokenY];
}

function ceil(b) {
    return BigNumber(b.toFixed(0, 2));
}

function floor(b) {
    return BigNumber(b.toFixed(0, 3));
}

function getAmountX(l, r, rate, liquidity, up) {
    amountX = BigNumber('0');
    price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
        amountX = amountX.plus(liquidity.div(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountX);
    }
    return floor(amountX);
}

function getAmountY(l, r, rate, liquidity, up) {
    var amountY = BigNumber('0');
    var price = rate.pow(l);
    for (var idx = l; idx < r; idx ++) {
        amountY = amountY.plus(liquidity.times(price.sqrt()));
        price = price.times(rate);
    }
    if (up) {
        return ceil(amountY);
    }
    return floor(amountY);
}

async function collectLimOrder(limorderManager, seller, orderIdx, collectDec, collectEarn) {
    await limorderManager.connect(seller).collectLimOrder(
        seller.address,
        orderIdx,
        collectDec,
        collectEarn
    );
}

function blockNum2BigNumber(num) {
    var b = BigNumber(num);
    return b;
}
async function getLimorder(sellId, limorderManager) {
     var pt, amount, sellingRemain, sellingDesc, earn, lastAccEarn, poolId, sellXEarnY;
     [pt, amount, sellingRemain, sellingDesc, earn, lastAccEarn, poolId, sellXEarnY] = await limorderManager.limOrders(sellId);
     return {
         pt: pt,
         sellingRemain: blockNum2BigNumber(sellingRemain),
         sellingDesc: blockNum2BigNumber(sellingDesc),
         earn: blockNum2BigNumber(earn),
         lastAccEarn: blockNum2BigNumber(lastAccEarn),
         poolId: blockNum2BigNumber(poolId),
         sellXEarnY: sellXEarnY
     };
}
async function checkLimOrder(sellId, limorderManager, limorderExpect) {
    limorder = await getLimorder(sellId, limorderManager);
    expect(limorder.sellingRemain.toFixed(0)).to.equal(limorderExpect.sellingRemain.toFixed(0));
    expect(limorder.sellingDesc.toFixed(0)).to.equal(limorderExpect.sellingDesc.toFixed(0));
    expect(limorder.earn.toFixed(0)).to.equal(limorderExpect.earn.toFixed(0));
    expect(limorder.lastAccEarn.toFixed(0)).to.equal(limorderExpect.lastAccEarn.toFixed(0));
    expect(limorder.sellXEarnY).to.equal(limorderExpect.sellXEarnY);
}
function getCostY(point, rate, amountX) {
    var sp = rate.pow(point).sqrt();
    var liquidity = ceil(amountX.times(sp));
    var costY = ceil(liquidity.times(sp));
    return costY;
}
function getCostX(point, rate, amountY) {
    var sp = rate.pow(point).sqrt();
    var liquidity = ceil(amountY.div(sp));
    var costX = ceil(liquidity.div(sp));
    return costX;
}
function getAcquireY(point, rate, amountX) {
    var sp = rate.pow(point).sqrt();
    var liquidity = floor(amountX.times(sp));
    var acquireY = floor(liquidity.times(sp));
    return acquireY;
}
function getAcquireX(point, rate, amountY) {
    var sp = rate.pow(point).sqrt();
    var liquidity = floor(amountY.div(sp));
    var acquireX = floor(liquidity.div(sp));
    return acquireX;
}
function blockNum2BigNumber(blc) {
    return BigNumber(blc._hex);
}

function getContractJson(path) {
    const fs = require('fs');
    let rawdata = fs.readFileSync(path);
    let data = JSON.parse(rawdata);
    return data;
}




async function getWETH9(signer) {
    var WETH9Json = getContractJson(__dirname + '/core/WETH9.json');
    var WETH9Factory = await ethers.getContractFactory(WETH9Json.abi, WETH9Json.bytecode, signer);
    var WETH9 = await WETH9Factory.deploy();
    await WETH9.deployed();
    return WETH9;
}
async function getNFTLiquidityManager(factory, weth) {
    const NonfungibleLiquidityManager = await ethers.getContractFactory("LiquidityManager");
    var nflm = await NonfungibleLiquidityManager.deploy(factory.address, weth.address);
    await nflm.deployed();
    return nflm;
}
async function getSwap(factory, weth) {
    const SwapManager = await ethers.getContractFactory("Swap");
    var swap = await SwapManager.deploy(factory.address, weth.address);
    await swap.deployed();
    return swap;
}
async function getLimorderManager(factory, weth) {
    const LimorderManager = await ethers.getContractFactory("LimitOrderManager");
    var limorderManager = await LimorderManager.deploy(factory.address, weth.address);
    await limorderManager.deployed();
    return limorderManager;
}

async function getViewLimorder(factory) {
    const ViewLimorderManager = await ethers.getContractFactory("ViewLimOrder");
    var viewLimorder = await ViewLimorderManager.deploy(factory.address);
    await viewLimorder.deployed();
    return viewLimorder;
}
async function checkBalance(token, miner, expectAmount) {
    var amount = await token.balanceOf(miner.address);
    expect(amount.toString()).to.equal(expectAmount.toFixed(0));
}

async function getCoreEarnY(viewLimorder, pool, miner, pt) {
    var lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign;
    [lastAccEarn, sellingRemain, sellingDesc, earn, earnAssign] = await viewLimorder.getEarn(
        pool, miner, pt, true
    );
    return {
        //lastAccEarn: lastAccEarn.toString(),
        //sellingRemain: sellingRemain.toString(),
        //sellingDesc: sellingDesc.toString(),
        earn: earn.toString(),
        earnAssign: earnAssign.toString()
    };
}
async function checkCoreEarnY(tokenX, tokenY, viewLimorder, limorderManager, pt, expectData) {
    var pool = await viewLimorder.pool(tokenX.address, tokenY.address, "3000");
    earnY = await getCoreEarnY(viewLimorder, pool, limorderManager.address, pt);
    //expect(earnX.lastAccEarn).to.equal(expectData.lastAccEarn.toFixed(0));
    //expect(earnX.sellingRemain).to.equal(expectData.sellingRemain.toFixed(0));
    //expect(earnX.sellingDesc).to.equal(expectData.sellingDesc.toFixed(0));
    expect(earnY.earn).to.equal(expectData.earn.toFixed(0));
    expect(earnY.earnAssign).to.equal(expectData.earnAssign.toFixed(0));
}
async function checkpoolid(nflomAddr, userAddress, orderIdx) {

    const LimitOrderManager = await ethers.getContractFactory("LimitOrderManager");
    var nflom = LimitOrderManager.attach(nflomAddr);
    try {
        const {pt, amount, sellingRemain, accSellingDec, sellingDec, earn, lastAccEarn, poolId, sellXEarnY} = await nflom.getActiveOrder(userAddress, orderIdx);

        console.log("-----------pt: ", pt);
        console.log("-----------selling remain: ", sellingRemain.toString());
        console.log("-----------poolId: ", poolId);
    } catch (err) {
        console.log(err);
    }
}

function translateLimOrder(limOrder) {
    return {
        pt: limOrder.pt,
        amount: limOrder.amount.toString(),
        sellingRemain: limOrder.sellingRemain.toString(),
        accSellingDec: limOrder.accSellingDec.toString(),
        sellingDec: limOrder.sellingDec.toString(),
        earn: limOrder.earn.toString(),
        lastAccEarn: limOrder.lastAccEarn.toString(),
        poolId: limOrder.poolId.toString(),
        sellXEarnY: limOrder.sellXEarnY
    }
}
describe("limorder", function () {
    var signer, seller1, seller2, seller3, trader, trader2;
    var poolPart, poolPartDesire;
    var izumiswapFactory;
    var viewLimorder;
    var weth9;
    var nflm;
    var swap;
    var limorderManager;
    var tokenX, tokenY;
    var rate;
    beforeEach(async function() {
        [signer, seller1, seller2, seller3, trader, trader2, recipient1, recipient2, receiver] = await ethers.getSigners();

        const {swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule} = await getPoolParts();
        izumiswapFactory = await getIzumiswapFactory(receiver.address, swapX2YModule, swapY2XModule, liquidityModule, limitOrderModule, flashModule, signer);
        weth9 = await getWETH9(signer);
        nflm = await getNFTLiquidityManager(izumiswapFactory, weth9);
        swap = await getSwap(izumiswapFactory, weth9);
        limorderManager = await getLimorderManager(izumiswapFactory, weth9);
        viewLimorder = await getViewLimorder(izumiswapFactory);

        [tokenX, tokenY] = await getToken(18, 18);
        txAddr = tokenX.address.toLowerCase();
        tyAddr = tokenY.address.toLowerCase();

        poolAddr = await nflm.createPool(tokenX.address, tokenY.address, 3000, -500000);
        rate = BigNumber("1.0001");
        await tokenY.transfer(trader.address, "100000000000000");
        await tokenY.connect(trader).approve(swap.address, "100000000000000");
    });

    
    it("first claim first earn", async function() {
        sellX1 = BigNumber("1000000000");
        await newLimOrderWithX(0, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 0);
        
        await newLimOrderWithX(1, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 1);

        await newLimOrderWithX(2, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 2);

        await newLimOrderWithX(3, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 3);

        await newLimOrderWithX(4, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 4);

        await newLimOrderWithX(5, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230250);
        await checkpoolid(limorderManager.address, seller1.address, 5);



        await decLimOrderWithX(seller1, 5, limorderManager, "500000000000");
        await checkpoolid(limorderManager.address, seller1.address, 6);
    });


    it("first claim first earn", async function() {
        sellX1 = BigNumber("1000000000");
        await newLimOrderWithX(0, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210000);
        await checkpoolid(limorderManager.address, seller1.address, 0);
        
        await newLimOrderWithX(1, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210100);
        await checkpoolid(limorderManager.address, seller1.address, 1);

        await newLimOrderWithX(0, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310000);
        await checkpoolid(limorderManager.address, seller2.address, 0);
        await newLimOrderWithX(1, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310100);
        await checkpoolid(limorderManager.address, seller2.address, 1);
        await newLimOrderWithX(2, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310200);
        await checkpoolid(limorderManager.address, seller2.address, 2);
        

        await newLimOrderWithX(2, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210200);
        await checkpoolid(limorderManager.address, seller1.address, 2);

        await newLimOrderWithX(3, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210300);
        await checkpoolid(limorderManager.address, seller1.address, 3);

        await newLimOrderWithX(4, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210400);
        await checkpoolid(limorderManager.address, seller1.address, 4);

        await newLimOrderWithX(5, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210500);
        await checkpoolid(limorderManager.address, seller1.address, 5);
        await newLimOrderWithX(6, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210600);
        await checkpoolid(limorderManager.address, seller1.address, 6);


        await newLimOrderWithX(3, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310300);
        await checkpoolid(limorderManager.address, seller2.address, 3);
        await newLimOrderWithX(4, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310400);
        await checkpoolid(limorderManager.address, seller2.address, 4);
        await newLimOrderWithX(5, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310500);
        await checkpoolid(limorderManager.address, seller2.address, 5);
        await newLimOrderWithX(6, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310600);
        await checkpoolid(limorderManager.address, seller2.address, 6);
        await newLimOrderWithX(7, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -310700);
        await checkpoolid(limorderManager.address, seller2.address, 7);

        await newLimOrderWithX(7, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210700);
        await checkpoolid(limorderManager.address, seller1.address, 7);
        await newLimOrderWithX(8, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -210800);
        await checkpoolid(limorderManager.address, seller1.address, 8);

        await decLimOrderWithX(seller1, 5, limorderManager, "500000000000");
        await decLimOrderWithX(seller1, 2, limorderManager, "500000000000");
        await decLimOrderWithX(seller2, 2, limorderManager, "500000000000");
        await decLimOrderWithX(seller2, 6, limorderManager, "500000000000");

        let {activeIdx, activeLimitOrder} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx = activeIdx.map((e)=>e.toString());
        activeLimitOrder = activeLimitOrder.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx);
        console.log('LimitOrder: ', activeLimitOrder)

        await collectLimOrder(limorderManager, seller1, 5, '500000000000', '500000000000');
        await collectLimOrder(limorderManager, seller1, 2, '500000000000', '500000000000');

        let {activeIdx: activeIdx2, activeLimitOrder: activeLimitOrder2} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx2 = activeIdx2.map((e)=>e.toString());
        activeLimitOrder2 = activeLimitOrder2.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx2);
        console.log('LimitOrder: ', activeLimitOrder2)

        let deactiveLimitOrder = await limorderManager.getDeactiveOrders(seller1.address);
        deactiveLimitOrder = deactiveLimitOrder.map((e)=>translateLimOrder(e));
        console.log('deactive LimitOrder: ', deactiveLimitOrder)


        await collectLimOrder(limorderManager, seller2, 6, '500000000000', '500000000000');
        await decLimOrderWithX(seller2, 7, limorderManager, "500000000000");
        await collectLimOrder(limorderManager, seller2, 7, '500000000000', '500000000000');
        await decLimOrderWithX(seller2, 4, limorderManager, "500000000000");
        await collectLimOrder(limorderManager, seller2, 4, '500000000000', '500000000000');


        await newLimOrderWithX(2, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -230200);
        await checkpoolid(limorderManager.address, seller1.address, 2);
        let {activeIdx: activeIdx3, activeLimitOrder: activeLimitOrder3} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx3 = activeIdx3.map((e)=>e.toString());
        activeLimitOrder3 = activeLimitOrder3.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx3);
        console.log('LimitOrder: ', activeLimitOrder3)

        await decLimOrderWithX(seller1, 3, limorderManager, "500000000000");
        await decLimOrderWithX(seller1, 0, limorderManager, "500000000000");
        await decLimOrderWithX(seller1, 6, limorderManager, "500000000000");
        await collectLimOrder(limorderManager, seller1, 6, '500000000000', '500000000000');

        await newLimOrderWithX(6, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -240600);
        await checkpoolid(limorderManager.address, seller1.address, 6);
        let {activeIdx: activeIdx4, activeLimitOrder: activeLimitOrder4} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx4 = activeIdx4.map((e)=>e.toString());
        activeLimitOrder4 = activeLimitOrder4.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx4);
        console.log('LimitOrder: ', activeLimitOrder4)

        await decLimOrderWithX(seller1, 8, limorderManager, "500000000000");
        await collectLimOrder(limorderManager, seller1, 8, '500000000000', '500000000000');

        await newLimOrderWithX(8, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -250800);
        await checkpoolid(limorderManager.address, seller1.address, 8);
        let {activeIdx: activeIdx5, activeLimitOrder: activeLimitOrder5} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx5 = activeIdx5.map((e)=>e.toString());
        activeLimitOrder5 = activeLimitOrder5.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx5);
        console.log('LimitOrder: ', activeLimitOrder5)


        await newLimOrderWithX(9, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -260900);
        await newLimOrderWithX(6, tokenX, tokenY, seller2, limorderManager, sellX1.toFixed(0), -360600);
        await checkpoolid(limorderManager.address, seller1.address, 9);
        let {activeIdx: activeIdx6, activeLimitOrder: activeLimitOrder6} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx6 = activeIdx6.map((e)=>e.toString());
        activeLimitOrder6 = activeLimitOrder6.map((e)=>translateLimOrder(e));
        console.log('idxList: ', activeIdx6);
        console.log('LimitOrder: ', activeLimitOrder6)


        await collectLimOrder(limorderManager, seller1, 0, '500000000000', '500000000000');

        // let {activeIdx: activeIdx7, activeLimitOrder: activeLimitOrder7} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        // activeIdx7 = activeIdx7.map((e)=>e.toString());
        // activeLimitOrder7 = activeLimitOrder7.map((e)=>translateLimOrder(e));
        // console.log('idxList: ', activeIdx7);
        // console.log('LimitOrder: ', activeLimitOrder7)

        await newLimOrderWithX(0, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -270000);
        await checkpoolid(limorderManager.address, seller1.address, 0);
        let {activeIdx: activeIdx7, activeLimitOrder: activeLimitOrder7} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx7 = activeIdx7.map((e)=>e.toString());
        activeLimitOrder7 = activeLimitOrder7.map((e)=>translateLimOrder(e));
        console.log('idxList7: ', activeIdx7);
        console.log('LimitOrder7: ', activeLimitOrder7)


        await decLimOrderWithX(seller1, 8, limorderManager, "500000000000");
        await collectLimOrder(limorderManager, seller1, 8, '500000000000', '500000000000');

        await newLimOrderWithX(8, tokenX, tokenY, seller1, limorderManager, sellX1.toFixed(0), -280800);
        await checkpoolid(limorderManager.address, seller1.address, 8);
        let {activeIdx: activeIdx8, activeLimitOrder: activeLimitOrder8} = await limorderManager.getActiveOrders(seller1.address); //.map((e)=>translateLimOrder(e));
        activeIdx8 = activeIdx8.map((e)=>e.toString());
        activeLimitOrder8 = activeLimitOrder8.map((e)=>translateLimOrder(e));
        console.log('idxList8: ', activeIdx8);
        console.log('LimitOrder8: ', activeLimitOrder8)

        let {activeIdx: activeIdx8_2, activeLimitOrder: activeLimitOrder8_2} = await limorderManager.getActiveOrders(seller2.address); //.map((e)=>translateLimOrder(e));
        activeIdx8_2 = activeIdx8_2.map((e)=>e.toString());
        activeLimitOrder8_2 = activeLimitOrder8_2.map((e)=>translateLimOrder(e));
        console.log('idxList 8_2: ', activeIdx8_2);
        console.log('LimitOrder 8_2: ', activeLimitOrder8_2)

        let deactiveLimitOrder8 = await limorderManager.getDeactiveOrders(seller1.address);
        deactiveLimitOrder8 = deactiveLimitOrder8.map((e)=>translateLimOrder(e));
        console.log('deactive LimitOrder8: ', deactiveLimitOrder8)

        let deactiveLimitOrder8_2 = await limorderManager.getDeactiveOrders(seller2.address);
        deactiveLimitOrder8_2 = deactiveLimitOrder8_2.map((e)=>translateLimOrder(e));
        console.log('deactive LimitOrder 8_2: ', deactiveLimitOrder8_2)
    });
});
