import { Markup } from "telegraf";
import { getProductById } from "../../utils/productUtil.js";

export default (bot) => {
    bot.action(/USER_PRODUCT_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const productId = ctx.match[1];

        try {
            const product = await getProductById(productId);
            if (!product) {
                await ctx.reply("❌ Product not found.");
                return;
            }

            // Format message text
            let text = `🏷️ *${product.name}*\n`;
            text += `💰 *Price:* ${product.price}$\n`;
            text += `📦 *Type:* ${product.type}\n`;

            if (product.type === "available") {
                text += `📦 *Stock:* ${product.quantity}\n`;
            }

            text += `📝 *Description:*\n${product.description || "_No description available._"}`;

            // Inline buttons
            const keyboard = Markup.inlineKeyboard([

                [Markup.button.callback("🛒 Buy", `BUY_PRODUCT_${product.id}`)],
                [Markup.button.callback("↩️ Back", "SHOW_USER_PRODUCTS_0")],
            ]);

            await ctx.editMessageCaption(text, { parse_mode: "Markdown", ...keyboard });
        } catch (err) {
            console.error("⚠️ USER_PRODUCT error:", err);
            await ctx.reply("❌ Failed to load product details.");
        }
    });
};
