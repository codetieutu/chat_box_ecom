import { Markup } from "telegraf";
import { getProductByPage } from "../../utils/productUtil.js";

const showProducts = async (ctx, page, command = { dir: "", back: "" }) => {
    try {
        const { products, total } = await getProductByPage(page);
        // ==== Tạo text hiển thị ====
        let text = `📋 *PRODUCT LIST (Page ${page + 1}/${total}):*\n\n`;
        // products.forEach((p, i) => {
        //     if (p.type === "preorder")
        //         text += `${i + 1}. ${p.name} — ${p.price.toLocaleString()}$ (${p.type})\n`;
        //     else
        //         text += `${i + 1}. ${p.name} — ${p.price.toLocaleString()}$ (stock: ${p.quantity})\n`;
        // });

        // ==== Tạo nút chọn sản phẩm (5 cột / hàng) ====
        const buttonRows = [];
        for (let i = 0; i < products.length; i += 1) {
            const rowButtons = products.slice(i, i + 1).map((p, idx) =>
                Markup.button.callback(`${p.name}`, `${command.dir}${p.id}`)
            );
            buttonRows.push(rowButtons);
        }

        // ==== Điều hướng trang ====
        const navButtons = [];
        if (page > 0) navButtons.push(Markup.button.callback("⏮ Prev", `SHOW_USER_PRODUCTS_${page - 1}`));
        if (page < total - 1) navButtons.push(Markup.button.callback("⏭ Next", `SHOW_USER_PRODUCTS_${page + 1}`));
        navButtons.push(Markup.button.callback("↩️ Back", `${command.back}`));
        buttonRows.push(navButtons);

        // ==== Gửi hoặc cập nhật caption ====
        if (ctx.callbackQuery?.message?.photo) {
            await ctx.editMessageCaption(text, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: buttonRows },
            });
        } else {
            await ctx.editMessageText(text, {
                parse_mode: "Markdown",
                reply_markup: { inline_keyboard: buttonRows },
            });
        }
    } catch (err) {
        console.error("⚠️ showProducts error:", err);
    }
}

export default (bot) => {
    // Khi bấm nút "SẢN PHẨM"
    bot.action(/SHOW_USER_PRODUCTS_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const page = Number(ctx.match[1]);
        await showProducts(ctx, page, { dir: "USER_PRODUCT_", back: "SHOW_HOME" });
    });
    bot.action(/SHOW_ADMIN_PRODUCTS_(\d+)/, async (ctx) => {
        await ctx.answerCbQuery();
        const page = Number(ctx.match[1]);
        await showProducts(ctx, page, { dir: "ADMIN_PRODUCT_", back: "ADMIN_PRODUCTS" });
    });
};

export {
    showProducts
}
