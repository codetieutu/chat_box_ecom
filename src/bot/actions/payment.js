import { getProductByQuantity } from "../../utils/stockUtil.js";
import { getUserById, updateUser } from "../../utils/userUtil.js";
import { showMenu } from "../commands/start.js";
import { exportProductsToTxt } from "../export.js";
import { createOrder, updateOrderStatus } from "../../utils/orderUtil.js";
import { getProductById } from '../../utils/productUtil.js'
import { notifyAdmin } from "../sendMess.js"; // chỉnh đường dẫn nếu khác

export default (bot) => {
    bot.action(/PAYMENT_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();

        const variantId = Number(ctx.match[1]);

        ctx.session = ctx.session || {};
        const variant = ctx.session.product;
        const product = ctx.session.product;
        const userId = ctx.from.id;
        const user = await getUserById(ctx.from.id);
        if (!user) {
            await ctx.reply("⚠️ User not found in system.");
            return;
        }

        const quantity = Number(variant.currenQuan) || 1;
        const unitPrice = Number(variant.price) || 0;
        const totalPayment = quantity * unitPrice;

        // Kiểm tra số dư
        if (Number(user.balance) < totalPayment) {
            await ctx.reply("❌ Insufficient balance, please deposit.");
            return;
        }

        // Nếu là preorder → chuyển sang bước nhập nội dung, chưa xử lý kho
        if (product.type === "preorder") {
            ctx.session.step = "wait_attach_content";
            ctx.session.quantity = quantity;

            await ctx.reply("💰 Enter the attached content:", {
                parse_mode: "Markdown",
            });

            return;
        }

        // Lấy stock từ kho theo variant (và đồng thời cập nhật is_sold + giảm quantity trong product_variants)
        const stocks = await getProductByQuantity(variantId, quantity);

        if (!stocks || stocks.length === 0) {
            await ctx.reply("⚠️ Not enough stock available for this variant.");
            return;
        }

        // Nếu kho không đủ theo quantity user chọn
        if (stocks.length < quantity) {
            await ctx.reply(`⚠️ Only ${stocks.length} account(s) available, please select a smaller quantity.`);
            return;
        }

        // Xuất file TXT gửi cho user (stocks là list account/key)
        await exportProductsToTxt(ctx, stocks);

        // Trừ tiền user + tăng số lần giao dịch
        const newBalance = Number(user.balance) - totalPayment;
        const newTransactionCount = Number(user.transaction || 0) + quantity;

        const userNew = await updateUser(userId, {
            balance: newBalance,
            transaction: newTransactionCount
        });

        // Lưu order với trạng thái success
        const order = {
            user_id: ctx.from.id,
            product_id: product.productId,
            variant_id: product.id,
            quantity: quantity,
            unit_price: product.price,
            total_amount: parseFloat(quantity) * parseFloat(product.price),
            status: 'pending',
            note: "Auto delivery via Telegram bot.",
            receiver_name: user.username || "NoName",
            product_name: product.name,
            unit_price: product.price,
            seller_note: ""
        }
        const orderId = await createOrder(order);

        // Cập nhật status = success (createOrder mặc định pending)
        await updateOrderStatus(orderId, "success");

        // Thông báo cho admin
        const adminMsg = `
📦 New successful order

🛒 Product: ${product.name}
🎫 Variant: ${variant.name} (ID: ${product.id})

👤 User: ${user.username || ctx.from.username || `tg_${userId}`} (ID: ${userId})
🧾 Order ID: ${orderId}
📊 Quantity: ${quantity}
💰 Total: ${totalPayment.toLocaleString()} $
`.trim();


        await notifyAdmin(adminMsg);

        // Reset session
        ctx.session.selectedProduct = null;
        ctx.session.step = null;
        ctx.session.product = null;

        // Gửi lại menu chính
        await showMenu(ctx, userNew);
    });
};
