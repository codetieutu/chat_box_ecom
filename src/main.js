import './index.js'
import './server/server.js'
import autoUpdate from "./utils/expireP.js";
import cron from "node-cron";
// schedure
cron.schedule(
    "0 0 * * *",
    async () => {
        console.log("Running job at 00:00 UTC");
        await autoUpdate();
    },
    {
        timezone: "UTC",
    }
);