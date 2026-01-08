import { cmd } from "../cmd"
import { tui } from "./app"
import { iife } from "@/util/iife"

export const AttachCommand = cmd({
  command: "attach <url>",
  describe: "attach to a running opencode server",
  builder: (yargs) =>
    yargs
      .positional("url", {
        type: "string",
        describe: "http://localhost:4096",
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

    await tui({
      url: args.url,
      args: {
        sessionID: args.session,
        prompt,
      },
      directory: args.dir ? process.cwd() : undefined,
    })
  },
})
