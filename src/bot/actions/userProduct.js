import { Markup } from "telegraf";
import { getProductById } from "../../utils/productUtil.js";
import { getVariantsByProduct } from "../../utils/variantUtil.js";

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

            // Lấy danh sách variants của product
            const variants = await getVariantsByProduct(productId);

            // Tính giá min - max từ variants
            let priceText = "N/A";
            if (variants.length > 0) {
                const prices = variants
                    .map(v => Number(v.price))
                    .filter(p => !Number.isNaN(p));

                if (prices.length > 0) {
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);

                    if (minPrice === maxPrice) {
                        priceText = `${minPrice.toLocaleString()}$`;
                    } else {
                        priceText = `${minPrice.toLocaleString()}$ - ${maxPrice.toLocaleString()}$`;
                    }
                }
            }

            // Format message text
            let text = `🏷️ *${product.name}*\n`;
            text += `📦 *Type:* ${product.type}\n`;
            // Tạo các nút variant
            const variantButtons = [];

            variants.forEach(v => {
                const label = `${v.variant_name} - ${Number(v.price).toLocaleString()}$ (x${v.quantity}) `;
                // callback này tuỳ bạn, mình đặt là USER_VARIANT_<id> để sau này handle chi tiết biến thể
                variantButtons.push(
                    Markup.button.callback(label, `BUY_VARIANT_${v.id}`)
                );
            });

            // Chia nút variant thành từng hàng 1–2 nút
            const rows = [];
            for (let i = 0; i < variantButtons.length; i += 1) {
                rows.push(variantButtons.slice(i, i + 1));
            }

            // Thêm nút Back
            rows.push([Markup.button.callback("↩️ Back", "SHOW_USER_PRODUCTS_0")]);

            const keyboard = Markup.inlineKeyboard(rows);

            // Nếu message gốc là text: dùng editMessageText
            await ctx.editMessageCaption(text, {
                parse_mode: "Markdown",
                ...keyboard
            });

            // Nếu message gốc là photo+caption thì thay bằng editMessageCaption:
            // await ctx.editMessageCaption(text, { parse_mode: "Markdown", ...keyboard });

        } catch (err) {
            console.error("⚠️ USER_PRODUCT error:", err);
            await ctx.reply("❌ Failed to load product details.");
        }
    });
};
