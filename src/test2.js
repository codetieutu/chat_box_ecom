import axios from "axios";
import { ethers } from "ethers";
import env from "dotenv";
env.config();

const RPC_URL = process.env.RPC_URL_BEP20 //bep20
const ADDRESS_WALLET = process.env.ADDRESS_WALLET?.toLowerCase(); // ví đích cần kiểm tra

const TOKENS = {
    USDT: {
        address: "0x55d398326f99059fF775485246999027B3197955",
        decimals: 18,
    },
    USDC: {
        address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
        decimals: 18,
    },
};

async function getTransactionByHash(txHash, minTimestamp = null) {
    const result = {
        from: null,
        to: null,
        amount: null,
        token: null,
        network: "BNB Smart Chain",
        timestamp: null,
        message: "",
        status: false, // 👈 thêm trường status mặc định false
    };

    try {
        // 1️⃣ Lấy thông tin giao dịch
        const txRes = await axios.post(
            RPC_URL,
            {
                jsonrpc: "2.0",
                method: "eth_getTransactionByHash",
                params: [txHash],
                id: 1,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const tx = txRes.data.result;
        if (!tx) {
            result.message = "Không tìm thấy giao dịch trên mạng BNB Smart Chain.";
            return result;
        }

        // 2️⃣ Kiểm tra có input
        if (!tx.input || tx.input.length < 10) {
            result.message = "Giao dịch này không phải giao dịch token (không có input).";
            return result;
        }

        // 3️⃣ Kiểm tra token contract
        const tokenEntry = Object.entries(TOKENS).find(
            ([, token]) => token.address.toLowerCase() === tx.to.toLowerCase()
        );

        if (!tokenEntry) {
            result.message = "Không phải giao dịch USDT hoặc USDC.";
            return result;
        }

        const [tokenSymbol, tokenInfo] = tokenEntry;

        // 4️⃣ Giải mã input
        const methodId = tx.input.slice(0, 10);
        if (methodId !== "0xa9059cbb") {
            result.message = "Không phải hàm transfer(address,uint256).";
            return result;
        }

        const params = "0x" + tx.input.slice(10);
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
            ["address", "uint256"],
            params
        );

        const toAddress = decoded[0].toLowerCase();
        const amountRaw = decoded[1].toString();
        const amount = parseFloat(ethers.formatUnits(amountRaw, tokenInfo.decimals));

        // 5️⃣ Lấy timestamp từ block
        const blockRes = await axios.post(
            RPC_URL,
            {
                jsonrpc: "2.0",
                method: "eth_getBlockByNumber",
                params: [tx.blockNumber, false],
                id: 1,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        const block = blockRes.data.result;
        if (block && block.timestamp) {
            const txTimestamp = parseInt(block.timestamp, 16); // giây UNIX
            result.timestamp = txTimestamp;

            // 🔹 Kiểm tra thời gian tối thiểu
            if (minTimestamp) {
                const min =
                    minTimestamp instanceof Date
                        ? minTimestamp.getTime() / 1000
                        : minTimestamp;
                if (txTimestamp < min) {
                    result.message = "⏰ Giao dịch được thực hiện TRƯỚC thời điểm yêu cầu.";
                    return result;
                }
            }
        }

        // 6️⃣ Kiểm tra ví đích
        if (ADDRESS_WALLET && toAddress !== ADDRESS_WALLET) {
            result.message = `Giao dịch không gửi về ví đích (${toAddress})`;
            return result;
        }

        // ✅ Hợp lệ
        result.from = tx.from;
        result.to = toAddress;
        result.amount = amount;
        result.token = tokenSymbol;
        result.status = true; // 👈 đánh dấu giao dịch hợp lệ
        result.message = "✅ Giao dịch hợp lệ và sau thời gian yêu cầu";

        return result;
    } catch (err) {
        result.message = "⚠️ Lỗi khi truy vấn: " + err.message;
        result.status = false;
        return result;
    }
}

// 🧪 Ví dụ sử dụng
(async () => {
    const hash = "0xce617bd8d7c5e2fd85d0d8b1a2e7dbace448f0b2d44e7892451aa2d5447d503f";
    const timestampAfter = Math.floor(new Date("2025-11-05T16:00:00Z").getTime() / 1000); // epoch seconds
    const info = await getTransactionByHash(hash, timestampAfter);
    console.log(info);
})();
