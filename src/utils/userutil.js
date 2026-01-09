import { db } from "./database.js";

// Lấy toàn bộ user
const getUserAll = async () => {
    try {
        const [rows] = await db.query("SELECT * FROM users");
        if (rows.length > 0) {
            const results = rows.map(row => {
                return {
                    ...row,
                    fullName: `${row.first_name || ''} ${row.last_name || ''}`.trim()
                }
            })
            return results;
        }
        return [];
    } catch (error) {
        console.error("❌ Lỗi khi lấy danh sách user:", error);
        throw error;
    }
};

const getUsersByPage = async (page = 0, limmit = 10) => {
    try {
        const [rows] = await db.query("SELECT id, username, balance, transaction FROM users ORDER BY id ASC LIMIT ? OFFSET ?", [limmit, page * limmit]);
        const [[{ total }]] = await db.query("SELECT COUNT(*) AS total FROM users");
        const totalPages = Math.ceil(total / limmit);
        return {
            users: rows,
            page: page + 1,
            totalPages,
            totalUsers: total
        };
    } catch (error) {
        console.error(error);
        return []
    }
}

// Lấy user theo ID
const getUserById = async (id) => {
    try {
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        if (rows.length > 0) {
            return {
                ...rows[0],
                fullName: `${rows[0].first_name || ''} ${rows[0].last_name || ''}`.trim()
            }
        }
    } catch (error) {
        console.error("❌ Lỗi khi lấy user theo ID:", error);
        throw error;
    }
};

const getUserByUsername = async (searchTerm) => {
    try {
        searchTerm = searchTerm.startsWith("@") ? searchTerm.slice(1) : searchTerm
        const [rows] = await db.query(
            "SELECT * FROM users WHERE username LIKE ? or id = ?",
            [`%${searchTerm}%`, searchTerm]
        );
        return rows;
    } catch (error) {
        console.error("❌ Lỗi khi tìm kiếm users:", error);
        throw error;
    }
};

// Thêm user nếu chưa có
const addUser = async (user) => {
    const {
        id,
        is_bot,
        first_name,
        last_name,
        username,
        language_code,
        balance = 0,
        is_block = false,
        transaction = 0,
    } = user;

    try {
        // Kiểm tra tồn tại
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);

        if (rows.length > 0) {
            // Nếu đã có thì trả về user cũ
            return rows[0];
        }

        // Nếu chưa có thì thêm mới
        await db.query(
            `INSERT INTO users
      (id, is_bot, first_name, last_name, username, language_code, balance, is_block, transaction)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                is_bot,
                first_name,
                last_name,
                username,
                language_code,
                balance,
                is_block,
                transaction,
            ]
        );

        console.log(`✅ User ${username || first_name} đã được thêm.`);
        return user;
    } catch (error) {
        console.error("❌ Lỗi trong addUser:", error);
        throw error;
    }
};

const updateUser = async (id, fields = {}) => {
    try {
        // Tạo mảng key-value động
        const keys = Object.keys(fields);
        const values = Object.values(fields);

        if (keys.length === 0) throw new Error("No fields to update");

        const setClause = keys.map((key) => `${key} = ?`).join(", ");
        const sql = `UPDATE users SET ${setClause} WHERE id = ?`;
        await db.query(sql, [...values, id]);
        const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
        return rows[0] || null;

    } catch (error) {
        console.error("❌ Error updating user:", error);
        throw error;
    }
};

const isAdmin = async (id) => {
    try {
        const [rows] = await db.query("SELECT is_admin FROM users WHERE id = ?", [id]);

        if (rows.length === 0) return false;
        const user = rows[0];
        return Boolean(user.is_admin);
    } catch (error) {
        console.error("❌ Lỗi khi lấy user theo ID:", error);
        throw error;
    }
}

const addAdmin = async (id) => {
    try {
        const [rows] = await db.query("UPDATE users SET is_admin = 1 WHERE id = ?", [id]);
        return rows.length > 0 ? rows[0] : null;
    } catch (error) {
        console.error("❌ Lỗi khi lấy user theo ID:", error);
        throw error;
    }
}

const getIdAdmin = async () => {
    try {
        const [rows] = await db.query("SELECT id FROM users WHERE is_admin = true");
        return rows;
    } catch (error) {
        console.error("❌ err when get id of admin: ", error);
        throw error;
    }
}

const getTotalUser = async () => {
    try {
        const [rows] = await db.execute(
            "SELECT COUNT(*) AS total FROM users"
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

export {
    updateUser,
    getUserAll,
    getUserById,
    getUserByUsername,
    getUsersByPage,
    addUser,
    isAdmin,
    addAdmin,
    getIdAdmin,
    getTotalUser
}

