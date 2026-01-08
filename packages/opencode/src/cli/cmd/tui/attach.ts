import { cmd } from "../cmd"
import { tui } from "./app"
import { iife } from "@/util/iife"
import { parseSessionUrl } from "@/util/parse-session-url"

export const AttachCommand = cmd({
  command: "attach <url>",
  describe: "attach to a running opencode server",
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: "http://localhost:4096 or http://localhost:4096/ses_xxx/session/ses_xxx",
        demandOption: true,
      })
      .option("dir", {
        type: "string",
        description: "directory to run in",
      })
      .option("session", {
        alias: ["s"],
        type: "string",
        describe: "session id to continue",
      })
      .option("prompt", {
        type: "string",
        describe: "prompt to use",
      }),
  handler: async (args) => {
    if (args.dir) process.chdir(args.dir)

    const prompt = await iife(async () => {
      const piped = !process.stdin.isTTY ? await Bun.stdin.text() : undefined
      if (!args.prompt) return piped
      return piped ? piped + "\n" + args.prompt : args.prompt
    })

    const { baseUrl, sessionId } = parseSessionUrl(args.url)

    await tui({
      url: baseUrl,
      args: {
        sessionID: args.session ?? sessionId,
        prompt,
      },
      directory: args.dir ? process.cwd() : undefined,
    })
  },
})
