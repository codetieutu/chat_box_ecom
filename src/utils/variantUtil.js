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
    const { product_id, description, variant_name, quantity = 0, price = 0 } = variant;
    const [res] = await db.execute(
        "INSERT INTO product_variants (product_id, description, variant_name, quantity, price) VALUES (?, ?, ?, ?, ?)",
        [product_id, description, variant_name, quantity, price]
    );

    return res.insertId;
}

/**
 * Cập nhật biến thể (dynamic fields update)
 */
export async function updateVariant(id, data) {
    const fields = [];
    const values = [];

    const allowed = ["variant_name", "description", "quantity", "price"];

    for (const key of Object.keys(data)) {
        if (allowed.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error("No valid fields to update");
    }

    values.push(id);

    const sql = `UPDATE product_variants SET ${fields.join(", ")} WHERE id = ?`;

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
