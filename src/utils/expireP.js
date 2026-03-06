import { DB_DB, DB_HOST, DB_PASSWORD, DB_USER } from "./env.js";
import mysql from "mysql2/promise";
import { deleteStocks, updateVariantId } from "./stockUtil.js";

export const db = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DB,
});

const getProductAll = async () => {
    const query = `SELECT id, type FROM products`;
    try {
        const [rows] = await db.query(query);
        return rows;

    } catch (error) {
        throw error;
    }
}

const getVariantByProductId = async (productId) => {
    const query = "select id, min, max from product_variants where product_id = ?";
    try {
        const [rows] = await db.query(query, [productId]);
        return rows;
    } catch (error) {
        throw error;
    }
}

const getStocksByVariantId = async (variantId) => {
    const query = "select * from stocks where product_id = ? and is_sold = false;";
    try {
        const [rows] = await db.query(query, [variantId]);
        return rows;
    } catch (error) {
        console.log(error);
    }
}

const checkTimeLeft = async (variants) => {
    const now = new Date();

    for (let i = 0; i < variants.length; i++) {
        const currentVariant = variants[i];
        const stocks = await getStocksByVariantId(currentVariant.id);
        const moveDownStockIds = [];
        const deleteStockIds = [];

        for (const stock of stocks) {


            const expireTime = new Date(stock.expireAt);
            const timeDiff = expireTime - now;
            const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            if (daysLeft < currentVariant.min) {
                if (i < variants.length - 1) {
                    moveDownStockIds.push(stock.id);
                } else {
                    deleteStockIds.push(stock.id);
                }
            }
        }
        if (moveDownStockIds.length > 0) {
            const lowerVariantId = variants[i + 1].id;
            await updateVariantId(moveDownStockIds, lowerVariantId, variants[i].id);
        }

        if (deleteStockIds.length > 0) {
            await deleteStocks(deleteStockIds, variants[i].id);
        }
    }
};
const autoUpdate = async () => {
    try {
        const products = await getProductAll();
        for (const product of products) {
            if (product.type === "available") {
                const variants = await getVariantByProductId(product.id);
                variants.sort((a, b) => b.max - a.max)

                checkTimeLeft(variants);
            }
        }
        console.log("done");


    } catch (error) {
        console.error("❌ Error in main function:", error);
    }
}

// autoUpdate();

export default autoUpdate;