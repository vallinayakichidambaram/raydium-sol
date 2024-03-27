"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePoolInfo = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const raydium_sdk_1 = require("@raydium-io/raydium-sdk");
const serum_1 = require("@project-serum/serum");
const bn_js_1 = __importDefault(require("bn.js"));
function getTokenAccounts(connection, owner) {
    return __awaiter(this, void 0, void 0, function* () {
        const tokenResp = yield connection.getTokenAccountsByOwner(owner, {
            programId: spl_token_1.TOKEN_PROGRAM_ID,
        });
        const accounts = [];
        for (const { pubkey, account } of tokenResp.value) {
            accounts.push({
                programId: owner,
                pubkey: pubkey,
                accountInfo: raydium_sdk_1.SPL_ACCOUNT_LAYOUT.decode(account.data),
            });
        }
        return accounts;
    });
}
// raydium pool id can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
const SOL_USDC_POOL_ID = "58oQChx4yWmvKdwLLZzBi4ChoCc2fqCUWBkwMihLYQo2";
const OPENBOOK_PROGRAM_ID = new web3_js_1.PublicKey("srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX");
function parsePoolInfo() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const mainnet_rpc = "https://api.mainnet-beta.solana.com";
        const connection = new web3_js_1.Connection(mainnet_rpc, "confirmed");
        const owner = new web3_js_1.PublicKey("VnxDzsZ7chE88e9rB6UKztCt2HUwrkgCTx8WieWf5mM");
        const tokenAccounts = yield getTokenAccounts(connection, owner);
        // example to get pool info
        const info = yield connection.getAccountInfo(new web3_js_1.PublicKey(SOL_USDC_POOL_ID));
        if (!info)
            return;
        const poolState = raydium_sdk_1.LIQUIDITY_STATE_LAYOUT_V4.decode(info.data);
        const openOrders = yield serum_1.OpenOrders.load(connection, poolState.openOrders, OPENBOOK_PROGRAM_ID // OPENBOOK_PROGRAM_ID(marketProgramId) of each pool can get from api: https://api.raydium.io/v2/sdk/liquidity/mainnet.json
        );
        const baseDecimal = 10 ** poolState.baseDecimal.toNumber(); // e.g. 10 ^ 6
        const quoteDecimal = 10 ** poolState.quoteDecimal.toNumber();
        const baseTokenAmount = yield connection.getTokenAccountBalance(poolState.baseVault);
        const quoteTokenAmount = yield connection.getTokenAccountBalance(poolState.quoteVault);
        const basePnl = poolState.baseNeedTakePnl.toNumber() / baseDecimal;
        const quotePnl = poolState.quoteNeedTakePnl.toNumber() / quoteDecimal;
        const openOrdersBaseTokenTotal = openOrders.baseTokenTotal.toNumber() / baseDecimal;
        const openOrdersQuoteTokenTotal = openOrders.quoteTokenTotal.toNumber() / quoteDecimal;
        const base = (((_a = baseTokenAmount.value) === null || _a === void 0 ? void 0 : _a.uiAmount) || 0) + openOrdersBaseTokenTotal - basePnl;
        const quote = (((_b = quoteTokenAmount.value) === null || _b === void 0 ? void 0 : _b.uiAmount) || 0) +
            openOrdersQuoteTokenTotal -
            quotePnl;
        const denominator = new bn_js_1.default(10).pow(poolState.baseDecimal);
        const addedLpAccount = tokenAccounts.find((a) => a.accountInfo.mint.equals(poolState.lpMint));
        console.log("SOL_USDC pool info:", "\n", "pool total base " + base, "\n", "pool total quote " + quote, "\n", "base vault balance " + baseTokenAmount.value.uiAmount, "\n", "quote vault balance " + quoteTokenAmount.value.uiAmount, "\n", "base tokens in openorders " + openOrdersBaseTokenTotal, "\n", "quote tokens in openorders  " + openOrdersQuoteTokenTotal, "\n", "base token decimals " + poolState.baseDecimal.toNumber(), "\n", "quote token decimals " + poolState.quoteDecimal.toNumber(), "\n", "total lp " + poolState.lpReserve.div(denominator).toString(), "\n", "addedLpAmount " +
            ((addedLpAccount === null || addedLpAccount === void 0 ? void 0 : addedLpAccount.accountInfo.amount.toNumber()) || 0) / baseDecimal);
    });
}
exports.parsePoolInfo = parsePoolInfo;
parsePoolInfo();
