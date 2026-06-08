import { Effect } from "effect"
import { effectCmd } from "../effect-cmd"
import { withNetworkOptions, resolveNetworkOptions } from "../network"
import { Flag } from "@opencode-ai/core/flag/flag"
import { createOpencodeClient } from "@opencode-ai/sdk/v2"
import { Hono } from "hono"
import { proxy } from "hono/proxy"
import { Server } from "@/server/server"

export const ServeCommand = effectCmd({
  command: "serve",
  builder: (yargs) => {
    return withNetworkOptions(yargs)
      .option("prompt", {
        describe: "prompt to use",
        type: "string",
      })
      .option("attach", {
        describe: "attach to an existing OpenCode server",
        type: "string",
      })
  },
  describe: "starts a headless opencode server",
  // Server loads instances per-request via x-opencode-directory header — no
  // need for an ambient project InstanceContext at startup.
  instance: false,
  handler: Effect.fn("Cli.serve")(function* (args) {
    let server: Awaited<ReturnType<typeof Server.listen>> | ReturnType<typeof Bun.serve> | undefined
    let baseUrl: string
    let remoteUrl: string | undefined

    if (args.attach) {
      remoteUrl = args.attach
      const opts = yield* resolveNetworkOptions(args)

      const app = new Hono()
      app.all("*", async (c) => {
        const url = new URL(c.req.url)
        const targetUrl = `${remoteUrl}${url.pathname}${url.search}`
        return proxy(targetUrl, {
          ...c.req,
        })
      })

      server = Bun.serve({
        hostname: opts.hostname,
        port: opts.port,
        fetch: app.fetch,
      })

      baseUrl = `http://${server.hostname}:${server.port}`
    } else {
      if (!Flag.OPENCODE_SERVER_PASSWORD) {
        console.log("Warning: OPENCODE_SERVER_PASSWORD is not set; server is unsecured.")
      }
      const opts = yield* resolveNetworkOptions(args)
      server = yield* Effect.promise(() => Server.listen(opts))
      baseUrl = `http://${server.hostname}:${server.port}`
    }

    if (args.prompt) {
      const sdk = createOpencodeClient({ baseUrl: remoteUrl ?? baseUrl })

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
