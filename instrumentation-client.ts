import { initBotId } from "botid/client/core";

// The pages whose server actions check for bots: the Recommend Licks popup
// posts from / and /list, and the admin login from its own page.
initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/list", method: "POST" },
    { path: "/reborn/login", method: "POST" },
  ],
});
