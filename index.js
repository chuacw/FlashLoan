require('dotenv').config();

/*
PRIVATE_KEY=...
FLASH_LOANER=...
INFURA_PROJECT_ID=...
*/

const privateKey = process.env.PRIVATE_KEY;
// your contract address
const flashLoanerAddress = process.env.FLASH_LOANER;
const InfuraProjectID = process.env.INFURA_PROJECT_ID; // Project ID
const { ethers } = require('ethers');

// uni/sushiswap ABIs
const UniswapV2Pair = require('./abis/IUniswapV2Pair.json');
const UniswapV2Factory = require('./abis/IUniswapV2Factory.json');

// use your own Infura node in production
const provider = new ethers.providers.InfuraProvider('mainnet', InfuraProjectID);

const wallet = new ethers.Wallet(privateKey, provider);

const ETH_TRADE = 10;
const DAI_TRADE = 3500;

const runBot = async () => {
  const sushiFactory = new ethers.Contract(
    '0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac', // verified by chuacw
    UniswapV2Factory.abi, wallet,
  );
  const uniswapFactory = new ethers.Contract(
    '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f', // verified by chuacw
    UniswapV2Factory.abi, wallet,
  );

  const BNBTokenAddr             = '0xB8c77482e45F1F44dE1745F52C74426C631bDD52';
  const USDTTokenAddr            = '0xdac17f958d2ee523a2206206994597c13d831ec7';
  const UniswapTokenAddr         = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
  const ChainLinkTokenAddr       = '0x514910771af9ca656af840dff83e8264ecf986ca';
  const USDCTokenAddr            = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
  const VeChainTokenAddr         = '0xd850942ef8811f2a866692a623011bde52a462c1';
  const ThetaTokenAddr           = '0x3883f5e181fccaf8410fa61e12b59bad963fb645';
  const WrappedFilecoinTokenAddr = '0x6e1A19F235bE7ED8E3369eF73b196C07257494DE';
  const WrappedBTCTokenAddr      = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
  const OKBTokenAddr             = '0x75231f58b43240c9718dd58b4967c5114342a86c';
  const BUSDTokenAddr            = '0x4fabb145d64652a948d72533023f6e7a623c7c53';
  const CROTokenAddr             = '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b';
  const cUSDCTokenAddr           = '0x39aa39c021dfbae8fac545936693ac917d5e7563';
  const cETHTokenAddr            = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
  const MakerTokenAddr           = '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2';
  const CompTokenAddr            = '0xc00e94cb662c3520282e6f5717214004a7f26888';
  const DAITokenAddr             = '0x6b175474e89094c44da98b954eedeac495271d0f';
  const cDAITokenAddr            = '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643';
  const HEXTokenAddr             = '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
  const chiliZTokenAddr          = '0x3506424f91fd33084466f402d5d97f05f8e3b4af';
  const WrappedEtherAddr         = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const SushiTokenAddr           = '0x6B3595068778DD592e39A122f4f5a5cF09C90fE2';
  const AMPTokenAddr             = '0xfF20817765cB7f73d4bde2e66e067E58D11095C2';
  const ENJTokenAddr             = '0xF629cBd94d3791C9250152BD8dfBDF380E2a3B9c';
  
  const Token1Address = ENJTokenAddr; // AMPTokenAddr; // DAITokenAddr; // dai Addr
  const Token2Address = WrappedEtherAddr; // Eth Addr

  let sushiEthDai;
  let uniswapEthDai;

  const loadPairs = async () => {
    sushiEthDai = new ethers.Contract(
      await sushiFactory.getPair(Token2Address, Token1Address),
      UniswapV2Pair.abi, wallet,
    );
    uniswapEthDai = new ethers.Contract(
      await uniswapFactory.getPair(Token2Address, Token1Address),
      UniswapV2Pair.abi, wallet,
    );
  };

  await loadPairs();

  provider.on('block', async (blockNumber) => {
    try {
      console.log(blockNumber);

      const sushiReserves = await sushiEthDai.getReserves();
      const uniswapReserves = await uniswapEthDai.getReserves();

      const reserve0Sushi = Number(ethers.utils.formatUnits(sushiReserves[0], 18));

      const reserve1Sushi = Number(ethers.utils.formatUnits(sushiReserves[1], 18));

      const reserve0Uni = Number(ethers.utils.formatUnits(uniswapReserves[0], 18));
      const reserve1Uni = Number(ethers.utils.formatUnits(uniswapReserves[1], 18));

      const priceUniswap = reserve0Uni / reserve1Uni;
      const priceSushiswap = reserve0Sushi / reserve1Sushi;

      const shouldStartEth = priceUniswap < priceSushiswap;
      const spread = Math.abs((priceSushiswap / priceUniswap - 1) * 100) - 0.6;

      const shouldTrade = spread > (
        (shouldStartEth ? ETH_TRADE : DAI_TRADE)
         / Number(
           ethers.utils.formatEther(uniswapReserves[shouldStartEth ? 1 : 0]),
         ));

      console.log(`UNISWAP PRICE  : ${priceUniswap}`);
      console.log(`SUSHISWAP PRICE: ${priceSushiswap}`);
      console.log(`PROFITABLE? ${shouldTrade}`);
      console.log(`CURRENT SPREAD: ${(priceSushiswap / priceUniswap - 1) * 100}%`);
      console.log(`ABSLUTE SPREAD: ${spread}`);

      if (!shouldTrade) return;

      const gasLimit = await sushiEthDai.estimateGas.swap(
        !shouldStartEth ? DAI_TRADE : 0,
        shouldStartEth ? ETH_TRADE : 0,
        flashLoanerAddress,
        ethers.utils.toUtf8Bytes('1'),
      );

      const gasPrice = await wallet.getGasPrice();

      const gasCost = Number(ethers.utils.formatEther(gasPrice.mul(gasLimit)));

      const shouldSendTx = shouldStartEth
        ? (gasCost / ETH_TRADE) < spread
        : (gasCost / (DAI_TRADE / priceUniswap)) < spread;

      console.log(`gasCost is: ${gasCost}`);
      return; // Exit out
      
      
      // don't trade if gasCost is higher than the spread
      if (!shouldSendTx) return;

      const options = {
        gasPrice,
        gasLimit,
      };
      const tx = await sushiEthDai.swap(
        !shouldStartEth ? DAI_TRADE : 0,
        shouldStartEth ? ETH_TRADE : 0,
        flashLoanerAddress,
        ethers.utils.toUtf8Bytes('1'), options,
      );

      console.log('ARBITRAGE EXECUTED! PENDING TX TO BE MINED');
      console.log(tx);

      await tx.wait();

      console.log('SUCCESS! TX MINED');
    } catch (err) {
      console.error(err);
    }
  });
};

console.log('Bot started!');

runBot();
