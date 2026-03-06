import { db } from "./database.js";


// Thêm item mới vào stock
const addStock = async (productId, info, expireAt) => {


    const [result] = await db.query(
        "INSERT INTO stocks (product_id, info, expireAt) VALUES (?, ?, ?)",
        [productId, info, expireAt]
    );

    // Tăng số lượng trong bảng products
    await db.query("UPDATE product_variants SET quantity = quantity + 1 WHERE id = ?", [productId]);

    return { id: result.insertId, productId, info };
};

// Lấy toàn bộ stock của 1 sản phẩm
const getStocksByProduct = async (productId) => {
    const [rows] = await db.query("SELECT * FROM stocks WHERE product_id = ?", [productId]);
    return rows;
};

// Đánh dấu stock là đã bán
const markStockAsSold = async (stockId) => {
    await db.query("UPDATE stocks SET is_sold = 1 WHERE id = ?", [stockId]);
};

// Xoá stock
const deleteStock = async (stockId) => {
    await db.query("DELETE FROM stocks WHERE id = ?", [stockId]);
};

const deleteStocks = async (stockIds, oldId) => {
    const placeholders = stockIds.map(() => '?').join(',');
    await db.query(`DELETE FROM stocks WHERE id IN (${placeholders})`, stockIds);
    await db.query("update product_variants set quantity = GREATEST(quantity - ?, 0) where id = ?", [stockIds.length, oldId]);
}

export const getProductByQuantity = async (variantId, quantity) => {
    try {

        const [rows] = await db.query(
            "SELECT id, info FROM stocks WHERE product_id = ? AND is_sold = false LIMIT ?",
            [variantId, quantity]
        );
        const selectedCount = rows.length;
        if (selectedCount === 0) {
            return [];
        }

        const stockIds = rows.map(r => r.id);

        await db.query(
            "UPDATE product_variants SET quantity = GREATEST(quantity - ?, 0) WHERE id = ?",
            [selectedCount, variantId]
        );

        const placeholders = stockIds.map(() => "?").join(",");
        await db.query(
            `UPDATE stocks SET is_sold = true WHERE id IN (${placeholders})`,
            stockIds
        );

        return rows;
    } catch (error) {
        console.error("⚠️ getProductByQuantity error:", error);
        throw error;
    }
};

const updateVariantId = async (stockIds, variantId, oldVariantId) => {
    const placeholders = stockIds.map(() => '?').join(',');

    await db.query(
        `UPDATE stocks 
         SET product_id = ? 
         WHERE id IN (${placeholders})`,
        [variantId, ...stockIds]
    );
    await db.query(
        `UPDATE product_variants 
         SET quantity = quantity + ?
         WHERE id = ?`,
        [stockIds.length, variantId]
    );
    await db.query(
        `UPDATE product_variants 
         SET quantity = GREATEST(quantity - ?, 0)
         WHERE id = ?`,
        [stockIds.length, oldVariantId]
    );
};

export {
    addStock,
    getStocksByProduct,
    markStockAsSold,
    deleteStock,
    deleteStocks,
    updateVariantId
}