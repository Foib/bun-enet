import { ENetEventType, Host, address, initialize } from "../index";

const port = 9000;
const pollIntervalMs = 10;

using _ = initialize();
using server = Host.createServer({
  address: address("127.0.0.1", port),
  peers: 32,
  channels: 2,
});

console.log(`ENet server listening on 127.0.0.1:${port}`);
console.log("Waiting for a client...");

let running = true;
let connectedPeerAddress = "unknown";

process.on("SIGINT", () => {
  running = false;
});

while (running) {
  using event = server.service(0);

  if (!event) {
    await Bun.sleep(pollIntervalMs);
    continue;
  }

  if (event.type === ENetEventType.CONNECT) {
    connectedPeerAddress = `${event.peer.address.host}:${event.peer.address.port}`;
    console.log(`Client connected from ${connectedPeerAddress}`);
    continue;
  }

  if (event.type === ENetEventType.RECEIVE && event.packet) {
    const packet = event.takePacket();
    if (!packet) {
      continue;
    }

    const text = packet.text();
    console.log(`Received from ${connectedPeerAddress}: ${text}`);

    try {
      event.peer.send(0, packet);
    } catch (error) {
      packet.dispose();
      throw error;
    }

    server.flush();
    console.log(`Echoed back to ${connectedPeerAddress}`);
    continue;
  }

  if (event.type === ENetEventType.DISCONNECT) {
    console.log(`Client disconnected from ${connectedPeerAddress}`);
    connectedPeerAddress = "unknown";
  }
}

console.log("Server shutting down");
