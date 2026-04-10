import { dlopen, ptr, suffix, toArrayBuffer, type FFIFunction, type Pointer } from "bun:ffi";
import { existsSync } from "node:fs";
import { join } from "node:path";

const projectRoot = import.meta.dir;
const nativeLibraryPath = resolveNativeLibraryPath();

const eventBufferSize = 32;
const addressBufferSize = 8;
const peerInfoBufferSize = 104;
const hostInfoBufferSize = 96;
const ipBufferSize = 64;

const symbols = {
  bun_enet_version: {
    args: [],
    returns: "u32",
  },
  bun_enet_initialize: {
    args: [],
    returns: "i32",
  },
  bun_enet_deinitialize: {
    args: [],
    returns: "void",
  },
  bun_enet_time_get: {
    args: [],
    returns: "u32",
  },
  bun_enet_time_set: {
    args: ["u32"],
    returns: "void",
  },
  bun_enet_address_set_host_ip: {
    args: ["ptr", "cstring"],
    returns: "i32",
  },
  bun_enet_address_get_host_ip: {
    args: ["ptr", "ptr", "usize"],
    returns: "i32",
  },
  bun_enet_host_create: {
    args: ["ptr", "usize", "usize", "u32", "u32"],
    returns: "ptr",
  },
  bun_enet_host_destroy: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_host_service: {
    args: ["ptr", "ptr", "u32"],
    returns: "i32",
  },
  bun_enet_host_check_events: {
    args: ["ptr", "ptr"],
    returns: "i32",
  },
  bun_enet_host_flush: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_host_broadcast: {
    args: ["ptr", "u8", "ptr"],
    returns: "void",
  },
  bun_enet_host_channel_limit: {
    args: ["ptr", "usize"],
    returns: "void",
  },
  bun_enet_host_bandwidth_limit: {
    args: ["ptr", "u32", "u32"],
    returns: "void",
  },
  bun_enet_host_bandwidth_throttle: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_host_random_seed: {
    args: [],
    returns: "u32",
  },
  bun_enet_host_random: {
    args: ["ptr"],
    returns: "u32",
  },
  bun_enet_host_get_info: {
    args: ["ptr", "ptr"],
    returns: "i32",
  },
  bun_enet_host_connect: {
    args: ["ptr", "ptr", "usize", "u32"],
    returns: "ptr",
  },
  bun_enet_packet_create: {
    args: ["ptr", "usize", "u32"],
    returns: "ptr",
  },
  bun_enet_packet_destroy: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_packet_get_length: {
    args: ["ptr"],
    returns: "usize",
  },
  bun_enet_packet_get_data: {
    args: ["ptr"],
    returns: "ptr",
  },
  bun_enet_packet_get_flags: {
    args: ["ptr"],
    returns: "u32",
  },
  bun_enet_packet_resize: {
    args: ["ptr", "usize"],
    returns: "i32",
  },
  bun_enet_peer_send: {
    args: ["ptr", "u8", "ptr"],
    returns: "i32",
  },
  bun_enet_peer_ping: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_peer_ping_interval: {
    args: ["ptr", "u32"],
    returns: "void",
  },
  bun_enet_peer_timeout: {
    args: ["ptr", "u32", "u32", "u32"],
    returns: "void",
  },
  bun_enet_peer_throttle_configure: {
    args: ["ptr", "u32", "u32", "u32"],
    returns: "void",
  },
  bun_enet_peer_disconnect: {
    args: ["ptr", "u32"],
    returns: "void",
  },
  bun_enet_peer_disconnect_now: {
    args: ["ptr", "u32"],
    returns: "void",
  },
  bun_enet_peer_disconnect_later: {
    args: ["ptr", "u32"],
    returns: "void",
  },
  bun_enet_peer_reset: {
    args: ["ptr"],
    returns: "void",
  },
  bun_enet_peer_get_info: {
    args: ["ptr", "ptr"],
    returns: "i32",
  },
  bun_enet_peer_get_address: {
    args: ["ptr", "ptr"],
    returns: "i32",
  },
  bun_enet_event_copy_address: {
    args: ["ptr", "ptr"],
    returns: "i32",
  },
  bun_enet_mem_zero: {
    args: ["ptr", "usize"],
    returns: "void",
  },
} as const satisfies Record<string, FFIFunction>;

const library = dlopen(nativeLibraryPath, symbols);
const ffi = library.symbols;

const decoder = new TextDecoder();
let runtimeRefs = 0;

export const ENetPacketFlag = {
  RELIABLE: 1 << 0,
  UNSEQUENCED: 1 << 1,
  NO_ALLOCATE: 1 << 2,
  UNRELIABLE_FRAGMENT: 1 << 3,
  SENT: 1 << 8,
} as const;

export const ENetEventType = {
  NONE: 0,
  CONNECT: 1,
  DISCONNECT: 2,
  RECEIVE: 3,
} as const;

export const PeerState = {
  DISCONNECTED: 0,
  CONNECTING: 1,
  ACKNOWLEDGING_CONNECT: 2,
  CONNECTION_PENDING: 3,
  CONNECTION_SUCCEEDED: 4,
  CONNECTED: 5,
  DISCONNECT_LATER: 6,
  DISCONNECTING: 7,
  ACKNOWLEDGING_DISCONNECT: 8,
  ZOMBIE: 9,
} as const;

export type ENetPacketFlag = (typeof ENetPacketFlag)[keyof typeof ENetPacketFlag];
export type ENetEventType = (typeof ENetEventType)[keyof typeof ENetEventType];
export type PeerState = (typeof PeerState)[keyof typeof PeerState];

export type Address = {
  host: string;
  port: number;
};

type NativeAddress = {
  host: number;
  port: number;
};

export type PeerInfo = {
  state: PeerState;
  roundTripTime: number;
  packetLoss: number;
  packetLossVariance: number;
  packetThrottle: number;
  packetThrottleLimit: number;
  mtu: number;
  incomingBandwidth: number;
  outgoingBandwidth: number;
  incomingDataTotal: number;
  outgoingDataTotal: number;
  lastSendTime: number;
  lastReceiveTime: number;
  packetsSent: number;
  packetsLost: number;
  pingInterval: number;
  timeoutLimit: number;
  timeoutMinimum: number;
  timeoutMaximum: number;
  totalWaitingData: number;
  channels: number;
  address: Address;
};

export type HostInfo = {
  incomingBandwidth: number;
  outgoingBandwidth: number;
  mtu: number;
  serviceTime: number;
  randomSeed: number;
  peers: number;
  channelLimit: number;
  connectedPeers: number;
  bandwidthLimitedPeers: number;
  duplicatePeers: number;
  totalSentPackets: number;
  totalSentData: number;
  totalReceivedPackets: number;
  totalReceivedData: number;
};

export type Event = Disposable & {
  type: ENetEventType;
  peer: Peer;
  channelID: number;
  data: number;
  packet?: Packet;
  takePacket(): Packet | null;
  dispose(): void;
};

export type InitializeHandle = Disposable & {
  readonly initialized: true;
  close(): void;
};

export function version() {
  const rawVersion = ffi.bun_enet_version();
  return {
    major: (rawVersion >>> 16) & 0xff,
    minor: (rawVersion >>> 8) & 0xff,
    patch: rawVersion & 0xff,
    raw: rawVersion,
  };
}

export function initialize(): InitializeHandle {
  if (runtimeRefs === 0) {
    const result = ffi.bun_enet_initialize();
    if (result !== 0) {
      throw new Error(`enet_initialize failed with code ${result}`);
    }
  }

  runtimeRefs += 1;

  let closed = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    runtimeRefs -= 1;
    if (runtimeRefs === 0) {
      ffi.bun_enet_deinitialize();
    }
  };

  return {
    initialized: true,
    close,
    [Symbol.dispose]() {
      close();
    },
  };
}

export function time() {
  return ffi.bun_enet_time_get();
}

export function setTime(value: number) {
  ffi.bun_enet_time_set(value >>> 0);
}

export function randomSeed() {
  return ffi.bun_enet_host_random_seed();
}

export function address(host: string, port: number): Address {
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new RangeError(`Port must be an integer between 0 and 65535, received ${port}`);
  }

  return { host, port };
}

export class Packet implements Disposable {
  readonly pointer: Pointer;
  #disposed = false;

  private constructor(pointer: Pointer) {
    this.pointer = pointer;
  }

  static fromBytes(data: ArrayBufferLike | ArrayBufferView, flags: number = ENetPacketFlag.RELIABLE) {
    const bytes = toUint8Array(data);
    const packet = ffi.bun_enet_packet_create(ptr(bytes), bytes.byteLength, flags);
    if (!packet) {
      throw new Error("enet_packet_create failed");
    }

    return new Packet(packet);
  }

  static fromString(text: string, flags: number = ENetPacketFlag.RELIABLE) {
    return Packet.fromBytes(new TextEncoder().encode(text), flags);
  }

  static fromPointer(pointerValue: Pointer) {
    return new Packet(pointerValue);
  }

  get disposed() {
    return this.#disposed;
  }

  get length() {
    this.assertAlive();
    return Number(ffi.bun_enet_packet_get_length(this.pointer));
  }

  get flags() {
    this.assertAlive();
    return ffi.bun_enet_packet_get_flags(this.pointer);
  }

  bytes() {
    this.assertAlive();
    const dataPointer = ffi.bun_enet_packet_get_data(this.pointer);
    const length = this.length;
    if (!dataPointer || length === 0) {
      return new Uint8Array(0);
    }

    return new Uint8Array(toArrayBuffer(dataPointer, 0, length)).slice();
  }

  text() {
    return decoder.decode(this.bytes());
  }

  resize(length: number) {
    this.assertAlive();
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`Packet length must be a non-negative integer, received ${length}`);
    }

    const result = ffi.bun_enet_packet_resize(this.pointer, length);
    if (result !== 0) {
      throw new Error(`enet_packet_resize failed with code ${result}`);
    }
  }

  release() {
    this.assertAlive();
    this.#disposed = true;
    return this.pointer;
  }

  dispose() {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    ffi.bun_enet_packet_destroy(this.pointer);
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  private assertAlive() {
    if (this.#disposed) {
      throw new Error("Packet has already been disposed");
    }
  }
}

export class Peer {
  readonly pointer: Pointer;

  constructor(pointerValue: Pointer) {
    this.pointer = pointerValue;
  }

  get info(): PeerInfo {
    const buffer = new ArrayBuffer(peerInfoBufferSize);
    ffi.bun_enet_mem_zero(ptr(buffer), peerInfoBufferSize);

    const result = ffi.bun_enet_peer_get_info(this.pointer, ptr(buffer));
    if (result !== 0) {
      throw new Error(`Failed to read peer info with code ${result}`);
    }

    const view = new DataView(buffer);
    return {
      state: view.getUint32(0, true) as PeerState,
      roundTripTime: view.getUint32(4, true),
      packetLoss: view.getUint32(8, true),
      packetLossVariance: view.getUint32(12, true),
      packetThrottle: view.getUint32(16, true),
      packetThrottleLimit: view.getUint32(20, true),
      mtu: view.getUint32(24, true),
      incomingBandwidth: view.getUint32(28, true),
      outgoingBandwidth: view.getUint32(32, true),
      incomingDataTotal: view.getUint32(36, true),
      outgoingDataTotal: view.getUint32(40, true),
      lastSendTime: view.getUint32(44, true),
      lastReceiveTime: view.getUint32(48, true),
      packetsSent: view.getUint32(52, true),
      packetsLost: view.getUint32(56, true),
      pingInterval: view.getUint32(60, true),
      timeoutLimit: view.getUint32(64, true),
      timeoutMinimum: view.getUint32(68, true),
      timeoutMaximum: view.getUint32(72, true),
      totalWaitingData: Number(view.getBigUint64(80, true)),
      channels: Number(view.getBigUint64(88, true)),
      address: nativeAddressToAddress({
        host: view.getUint32(96, true),
        port: view.getUint16(100, true),
      }),
    };
  }

  get state() {
    return this.info.state;
  }

  get address() {
    return this.info.address;
  }

  send(channelID: number, packet: Packet) {
    const packetPtr = packet.release();
    const result = ffi.bun_enet_peer_send(this.pointer, channelID, packetPtr);
    if (result !== 0) {
      Packet.fromPointer(packetPtr).dispose();
      const state = this.state;
      const stateName = peerStateName(state);
      throw new Error(
        `enet_peer_send failed with code ${result} while peer state was ${stateName}. Wait for a CONNECT event before sending packets.`,
      );
    }
  }

  ping() {
    ffi.bun_enet_peer_ping(this.pointer);
  }

  setPingInterval(intervalMs: number) {
    ffi.bun_enet_peer_ping_interval(this.pointer, intervalMs);
  }

  setTimeout(timeoutLimit: number, timeoutMinimum: number, timeoutMaximum: number) {
    ffi.bun_enet_peer_timeout(this.pointer, timeoutLimit, timeoutMinimum, timeoutMaximum);
  }

  configureThrottle(interval: number, acceleration: number, deceleration: number) {
    ffi.bun_enet_peer_throttle_configure(this.pointer, interval, acceleration, deceleration);
  }

  disconnect(data = 0) {
    ffi.bun_enet_peer_disconnect(this.pointer, data);
  }

  disconnectNow(data = 0) {
    ffi.bun_enet_peer_disconnect_now(this.pointer, data);
  }

  disconnectLater(data = 0) {
    ffi.bun_enet_peer_disconnect_later(this.pointer, data);
  }

  reset() {
    ffi.bun_enet_peer_reset(this.pointer);
  }
}

export class Host implements Disposable {
  readonly pointer: Pointer;
  #destroyed = false;

  private constructor(pointerValue: Pointer) {
    this.pointer = pointerValue;
  }

  static createServer(options: {
    address: Address;
    peers?: number;
    channels?: number;
    incomingBandwidth?: number;
    outgoingBandwidth?: number;
  }) {
    return Host.create({
      address: options.address,
      peers: options.peers ?? 32,
      channels: options.channels ?? 2,
      incomingBandwidth: options.incomingBandwidth ?? 0,
      outgoingBandwidth: options.outgoingBandwidth ?? 0,
    });
  }

  static createClient(options: {
    peers?: number;
    channels?: number;
    incomingBandwidth?: number;
    outgoingBandwidth?: number;
  } = {}) {
    return Host.create({
      address: null,
      peers: options.peers ?? 1,
      channels: options.channels ?? 2,
      incomingBandwidth: options.incomingBandwidth ?? 0,
      outgoingBandwidth: options.outgoingBandwidth ?? 0,
    });
  }

  static create(options: {
    address: Address | null;
    peers: number;
    channels: number;
    incomingBandwidth: number;
    outgoingBandwidth: number;
  }) {
    const addressBuffer = options.address ? encodeAddress(options.address) : null;
    const pointerValue = ffi.bun_enet_host_create(
      addressBuffer ? ptr(addressBuffer) : null,
      options.peers,
      options.channels,
      options.incomingBandwidth,
      options.outgoingBandwidth,
    );

    if (!pointerValue) {
      throw new Error("enet_host_create failed");
    }

    return new Host(pointerValue);
  }

  get info(): HostInfo {
    this.assertAlive();

    const buffer = new ArrayBuffer(hostInfoBufferSize);
    ffi.bun_enet_mem_zero(ptr(buffer), hostInfoBufferSize);

    const result = ffi.bun_enet_host_get_info(this.pointer, ptr(buffer));
    if (result !== 0) {
      throw new Error(`Failed to read host info with code ${result}`);
    }

    const view = new DataView(buffer);
    return {
      incomingBandwidth: view.getUint32(0, true),
      outgoingBandwidth: view.getUint32(4, true),
      mtu: view.getUint32(8, true),
      serviceTime: view.getUint32(12, true),
      randomSeed: view.getUint32(16, true),
      peers: Number(view.getBigUint64(24, true)),
      channelLimit: Number(view.getBigUint64(32, true)),
      connectedPeers: Number(view.getBigUint64(40, true)),
      bandwidthLimitedPeers: Number(view.getBigUint64(48, true)),
      duplicatePeers: Number(view.getBigUint64(56, true)),
      totalSentPackets: Number(view.getBigUint64(64, true)),
      totalSentData: Number(view.getBigUint64(72, true)),
      totalReceivedPackets: Number(view.getBigUint64(80, true)),
      totalReceivedData: Number(view.getBigUint64(88, true)),
    };
  }

  connect(remote: Address, options: { channels?: number; data?: number } = {}) {
    this.assertAlive();

    const addressBuffer = encodeAddress(remote);
    const peerPtr = ffi.bun_enet_host_connect(
      this.pointer,
      ptr(addressBuffer),
      options.channels ?? 1,
      options.data ?? 0,
    );

    if (!peerPtr) {
      throw new Error("enet_host_connect failed");
    }

    return new Peer(peerPtr);
  }

  service(timeoutMs = 0): Event | null {
    this.assertAlive();

    const buffer = new ArrayBuffer(eventBufferSize);
    ffi.bun_enet_mem_zero(ptr(buffer), eventBufferSize);
    const result = ffi.bun_enet_host_service(this.pointer, ptr(buffer), timeoutMs);

    if (result < 0) {
      throw new Error(`enet_host_service failed with code ${result}`);
    }

    if (result === 0) {
      return null;
    }

    return decodeEvent(buffer);
  }

  checkEvents(): Event | null {
    this.assertAlive();

    const buffer = new ArrayBuffer(eventBufferSize);
    ffi.bun_enet_mem_zero(ptr(buffer), eventBufferSize);
    const result = ffi.bun_enet_host_check_events(this.pointer, ptr(buffer));

    if (result < 0) {
      throw new Error(`enet_host_check_events failed with code ${result}`);
    }

    if (result === 0) {
      return null;
    }

    return decodeEvent(buffer);
  }

  flush() {
    this.assertAlive();
    ffi.bun_enet_host_flush(this.pointer);
  }

  broadcast(channelID: number, packet: Packet) {
    this.assertAlive();
    const packetPtr = packet.release();
    ffi.bun_enet_host_broadcast(this.pointer, channelID, packetPtr);
  }

  setChannelLimit(channelLimit: number) {
    this.assertAlive();
    ffi.bun_enet_host_channel_limit(this.pointer, channelLimit);
  }

  setBandwidthLimit(incomingBandwidth: number, outgoingBandwidth: number) {
    this.assertAlive();
    ffi.bun_enet_host_bandwidth_limit(this.pointer, incomingBandwidth, outgoingBandwidth);
  }

  throttleBandwidth() {
    this.assertAlive();
    ffi.bun_enet_host_bandwidth_throttle(this.pointer);
  }

  random() {
    this.assertAlive();
    return ffi.bun_enet_host_random(this.pointer);
  }

  dispose() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    ffi.bun_enet_host_destroy(this.pointer);
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  private assertAlive() {
    if (this.#destroyed) {
      throw new Error("Host has already been disposed");
    }
  }
}

function resolveNativeLibraryPath() {
  const nativeLibraryName = process.platform === "win32" ? "enet-wrapper.dll" : `libenet-wrapper.${suffix}`;
  const candidates = [
    process.env.BUN_ENET_LIBRARY_PATH,
    join(projectRoot, nativeLibraryName),
    join(projectRoot, "dist", nativeLibraryName),
    join(projectRoot, "..", "dist", nativeLibraryName),
  ].filter((value): value is string => Boolean(value));

  const match = candidates.find((candidate) => existsSync(candidate));
  if (!match) {
    throw new Error(
      `Native ENet library not found. Run \`bun run build:native\` first or set BUN_ENET_LIBRARY_PATH. Checked: ${candidates.join(", ")}`,
    );
  }

  return match;
}

function toUint8Array(data: ArrayBufferLike | ArrayBufferView) {
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  return new Uint8Array(data);
}

function encodeCString(value: string) {
  const encoded = new TextEncoder().encode(value);
  const cString = new Uint8Array(encoded.byteLength + 1);
  cString.set(encoded, 0);
  return cString;
}

function encodeAddress(value: Address) {
  const nativeAddress = new ArrayBuffer(addressBufferSize);
  const nativeView = new DataView(nativeAddress);
  nativeView.setUint16(4, value.port, true);
  const hostName = encodeCString(value.host);

  const result = ffi.bun_enet_address_set_host_ip(ptr(nativeAddress), ptr(hostName));
  if (result !== 0) {
    throw new Error(`Failed to resolve address ${value.host}:${value.port}`);
  }

  return nativeAddress;
}

function nativeAddressToAddress(value: NativeAddress): Address {
  const nativeAddress = new ArrayBuffer(addressBufferSize);
  const view = new DataView(nativeAddress);
  view.setUint32(0, value.host, true);
  view.setUint16(4, value.port, true);

  const hostNameBuffer = new Uint8Array(ipBufferSize);
  const result = ffi.bun_enet_address_get_host_ip(ptr(nativeAddress), ptr(hostNameBuffer), hostNameBuffer.byteLength);
  if (result !== 0) {
    throw new Error(`Failed to format ENet address ${value.host}:${value.port}`);
  }

  const nulIndex = hostNameBuffer.indexOf(0);
  const hostBytes = nulIndex === -1 ? hostNameBuffer : hostNameBuffer.subarray(0, nulIndex);
  return {
    host: decoder.decode(hostBytes),
    port: value.port,
  };
}

function decodeEvent(buffer: ArrayBuffer): Event {
  const view = new DataView(buffer);
  const type = view.getUint32(0, true) as ENetEventType;
  const peerPointer = view.getBigUint64(8, true);
  const channelID = view.getUint8(16);
  const data = view.getUint32(20, true);
  const packetPointer = view.getBigUint64(24, true);

  const peer = new Peer(Number(peerPointer) as Pointer);
  let packet = type === ENetEventType.RECEIVE && packetPointer !== 0n ? Packet.fromPointer(Number(packetPointer) as Pointer) : undefined;
  let disposed = false;

  const takePacket = () => {
    if (!packet) {
      return null;
    }

    const ownedPacket = packet;
    packet = undefined;
    return ownedPacket;
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    packet?.dispose();
    packet = undefined;
  };

  const event: Event = {
    type,
    peer,
    channelID,
    data,
    get packet() {
      return packet;
    },
    takePacket,
    dispose,
    [Symbol.dispose]() {
      dispose();
    },
  };

  return event;
}

function peerStateName(state: PeerState) {
  return Object.entries(PeerState).find(([, value]) => value === state)?.[0] ?? `UNKNOWN(${state})`;
}
