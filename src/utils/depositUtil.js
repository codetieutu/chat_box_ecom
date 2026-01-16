import { db } from "./database.js";

const addTransaction = async (tx) => {
    const {
        tx_hash,
        from,
        to,
        amount,
        token,
        timestamp,
        network = "BNB Smart Chain",
    } = tx;

    try {
        // Kiểm tra xem giao dịch đã tồn tại chưa (theo tx_hash)
        const [rows] = await db.query(
            "SELECT * FROM transactions WHERE tx_hash = ?",
            [tx_hash]
        );

        if (rows.length > 0) {
            console.log(`⚠️ Giao dịch ${tx_hash} đã tồn tại.`);
            throw new Error("Giao dịch đã tồn tại");
        }

        // Nếu chưa có thì thêm mới
        await db.query(
            `INSERT INTO transactions 
       (tx_hash, from_address, to_address, amount, coin, time, network) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tx_hash, from, to, amount, token, timestamp, network]
        );

        console.log(`✅ Giao dịch ${tx_hash} đã được thêm vào database.`);
        return tx;
    } catch (error) {
        console.error("❌ Lỗi trong addTransaction:", error);
        throw error;
    }
};

export {
    addTransaction,
}
