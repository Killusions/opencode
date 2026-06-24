import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => {
    return withNetworkOptions(yargs).option("prompt", {
      describe: "prompt to use",
      type: "string",
    })
  },
  describe: "starts a headless opencode server",
  // Server loads instances per-request via x-opencode-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    const { Server } = yield* Effect.promise(() => import("../../server/server"))
    if (!Flag.OPENCODE_SERVER_PASSWORD) {
      console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
    }
    const opts = yield* resolveNetworkOptions(args)
    const server = yield* Effect.promise(() => Server.listen(opts))
    const baseUrl = `http://${server.hostname}:${server.port}`

    if (args.prompt) {
      const sdk = createOpencodeClient({ baseUrl })

      const session = yield* Effect.promise(() =>
        sdk.session.create({ directory: process.cwd() }).then((res) => res.data),
      )
      if (!session) {
        console.log(`opencode server listening on ${baseUrl}`)
        yield* Effect.never
      }

      sdk.session
        .prompt({
          sessionID: session.id,
          directory: process.cwd(),
          parts: [
            {
              type: "text",
              text: args.prompt,
            },
          ],
        })
        .catch(() => {})

      console.log(`opencode server listening on ${baseUrl}`)
      console.log(`session created: ${baseUrl}/${session.id}/session/${session.id}`)
    } else {
      console.log(`opencode server listening on ${baseUrl}`)
    }

    yield* Effect.never
  }),
})
