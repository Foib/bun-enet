import {
  ENetEventType,
  ENetPacketFlag,
  Host,
  Packet,
  address,
  initialize,
} from "../index";

const port = 9000;
const message = "Hello from bun-enet client!";
const pollIntervalMs = 10;

using _ = initialize();
using client = Host.createClient({
  peers: 1,
  channels: 2,
});

const peer = client.connect(address("127.0.0.1", port), { channels: 2 });
const deadline = Date.now() + 5_000;

console.log(`Connecting to 127.0.0.1:${port}...`);

let connected = false;

while (Date.now() < deadline && !connected) {
  using event = client.service(0);

  if (event?.type === ENetEventType.CONNECT) {
    connected = true;
    continue;
  }

  await Bun.sleep(pollIntervalMs);
}

if (!connected) {
  throw new Error("Timed out waiting for the ENet connection");
}

console.log(`Connected, sending: ${message}`);
peer.send(0, Packet.fromString(message, ENetPacketFlag.RELIABLE));
client.flush();

let receivedReply = false;

while (Date.now() < deadline && !receivedReply) {
  using event = client.service(0);

  if (event?.type === ENetEventType.RECEIVE && event.packet) {
    console.log(`Server replied: ${event.packet.text()}`);
    receivedReply = true;
    continue;
  }

  if (event?.type === ENetEventType.DISCONNECT) {
    throw new Error("Server disconnected before replying");
  }

  await Bun.sleep(pollIntervalMs);
}

if (!receivedReply) {
  throw new Error("Timed out waiting for the server reply");
}

peer.disconnect();
client.flush();
console.log("Client done");
