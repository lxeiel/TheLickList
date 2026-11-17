import { initBotId } from "botid/client/core";

// The pages the Recommend Licks popup's server action posts from.
initBotId({
  protect: [
    { path: "/", method: "POST" },
    { path: "/list", method: "POST" },
  ],
});
