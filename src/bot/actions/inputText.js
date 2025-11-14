import { getUserById, updateUser, addAdmin } from "../../utils/userUtil.js";
import { showUserDetail } from "./admin/UserAction.js";
import { ADMIN_PASSWORD } from "../../utils/env.js";
import { adminMenu } from "../commands/admin.js";
import { Markup } from "telegraf";
import { addProduct, updateProduct } from "../../utils/productUtil.js";
import { showAdminProduct } from "./admin/detailProduct.js";
import { getProductByQuantity } from "../../utils/stockUtil.js";
import { exportProductsToTxt } from "../export.js";
import { showMenu } from "../commands/start.js";
import { addOrder, completeOrder, getOrderById } from "../../utils/orderUtil.js";
import { notifyAdmin, notifyUser } from "../sendMess.js";
import { showOrders } from "./admin/showOrder.js";
import { checkout } from "../../utils/payment.js";
import { getTransactionByHash } from "../../utils/payment2.js";
import { addTransaction } from "../../utils/depositUtil.js";


const inputDeposit = async (ctx) => {
    const amount = parseFloat(ctx.message.text);
    if (isNaN(amount) || amount <= 0) {
        await ctx.reply("❌ Invalid amount, re-enter:");
        return;
    }
    const userId = ctx.session.depositTarget;
    try {
        const user = await getUserById(userId);
        if (user) {
            const balance = parseFloat(user.balance) + amount
            await updateUser(userId, { balance });
            await ctx.reply(`💰 Deposited  ${amount}$ to user: ${user.username}`);
            ctx.session.step = null;
            ctx.session.depositTarget = null;
            await showUserDetail(ctx, userId, false);
        }
    } catch (error) {
        throw error;
    }

}

const inputQuantity = async (ctx) => {
    const quantity = parseInt(ctx.message.text);
    const userId = ctx.from.id;
    const user = await getUserById(userId);

    const product = ctx.session.selectedProduct;
    if (isNaN(quantity) || quantity <= 0) {
        await ctx.reply("❌ Invalid quantity, please re-enter:");
        return;
    }
    if (quantity > product.quantity && product.type === "available") {
        await ctx.reply("❌ Quantity too large, please re-enter:");
        return;
    }
    if (quantity * parseFloat(product.price) > parseFloat(user.balance)) {
        await ctx.reply("❌ Insufficient funds, please deposit.");
        return;
    }
    if (product.type === "preorder") {
        ctx.session.step = "wait_attach_content";
        ctx.session.quantity = quantity;
        await ctx.reply("💰 Enter the attached content:", {
            parse_mode: "Markdown",
        });
        return;
    }
    const products = await getProductByQuantity(product.id, quantity);
    await exportProductsToTxt(ctx, products);
    const userNew = await updateUser(userId, { balance: parseFloat(user.balance) - quantity * parseFloat(product.price), transaction: parseInt(user.transaction) + quantity });
    ctx.session.selectedProduct = null;
    ctx.session.step = null
    showMenu(ctx, userNew);

}

const inputContent = async (ctx) => {
    const content = ctx.message.text.trim()
    const quantity = ctx.session.quantity;
    const product = ctx.session.product;
    const user = await getUserById(ctx.from.id);
    const order = {
        userId: ctx.from.id,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        note: content,
        totalPrice: parseFloat(quantity) * parseFloat(product.price)
    }
    try {
        await addOrder(order);
        await notifyAdmin(`new order ${product.name}:${quantity}`)
        const userNew = await updateUser(ctx.from.id, { balance: parseFloat(user.balance) - quantity * parseFloat(product.price), transaction: parseInt(user.transaction) + quantity });
        await ctx.reply("Your order is being processed. Please wait.");
        ctx.session.selectedProduct = null;
        ctx.session.step = null
        ctx.session.quantity = null;
        showMenu(ctx, userNew);
    } catch (error) {
        console.error(error);
        ctx.reply("❌ Error while placing order. Please try again. ")
    }

}

const inputPassword = async (ctx) => {
    const password = ctx.message.text.trim();
    if (password === ADMIN_PASSWORD) {
        await addAdmin(ctx.from.id);
        await ctx.reply("✅ Login success!", adminMenu());
    } else {
        await ctx.reply("❌ Wrong password, Please try again:");
        return;
    }
    ctx.session.step = null;
}

const inputCompletedMess = async (ctx) => {
    const content = ctx.message.text.trim();
    const orderId = ctx.session.OrderId;

    try {
        const order = await getOrderById(orderId);
        if (!order) {
            await ctx.reply("❌ Order not found.");
            ctx.session.step = null;
            ctx.session.targetOrderId = null;
            return;
        }

        // Cập nhật trạng thái đơn hàng → completed
        await completeOrder(orderId);

        // 📩 Gửi thông báo đến người mua
        const message = `
✅ *Your Order Has Been Completed!*
────────────────────
💬 *Message from Seller:*
${content}
`;

        await notifyUser(order.user_id, message);

        // Thông báo lại cho admin
        await ctx.reply(
            `✅ Order #${orderId} has been marked as *Completed* and message sent to buyer.`,
            { parse_mode: "Markdown" }
        );
    } catch (err) {
        console.error("❌ completeOrder error:", err);
        await ctx.reply("⚠️ Failed to complete the order.");
    }

    // Reset session
    ctx.session.step = null;
    ctx.session.OrderId = null;
    showOrders(ctx, 0, false)
}

const inputTxId = async (ctx) => {
    const txid = ctx.message.text.trim();
    const time = ctx.session.time;
    const transaction = await getTransactionByHash(txid, time);
    if (!transaction.status) {
        ctx.reply("Transaction not found, Please re-enter.");
        return;
    }
    transaction.tx_hash = txid;
    const amount = parseFloat(transaction.amount);
    const user = await getUserById(ctx.from.id);
    if (!user) {
        ctx.reply("error");
    }

    const newUser = await updateUser(user.id, { balance: parseFloat(user.balance) + parseFloat(amount) });

    await ctx.reply(
        `✅ *Deposit Successful!*\n\n💰 *Amount:* ${amount}$\n💼 *New Balance:* ${newUser.balance}$`,
        {
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("↩️ Back to Home", "SHOW_HOME_MEDIA")],
            ]),
        }
    );
    const message = `📢 *New Deposit Received!*\n\n👤 User: @${user.username}\n💰 Amount: ${amount} $`;

    await notifyAdmin(message);
    try {
        await addTransaction(transaction);
    } catch (error) {
        console.error(">>check err", error);
    }

    ctx.session.time = null
    ctx.session.step = null;
}

export default (bot) => {
    bot.on("text", async (ctx) => {
        ctx.session = ctx.session || {};

        const step = ctx.session.step;

        switch (step) {
            // === Nhập mật khẩu admin ===
            case "waiting_password": {
                inputPassword(ctx);
                break;
            }

            case "waiting_txid": {
                inputTxId(ctx);
                break;
            }

            case "waiting_complete_message": {
                inputCompletedMess(ctx);
                break;
            }

            case "wait_quantity": {
                inputQuantity(ctx);
                break;
            }

            case "wait_attach_content": {
                inputContent(ctx);
                break;
            }

            case "editing_field": {
                const productId = ctx.session.targetProduct;
                const field = ctx.session.field;
                const value = ctx.message.text.trim();

                if (!productId || !field) {
                    await ctx.reply("⚠️ Editing session not found. Please select a product again.");
                    ctx.session.step = null;
                    return;
                }

                // Validate price
                if (field === "price") {
                    const num = parseFloat(value.replace(/,/g, ""));
                    if (isNaN(num) || num <= 0) {
                        await ctx.reply("❌ Invalid price. Please enter a valid number:");
                        return;
                    }
                    await updateProduct(productId, { [field]: num });
                } else {
                    await updateProduct(productId, { [field]: value });
                }
                showAdminProduct(ctx, productId, true);

                // Reset session
                ctx.session.step = null;
                ctx.session.field = null;
                ctx.session.targetProduct = null;
                break;
            }

            // === Nhập số tiền nạp ===
            case "waiting_deposit": {
                inputDeposit(ctx);
                break;
            }

            case "add_product_name": {
                ctx.session.newProduct.name = ctx.message.text.trim();
                ctx.session.step = "add_product_price";

                await ctx.reply("💰 Enter the *product price* (numbers only):", {
                    parse_mode: "Markdown",
                });
                break;
            }

            case "add_product_price": {
                const price = parseFloat(ctx.message.text.replace(/,/g, ""));
                if (isNaN(price) || price <= 0) {
                    await ctx.reply("❌ Invalid price. Please enter a valid number:");
                    return;
                }

                ctx.session.newProduct.price = price;
                ctx.session.step = "add_product_type";

                await ctx.reply(
                    "📦 Choose the *product type*: ",
                    Markup.inlineKeyboard([
                        [Markup.button.callback("✅ Available", "PRODUCT_TYPE_available")],
                        [Markup.button.callback("🕒 Preorder", "PRODUCT_TYPE_preorder")],
                    ])
                );
                break;
            }

            case "add_product_description": {
                ctx.session.newProduct.description = ctx.message.text.trim();

                const p = ctx.session.newProduct;
                try {
                    await addProduct(p);
                    await ctx.reply(
                        `✅ Product added successfully:\n\n🏷️ *${p.name}*\n💰 ${p.price}$\n📦 ${p.type}\n📝 ${p.description}`,
                        { parse_mode: "Markdown" }
                    );
                    await ctx.reply("🏠 *Menu Admin*", adminMenu());
                } catch (error) {
                    console.error("Add product error:", error);
                    await ctx.reply("❌ Failed to save product. Please try again later.");
                }
                ctx.session.step = null;
                ctx.session.newProduct = null;
                break;
            }

            // === Trạng thái mặc định (không có step nào đang chờ) ===
            default: {
                await ctx.reply("🤖 Bạn vừa gửi tin nhắn văn bản, nhưng hiện bot không chờ nhập liệu nào.");
                break;
            }
        }
    });
}
