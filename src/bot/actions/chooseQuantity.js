import { Markup } from "telegraf";
import { getVariantById } from "../../utils/variantUtil.js";
import { getProductById } from "../../utils/productUtil.js";

export default (bot) => {

    // Mua 1 variant
    bot.action(/BUY_VARIANT_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();

        const variantId = Number(ctx.match[1]);
        const variant = await getVariantById(variantId);
        const product = await getProductById(variant.product_id);

        if (!variant) {
            await ctx.reply("❌ Variant not found.");
            return;
        }

        // Đảm bảo có session
        ctx.session = ctx.session || {};

        // Tạo state cho sản phẩm đang mua
        const state = {
            id: variant.id,
            productId: variant.product_id,
            name: `${product.name} - ${variant.variant_name}`,
            price: Number(variant.price) || 0,
            quantity: Number(variant.quantity) || 0, // stock
            type: variant.type || "available",
            description: variant.description,
            currenQuan: 1,                            // số lượng mặc định
            backAction: `USER_PRODUCT_${variant.product_id}` // callback quay lại màn product
        };

        // Lưu vào session
        ctx.session.product = state;

        await sendPremiumMessage(ctx, state);
    });

    // Hàm gửi / cập nhật message chọn số lượng
    async function sendPremiumMessage(ctx, state) {
        const totalPayment = state.currenQuan * state.price;

        const message = `
<b>🎯 PREMIUM APPLICATION SERVICE</b>

<b>📋 Order Confirmation:</b>
├ <b>Variant:</b> ${state.name}
├ <b>Price per item:</b> ${state.price.toLocaleString()} $
├ <b>Quantity:</b> ${state.currenQuan}
├ <b>Total Payment:</b> <b>${totalPayment.toLocaleString()} $</b>
├ <b>Available stock:</b> ${state.quantity} account
└ <b>Description:</b> ${state.description}
        `.trim();

        const keyboard = Markup.inlineKeyboard([
            // Hàng 1: giảm số lượng
            [
                Markup.button.callback('-50', 'qty:-50'),
                Markup.button.callback('-10', 'qty:-10'),
                Markup.button.callback('-5', 'qty:-5'),
                Markup.button.callback('-1', 'qty:-1')
            ],
            // Hàng 2: hiển thị số lượng
            [
                Markup.button.callback(`🔄 Quantity: ${state.currenQuan}`, 'display_quantity')
            ],
            // Hàng 3: tăng số lượng
            [
                Markup.button.callback('+1', 'qty:1'),
                Markup.button.callback('+5', 'qty:5'),
                Markup.button.callback('+10', 'qty:10'),
                Markup.button.callback('+50', 'qty:50')
            ],
            // Hàng 4: Thanh toán
            [
                Markup.button.callback('✅ Pay with Balance', `PAYMENT_${state.id}`),
            ],
            // Hàng 5: Back
            [
                Markup.button.callback('↩️ Back', state.backAction || 'SHOW_USER_PRODUCTS_0'),
            ]
        ]);

        if (!ctx.callbackQuery) {
            // Lần đầu: gửi message mới
            await ctx.reply(message, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup
            });
        } else {
            // Các lần update số lượng: sửa text của message hiện tại
            await ctx.editMessageCaption(message, {
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup
            });
        }
    }

    // Handler thay đổi số lượng
    bot.action(/^qty:/, async (ctx) => {
        await ctx.answerCbQuery();

        ctx.session = ctx.session || {};
        const product = ctx.session.product;

        if (!product) {
            await ctx.reply("⚠️ No product in session. Please select a product again.");
            return;
        }

        const action = ctx.callbackQuery.data; // ví dụ: "qty:-5"
        const amount = parseInt(action.split(':')[1], 10) || 0;

        // Cập nhật số lượng
        let newQuantity = product.currenQuan + amount;

        // Không cho số lượng < 1
        if (newQuantity < 1) {
            newQuantity = 1;
        }

        // Nếu là loại có stock (available) thì không vượt quá tồn kho
        if (product.type === "available" && product.quantity > 0) {
            if (newQuantity > product.quantity) {
                newQuantity = product.quantity;
            }
        }

        product.currenQuan = newQuantity;
        ctx.session.product = product;

        await sendPremiumMessage(ctx, product);
    });

    // Optional: bấm vào nút "Quantity" chỉ để refresh
    bot.action('display_quantity', async (ctx) => {
        await ctx.answerCbQuery();
        ctx.session = ctx.session || {};
        const product = ctx.session.product;
        if (product) {
            await sendPremiumMessage(ctx, product);
        }
    });
};
