import { getAllProducts } from "../../utils/productUtil.js";
import { getVariantsByProduct } from "../../utils/variantUtil.js";
import { Markup } from "telegraf";

export default (bot) => {
    bot.action(/STOCK_PRODUCTS/, async (ctx) => {
        try {
            const products = await getAllProducts();

            if (!products || products.length === 0) {
                return ctx.reply('❌ Không có sản phẩm nào!');
            }

            // Tạo message với HTML formatting
            let message = `
<b>📦 STOCK PRODUCTS</b>
<i>🗓️ ${formatDate(new Date())}</i>

`;

            // Duyệt qua từng product và lấy variants
            for (const product of products) {
                const variants = await getVariantsByProduct(product.id);

                if (variants.length === 0) {
                    message += `📦 <b>${escapeHtml(product.name)}</b> - <code>x0</code>\n`;
                } else {
                    variants.forEach(variant => {
                        const stockIcon = variant.quantity === 0 ? '🔴' : '🟢';
                        const quantityStyle = variant.quantity === 0 ?
                            '<code style="color: red">' : '<code style="color: green">';

                        message += `${stockIcon} <b>${escapeHtml(product.name)} ${escapeHtml(variant.variant_name)}</b> - ${quantityStyle}x${variant.quantity}</code>\n`;
                    });
                }
            }

            const keyboard = [
                [Markup.button.callback('↩️ Back to Menu', 'SHOW_HOME')]
            ];

            await ctx.editMessageCaption(message, {
                parse_mode: 'HTML',
                ...Markup.inlineKeyboard(keyboard),
                disable_web_page_preview: true
            });

        } catch (error) {
            console.error('❌ Lỗi khi hiển thị stock products:', error);
            await ctx.reply('❌ Có lỗi xảy ra khi tải danh sách sản phẩm!');
        }
    });

    // Hàm format date
    function formatDate(date) {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('id-ID');

        return `${dayName}, ${day} ${month} ${year} ${time}`;
    }

    // Hàm escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}