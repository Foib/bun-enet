# bun-enet

`bun-enet` is a Bun wrapper around the ENet C library

![NPM Version](https://img.shields.io/npm/v/bun-enet)

> [!NOTE]  
> The library is currently targeted at Windows only. Support for other platforms will be added in the future.

## Install

```bash
bun add bun-enet
```

## Usage

```ts
import { Host, Packet, address, initialize, randomSeed, time } from "bun-enet";

using _ = initialize();

using server = Host.createServer({
  address: address("127.0.0.1", 9000),
  peers: 32,
  channels: 2,
});

using client = Host.createClient({ peers: 1, channels: 2 });
const peer = client.connect(address("127.0.0.1", 9000), { channels: 2 });

const deadline = Date.now() + 2_000;
let clientConnected = false;

while (Date.now() < deadline && !clientConnected) {
  using serverEvent = server.service(25);
  using clientEvent = client.service(25);

  if (clientEvent?.type === 1) {
    clientConnected = true;
  }
}

if (!clientConnected) {
  throw new Error("Timed out waiting for ENet connection");
}

peer.send(0, Packet.fromString("hello"));
client.flush();

while (Date.now() < deadline) {
  using event = server.service(25);
  if (event?.packet) {
    const packet = event.takePacket();
    console.log(packet?.text());
    packet?.dispose();
    break;
  }
}

console.log(time(), randomSeed(), client.info, peer.info);
```

## API

- `initialize()` initializes ENet once and returns a disposable runtime handle.
- `time()`, `setTime()`, and `randomSeed()` expose ENet global timing/random helpers.
- `Host.createServer()` and `Host.createClient()` create ENet hosts.
- `Host#service()` returns disposable `connect`, `disconnect`, and `receive` events.
- `Event#takePacket()` transfers ownership of a received packet out of the event.
- `Host#info`, `Peer#info`, `Host#throttleBandwidth()`, `Host#random()`, and `Peer#configureThrottle()` expose additional runtime stats and controls.
- `Peer#send()` sends a `Packet` on a channel.
- `Packet.fromString()` and `Packet.fromBytes()` create packets owned by ENet.

## Example

There is a complete client/server example in `example/`

## Licensing

The wrapper is MIT licensed. The published package also includes `THIRD_PARTY_LICENSES`
for bundled ENet license notices.
