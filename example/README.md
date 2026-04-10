# Example

Run the server in one terminal:

```bash
bun run ./example/server.ts
```

Run the client in another terminal:

```bash
bun run ./example/client.ts
```

---

Both server and client use a non blocking async polling loop with `service(0)` and `await Bun.sleep(...)` so they don't block Buns main thread.
