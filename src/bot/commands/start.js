import { Markup } from "telegraf";
import { addUser, getUserById } from "../../utils/userUtil.js";
import path from "path";

// Hàm escape HTML an toàn
function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Tạo caption menu với HTML formatting
function createMenuCaption(user) {
    const fullName = `${escapeHtml(user.first_name)} ${escapeHtml(user.last_name || "")}`.trim();
    const username = user.username ? `@${escapeHtml(user.username)}` : 'no username';

    return `
👋 — <b>Hello ${fullName}</b> 🛠️

<b>User Details:</b>
╰ Username : ${username}
╰ Balance : ${user.balance} $
╰ Transaction : ${user.transaction}
`.trim();
}

// Tạo keyboard menu
function createMenuKeyboard() {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback("📦 All Products", "SHOW_USER_PRODUCTS_0"),
            // Markup.button.callback("💎 Premium Apps", "PREMIUM_APPS"),
        ],
        [
            // Markup.button.callback("🤖 Bot Info", "BOT_INFO"),
            Markup.button.callback("💰 Deposit", "DEPOSIT"),
        ],
        [
            // Markup.button.callback("🤖 Bot Info", "BOT_INFO"),
            Markup.button.callback("📦 Stock product", "STOCK_PRODUCTS"),
        ]

    ]);
}

const showMenu = async (ctx, u, edit = false, media = false) => {
    const logoPath = path.join(process.cwd(), "assets/logo.png");

    const caption = createMenuCaption(u);
    const keyboard = createMenuKeyboard();

    const messageOptions = {
        caption: caption,
        parse_mode: "HTML",
        ...keyboard,
    };

    try {
        if (edit) {
            if (media) {
                await ctx.editMessageMedia(
                    {
                        type: "photo",
                        media: { source: logoPath },
                        caption: caption,
                        parse_mode: "HTML",
                    },
                    keyboard
                );
            } else {
                await ctx.editMessageCaption(caption, {
                    parse_mode: "HTML",
                    ...keyboard,
                });
            }
        } else {
            // Khi /start → gửi tin nhắn mới
            await ctx.replyWithPhoto(
                { source: logoPath },
                {
                    caption,
                    parse_mode: "HTML",
                    ...keyboard,
                }
            );
        }
    } catch (error) {
        // Xử lý lỗi "message not modified"
        if (error.response?.error_code === 400 &&
            error.response.description.includes('message is not modified')) {
            console.log('Menu message not modified - ignoring error');
            return;
        }
        throw error;
    }
}

export default (bot) => {
    bot.start(async (ctx) => {
        const { id, is_bot, first_name, last_name, username = "no-username", language_code } = ctx.from;
        const balance = 0;
        const is_block = false;
        const transaction = 0;
        const user = {
            id,
            is_bot,
            first_name,
            last_name,
            username,
            language_code,
            balance,
            is_block,
            transaction
        }
        const u = await addUser(user);
        // ╰ ID : <code>${user.id}</code>
        // <b>BOT Statistic:</b>
        // ╰ Produk Terjual: 165,882 Akun
        // ╰ Total User: 1809

        showMenu(ctx, user);
    });

    bot.action("SHOW_HOME", async (ctx) => {
        const { id } = ctx.from;
        const user = await getUserById(id);
        showMenu(ctx, user, true);
    });

    bot.action("SHOW_HOME_MEDIA", async (ctx) => {
        const { id } = ctx.from;
        const user = await getUserById(id);
        showMenu(ctx, user, true, true);
    });
};

export {
    showMenu
}