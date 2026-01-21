import { getUserById, updateUser, addAdmin } from "../../utils/userUtil.js";
import { ADMIN_PASSWORD } from "../../utils/env.js";
import { adminMenu } from "../commands/admin.js";
import { Markup } from "telegraf";
import { getProductByQuantity } from "../../utils/stockUtil.js";
import { exportProductsToTxt } from "../export.js";
import { showMenu } from "../commands/start.js";
import { createOrder } from "../../utils/orderUtil.js";
import { notifyAdmin } from "../sendMess.js";
import { getTransactionByHash } from "../../utils/payment2.js";
import { addTransaction } from "../../utils/depositUtil.js";


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
    console.log("check product ", product);
    // user_id, product_id, variant_id, quantity, unit_price, total_amount, status, note, receiver_name, product_name, seller_note 
    const order = {
        user_id: ctx.from.id,
        product_id: product.productId,
        variant_id: product.id,
        quantity: quantity,
        unit_price: product.price,
        total_amount: parseFloat(quantity) * parseFloat(product.price),
        status: 'pending',
        note: content,
        receiver_name: user.username || "NoName",
        product_name: product.name,
        unit_price: product.price,
        seller_note: ""
    }
    try {
        createOrder(order);
        await notifyAdmin(
            `🛒 *NEW ORDER*
━━━━━━━━━━━━━━
👤 Customer: ${order.receiver_name}
📦 Product: ${order.product_name}
🔢 Quantity: ${order.quantity}
💰 Total: ${order.total_amount.toLocaleString()} 
━━━━━━━━━━━━━━
⏳ *Status:* Pending`
        );

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


const inputTxId = async (ctx) => {
    try {
        const txid = ctx.message.text.trim();
        const time = ctx.session.time;
        const transaction = await getTransactionByHash(txid, time);
        if (!transaction.status) {
            ctx.reply("Transaction not found, Please re-enter.");
            return;
        }
        transaction.tx_hash = txid;
        await addTransaction(transaction);
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

    } catch (error) {
        ctx.reply("Transaction have error, Please re-enter.");
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
