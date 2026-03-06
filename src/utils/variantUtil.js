// variantUtil.js
import { db } from "./database.js";

/**
 * Lấy tất cả biến thể theo product_id
 */
export async function getVariantsByProduct(productId) {
    const [rows] = await db.execute(
        "SELECT * FROM product_variants WHERE product_id = ? ORDER BY id DESC",
        [productId]
    );
    return rows;
}

/**
 * Lấy chi tiết 1 biến thể
 */
export async function getVariantById(id) {
    const [rows] = await db.execute(
        "SELECT * FROM product_variants WHERE id = ?",
        [id]
    );
    return rows.length ? rows[0] : null;
}

/**
 * Tạo biến thể mới
 */
export async function createVariant(variant) {
    const { product_id, description, variant_name, quantity = 0, price = 0, min, max } = variant;
    if (!min || !max) throw new Error("Min and max values are required for a variant");
    const [res] = await db.execute(
        "INSERT INTO product_variants (product_id, description, variant_name, quantity, price, min, max) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [product_id, description, variant_name, quantity, price, min, max]
    );

    return res.insertId;
}

/**
 * Cập nhật biến thể (dynamic fields update)
 */
export async function updateVariant(variant) {

    const { id, ...data } = variant;

    const sql = `UPDATE product_variants SET 
                variant_name = ?,
                description = ?,
                price = ?,
                min = ?,
                max = ?
                WHERE id = ?`;

    const values = [
        data.variant_name || null,
        data.description || null,
        data.price || 0,
        data.min || null,
        data.max || null,
        id
    ];
    const [result] = await db.execute(sql, values);
    return result.affectedRows > 0;
}

/**
 * Xoá biến thể
 */
export async function deleteVariant(id) {
    const [result] = await db.execute(
        "DELETE FROM product_variants WHERE id = ?",
        [id]
    );
    return result.affectedRows > 0;
}
