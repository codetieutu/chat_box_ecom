// orderUtil.js
import { db } from "./database.js";

/**
 * Lấy tất cả đơn hàng
 * @returns {Promise<Array>}
 */
export async function getAllOrders() {
    const [rows] = await db.execute(
        `SELECT 
        id,
        user_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        total_amount,
        status,
        note,
        receiver_name,
        product_name,
        created_at,
        updated_at
     FROM orders
     ORDER BY created_at DESC`
    );
    return rows;
}

/**
 * Lấy 1 đơn hàng theo id
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getOrderById(id) {
    const [rows] = await db.execute(
        `SELECT 
        id,
        user_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        total_amount,
        status,
        note,
        receiver_name,
        product_name,
        created_at,
        updated_at
     FROM orders
     WHERE id = ?`,
        [id]
    );
    return rows.length ? rows[0] : null;
}

export async function getRecentOrder() {
    try {
        const [rows] = await db.execute(`SELECT *
                                   FROM orders
                                   WHERE status = 'success'
                                   ORDER BY created_at DESC
                                   LIMIT 5;
                                   `);
        if (rows.length === 0) {
            throw new Error("no record ");
        }
        return rows;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Lấy tất cả đơn hàng của 1 user
 * @param {string} userId
 * @returns {Promise<Array>}
 */
export async function getOrdersByUserId(userId) {
    const [rows] = await db.execute(
        `SELECT 
        id,
        user_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        total_amount,
        status,
        note,
        receiver_name,
        product_name,
        created_at,
        updated_at
     FROM orders
     WHERE user_id = ?
     ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
}
export async function getTotalOrderPending() {
    try {
        const [rows] = await db.execute(
            "SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'"
        );
        if (rows.length === 0) {
            throw Error("error rows.length === 0");
        }
        return rows[0].total;
    } catch (error) {
        console.log(">>check error", error);
        throw error;
    }
}

export async function getMonthRevenue(month, year) {
    try {
        const [rows] = await db.execute(
            `
    SELECT IFNULL(SUM(total_amount), 0) AS total_revenue
    FROM orders
    WHERE status = 'success'
      AND MONTH(created_at) = ?
      AND YEAR(created_at)  = ?
    `,
            [month, year]
        );

        return rows[0].total_revenue;
    } catch (error) {
        console.log(error);
        throw error;
    }

}

/**
 * Tạo đơn hàng mới
 * @param {{
 *  user_id?: string|null,
 *  product_id: number,
 *  variant_id?: number|null,
 *  quantity?: number,
 *  unit_price: number,
 *  note?: string|null,
 *  receiver_name?: string|null,
 *  product_name?: string|null
 * }} order
 * @returns {Promise<number>} id của đơn hàng vừa tạo
 */
export async function createOrder(order) {
    const {
        user_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        total_amount,
        status,
        note,
        receiver_name,
        product_name,
        seller_note

    } = order;

    const [result] = await db.execute(
        `INSERT INTO orders (
        user_id,
        product_id,
        variant_id,
        quantity,
        unit_price,
        total_amount,
        status,
        note,
        receiver_name,
        product_name,
        seller_note,
        created_at,
        updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
            user_id,
            product_id,
            variant_id,
            quantity,
            unit_price,
            total_amount,
            status,
            note,
            receiver_name,
            product_name,
            seller_note,
        ]
    );

    return result.insertId;
}

/**
 * Cập nhật đơn hàng (update từng trường)
 *
 * data có thể chứa bất kỳ field nào trong số:
 * user_id, product_id, variant_id, quantity, unit_price,
 * total_amount, status, note, receiver_name, product_name
 *
 * Nếu quantity hoặc unit_price thay đổi mà bạn KHÔNG truyền total_amount,
 * hàm sẽ tự tính lại total_amount = quantity * unit_price.
 *
 * @param {number} id
 * @param {Object} data
 * @returns {Promise<boolean>} true nếu update thành công
 */
export async function updateOrder(id, data) {
    // Nếu có thay đổi quantity hoặc unit_price → tự tính lại total_amount nếu chưa truyền
    if (
        ("quantity" in data || "unit_price" in data) &&
        !("total_amount" in data)
    ) {
        const existing = await getOrderById(id);
        if (!existing) {
            throw new Error("Order not found");
        }

        const quantity = data.quantity ?? existing.quantity;
        const unit_price = data.unit_price ?? existing.unit_price;

        data.total_amount = quantity * unit_price;
    }

    const allowedFields = [
        "user_id",
        "product_id",
        "variant_id",
        "quantity",
        "unit_price",
        "total_amount",
        "status",
        "note",
        "receiver_name",
        "product_name",
        "seller_note"
    ];

    const fields = [];
    const values = [];

    for (const key of Object.keys(data)) {
        if (allowedFields.includes(key)) {
            fields.push(`${key} = ?`);
            values.push(data[key]);
        }
    }

    if (fields.length === 0) {
        throw new Error("No valid fields to update");
    }

    values.push(id);

    const sql = `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`;

    const [result] = await db.execute(sql, values);
    return result.affectedRows > 0;
}

/**
 * Cập nhật trạng thái đơn hàng
 * @param {number} id
 * @param {'pending'|'success'|'failed'} status
 * @returns {Promise<boolean>}
 */
export async function updateOrderStatus(id, status) {
    const [result] = await db.execute(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, id]
    );
    return result.affectedRows > 0;
}

/**
 * Xoá đơn hàng
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function deleteOrder(id) {
    const [result] = await db.execute("DELETE FROM orders WHERE id = ?", [id]);
    return result.affectedRows > 0;
}

export async function getTotalTransaction() {
    try {
        const [rows] = await db.execute(`
        SELECT COUNT(*) AS total_orders
        FROM orders
    `);
        return rows[0].total_orders;
    } catch (error) {
        console.error(">>check error", error);
        throw error;
    }

}