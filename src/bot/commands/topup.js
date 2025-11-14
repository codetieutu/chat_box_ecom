import { getUserByUsername, isAdmin, updateUser } from "../../utils/userUtil.js";

export default (bot) => {
    bot.command("topup", async (ctx) => {
        const userId = ctx.from.id;
        if (!(await isAdmin(userId))) {
            ctx.reply("error command");
            return;
        }

        try {
            const mess = ctx.message.text;
            const arr = mess.split(" ");

            if (arr.length < 3) {
                ctx.reply("error command");
            }
            const username = arr[1];
            const amount = arr[2];
            const user = await getUserByUsername(username)
            const newUser = await updateUser(user.id, { balance: parseFloat(user.balance) + parseFloat(amount) })
            ctx.reply(`recharge for @${username} ${amount}$`)
        } catch (error) {
            ctx.reply("error");
            console.log(">>check err", error);
        }
    })
}