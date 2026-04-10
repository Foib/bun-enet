import { afterAll, expect, test } from "bun:test";

import {
  ENetEventType,
  ENetPacketFlag,
  Host,
  Packet,
  PeerState,
  address,
  initialize,
  randomSeed,
  setTime,
  time,
  version,
} from "../index";

const runtime = initialize();

afterAll(() => {
  runtime.close();
});

test("reports the bundled ENet version", () => {
  expect(version()).toEqual({ major: 1, minor: 3, patch: 18, raw: 0x010312 });
});

test("exposes ENet time helpers", () => {
  const original = time();
  const next = (original + 1234) >>> 0;

  setTime(next);
  expect(time()).toBe(next);

  setTime(original);
  expect(randomSeed()).toBeGreaterThanOrEqual(0);
});

test("can connect localhost peers and exchange a packet", async () => {
  using server = Host.createServer({
    address: address("127.0.0.1", 40951),
    peers: 4,
    channels: 2,
  });

  using client = Host.createClient({
    peers: 1,
    channels: 2,
  });

  const peer = client.connect(address("127.0.0.1", 40951), { channels: 2 });

  const deadline = Date.now() + 2_000;
  let clientConnected = false;
  let serverConnected = false;
  let serverPeer = null as typeof peer | null;

  while (Date.now() < deadline && (!clientConnected || !serverConnected)) {
    const serverEvent = server.service(25);
    if (serverEvent?.type === ENetEventType.CONNECT) {
      serverConnected = true;
      serverPeer = serverEvent.peer;
    }

    const clientEvent = client.service(25);
    if (clientEvent?.type === ENetEventType.CONNECT) {
      clientConnected = true;
    }
  }

  expect(clientConnected).toBe(true);
  expect(serverConnected).toBe(true);
  expect(peer.state).toBe(PeerState.CONNECTED);
  expect(serverPeer).not.toBeNull();

  peer.setPingInterval(750);
  peer.setTimeout(5, 1_000, 10_000);
  peer.configureThrottle(5_000, 2, 2);

  const clientInfo = client.info;
  expect(clientInfo.peers).toBe(1);
  expect(clientInfo.channelLimit).toBe(2);
  expect(client.random()).toBeGreaterThanOrEqual(0);

  const livePeerInfo = peer.info;
  expect(livePeerInfo.state).toBe(PeerState.CONNECTED);
  expect(livePeerInfo.channels).toBe(2);
  expect(livePeerInfo.pingInterval).toBe(750);
  expect(livePeerInfo.timeoutMinimum).toBe(1_000);
  expect(livePeerInfo.timeoutMaximum).toBe(10_000);

  peer.send(0, Packet.fromString("ping", ENetPacketFlag.RELIABLE));
  client.flush();

  let receivedPayload: string | null = null;
  let takenPacketText: string | null = null;

  while (Date.now() < deadline && receivedPayload === null) {
    using serverEvent = server.service(25);
    if (serverEvent?.type === ENetEventType.RECEIVE && serverEvent.packet) {
      receivedPayload = serverEvent.packet.text();

      const packet = serverEvent.takePacket();
      expect(packet).not.toBeNull();
      if (packet) {
        takenPacketText = packet.text();
        expect(packet.disposed).toBe(false);
        packet.dispose();
        expect(packet.disposed).toBe(true);
      }
    }
  }

  expect(receivedPayload).toBe("ping");
  expect(takenPacketText).toBe("ping");

  peer.disconnect();
  client.flush();
});
