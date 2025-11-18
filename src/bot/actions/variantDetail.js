import { Markup } from "telegraf";
import { getProductById } from "../../utils/productUtil.js";
import { getVariantById } from "../../utils/variantUtil.js";

export default (bot) => {
    // Xem chi tiết 1 variant
    bot.action(/USER_VARIANT_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const variantId = ctx.match[1];

        try {
            const variant = await getVariantById(variantId);
            if (!variant) {
                await ctx.reply("❌ Variant not found.");
                return;
            }

            const product = await getProductById(variant.product_id);
            if (!product) {
                await ctx.reply("❌ Product not found.");
                return;
            }

            // Format nội dung hiển thị
            let text = `🏷️ *${product.name}*\n`;
            text += `🔖 _${variant.variant_name}_\n\n`;
            text += `💰 *Price:* ${Number(variant.price).toLocaleString()}$\n`;
            text += `📦 *Type:* ${product.type}\n`;
            text += `📊 *Stock:* ${variant.quantity}\n`;
            text += `\n📝 *Description:*\n${variant.description || "_No description available._"}`;

            // Inline buttons: Buy + Back
            const keyboard = Markup.inlineKeyboard([
                [
                    Markup.button.callback(
                        "🛒 Buy this variant",
                        `BUY_VARIANT_${variant.id}` // callback cho bước mua
                    )
                ],
                [
                    Markup.button.callback(
                        "↩️ Back",
                        `USER_PRODUCT_${product.id}` // quay lại màn product (list variants)
                    )
                ]
            ]);

            // Nếu message gốc là ảnh + caption → dùng editMessageCaption
            await ctx.editMessageCaption(text, {
                parse_mode: "Markdown",
                ...keyboard
            });

            // Nếu message gốc là text thuần thì dùng cái này thay cho dòng trên:
            // await ctx.editMessageText(text, { parse_mode: "Markdown", ...keyboard });

        } catch (err) {
            console.error("⚠️ USER_VARIANT error:", err);
            await ctx.reply("❌ Failed to load variant details.");
        }
    });
};
