import { Markup } from "telegraf";
import path from "path";
import { fileURLToPath } from "url";
import { ADDRESS_WALLET, NETWORK } from "../../utils/env.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (bot) => {
    bot.action("DEPOSIT", async (ctx) => {
        try {
            await ctx.answerCbQuery();

            // Optional QR image (store it in your assets folder)
            const qrPath = path.join(process.cwd(), "assets/deposit_qr.jpg");

            const caption = `
💰 Crypto Deposit — USDT BEP20 / USDT BNB CHAIN Network

📢 Important Notice:
Please *DO NOT send funds* before clicking the ✅ Request deposit button below.

🏦 Deposit Address (${NETWORK}):
${ADDRESS_WALLET}

You can scan the QR code above to send funds.

Once you’ve made the transfer, please enter your *Transaction hash or Transaction ID* below so we can verify your deposit.
Example: 0xdd37bc11ac4c97145c788648823d3326d1b74569363abd086dce84b0037242e7
`;


            // Send QR + caption
            await ctx.editMessageMedia(
                {
                    type: "photo",
                    media: { source: qrPath }, // ← bắt buộc
                    caption: caption,
                    parse_mode: "Markdown"
                },
                {
                    reply_markup: {
                        inline_keyboard: [
                            [Markup.button.callback("✅ Request deposit", "DEPOSIT_ENTER_TXID")],
                            [Markup.button.callback("↩️ Back", "SHOW_HOME_MEDIA")]
                        ]
                    }
                }
            );

        } catch (err) {
            console.error("⚠️ Deposit UI error:", err);
            await ctx.reply("⚠️ Failed to load deposit instructions. Please try again later.");
        }
    });

    bot.action("DEPOSIT_ENTER_TXID", async (ctx) => {
        await ctx.answerCbQuery();
        ctx.session = ctx.session || {};
        ctx.session.time = Date.now() / 1000;

        ctx.session.step = "waiting_txid";

        await ctx.reply("🔍 Please enter your *Transaction hash or Transaction ID *:", {
            parse_mode: "Markdown",
        });
    });

};
