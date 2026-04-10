#include <stddef.h>
#include <stdint.h>
#include <string.h>

#include "enet/enet.h"

#if defined(_WIN32)
#define BUN_ENET_API __declspec(dllexport)
#else
#define BUN_ENET_API __attribute__((visibility("default")))
#endif

typedef struct BunEnetEvent {
  uint32_t type;
  void *peer;
  uint8_t channel_id;
  uint32_t data;
  void *packet;
} BunEnetEvent;

typedef struct BunEnetAddressInfo {
  uint32_t host;
  uint16_t port;
} BunEnetAddressInfo;

typedef struct BunEnetPeerInfo {
  uint32_t state;
  uint32_t round_trip_time;
  uint32_t packet_loss;
  uint32_t packet_loss_variance;
  uint32_t packet_throttle;
  uint32_t packet_throttle_limit;
  uint32_t mtu;
  uint32_t incoming_bandwidth;
  uint32_t outgoing_bandwidth;
  uint32_t incoming_data_total;
  uint32_t outgoing_data_total;
  uint32_t last_send_time;
  uint32_t last_receive_time;
  uint32_t packets_sent;
  uint32_t packets_lost;
  uint32_t ping_interval;
  uint32_t timeout_limit;
  uint32_t timeout_minimum;
  uint32_t timeout_maximum;
  uint64_t total_waiting_data;
  uint64_t channels;
  uint32_t address_host;
  uint16_t address_port;
} BunEnetPeerInfo;

typedef struct BunEnetHostInfo {
  uint32_t incoming_bandwidth;
  uint32_t outgoing_bandwidth;
  uint32_t mtu;
  uint32_t service_time;
  uint32_t random_seed;
  uint64_t peer_count;
  uint64_t channel_limit;
  uint64_t connected_peers;
  uint64_t bandwidth_limited_peers;
  uint64_t duplicate_peers;
  uint64_t total_sent_packets;
  uint64_t total_sent_data;
  uint64_t total_received_packets;
  uint64_t total_received_data;
} BunEnetHostInfo;

BUN_ENET_API uint32_t bun_enet_version(void) {
  return (uint32_t)enet_linked_version();
}

BUN_ENET_API int bun_enet_initialize(void) {
  return enet_initialize();
}

BUN_ENET_API void bun_enet_deinitialize(void) {
  enet_deinitialize();
}

BUN_ENET_API uint32_t bun_enet_time_get(void) {
  return enet_time_get();
}

BUN_ENET_API void bun_enet_time_set(uint32_t value) {
  enet_time_set(value);
}

BUN_ENET_API int bun_enet_address_set_host_ip(BunEnetAddressInfo *address, const char *host_name) {
  ENetAddress native_address;

  if (address == NULL || host_name == NULL) {
    return -1;
  }

  native_address.host = address->host;
  native_address.port = address->port;

  if (enet_address_set_host_ip(&native_address, host_name) != 0) {
    return -1;
  }

  address->host = native_address.host;
  address->port = native_address.port;
  return 0;
}

BUN_ENET_API int bun_enet_address_get_host_ip(const BunEnetAddressInfo *address, char *host_name, size_t name_length) {
  ENetAddress native_address;

  if (address == NULL || host_name == NULL || name_length == 0) {
    return -1;
  }

  native_address.host = address->host;
  native_address.port = address->port;
  return enet_address_get_host_ip(&native_address, host_name, name_length);
}

BUN_ENET_API void *bun_enet_host_create(
    const BunEnetAddressInfo *address,
    size_t peer_count,
    size_t channel_limit,
    uint32_t incoming_bandwidth,
    uint32_t outgoing_bandwidth) {
  ENetAddress native_address;
  ENetAddress *native_address_ptr = NULL;

  if (address != NULL) {
    native_address.host = address->host;
    native_address.port = address->port;
    native_address_ptr = &native_address;
  }

  return (void *)enet_host_create(native_address_ptr, peer_count, channel_limit, incoming_bandwidth, outgoing_bandwidth);
}

BUN_ENET_API void bun_enet_host_destroy(void *host_ptr) {
  if (host_ptr == NULL) {
    return;
  }

  enet_host_destroy((ENetHost *)host_ptr);
}

BUN_ENET_API int bun_enet_host_service(void *host_ptr, BunEnetEvent *event, uint32_t timeout_ms) {
  ENetEvent native_event;
  int result;

  if (host_ptr == NULL) {
    return -1;
  }

  result = enet_host_service((ENetHost *)host_ptr, event == NULL ? NULL : &native_event, timeout_ms);

  if (result > 0 && event != NULL) {
    event->type = (uint32_t)native_event.type;
    event->peer = (void *)native_event.peer;
    event->channel_id = native_event.channelID;
    event->data = native_event.data;
    event->packet = (void *)native_event.packet;
  }

  return result;
}

BUN_ENET_API int bun_enet_host_check_events(void *host_ptr, BunEnetEvent *event) {
  ENetEvent native_event;
  int result;

  if (host_ptr == NULL) {
    return -1;
  }

  result = enet_host_check_events((ENetHost *)host_ptr, event == NULL ? NULL : &native_event);

  if (result > 0 && event != NULL) {
    event->type = (uint32_t)native_event.type;
    event->peer = (void *)native_event.peer;
    event->channel_id = native_event.channelID;
    event->data = native_event.data;
    event->packet = (void *)native_event.packet;
  }

  return result;
}

BUN_ENET_API void bun_enet_host_flush(void *host_ptr) {
  if (host_ptr == NULL) {
    return;
  }

  enet_host_flush((ENetHost *)host_ptr);
}

BUN_ENET_API void bun_enet_host_broadcast(void *host_ptr, uint8_t channel_id, void *packet_ptr) {
  if (host_ptr == NULL || packet_ptr == NULL) {
    return;
  }

  enet_host_broadcast((ENetHost *)host_ptr, channel_id, (ENetPacket *)packet_ptr);
}

BUN_ENET_API void bun_enet_host_channel_limit(void *host_ptr, size_t channel_limit) {
  if (host_ptr == NULL) {
    return;
  }

  enet_host_channel_limit((ENetHost *)host_ptr, channel_limit);
}

BUN_ENET_API void bun_enet_host_bandwidth_limit(void *host_ptr, uint32_t incoming_bandwidth, uint32_t outgoing_bandwidth) {
  if (host_ptr == NULL) {
    return;
  }

  enet_host_bandwidth_limit((ENetHost *)host_ptr, incoming_bandwidth, outgoing_bandwidth);
}

BUN_ENET_API void bun_enet_host_bandwidth_throttle(void *host_ptr) {
  if (host_ptr == NULL) {
    return;
  }

  enet_host_bandwidth_throttle((ENetHost *)host_ptr);
}

BUN_ENET_API uint32_t bun_enet_host_random_seed(void) {
  return enet_host_random_seed();
}

BUN_ENET_API uint32_t bun_enet_host_random(void *host_ptr) {
  if (host_ptr == NULL) {
    return 0;
  }

  return enet_host_random((ENetHost *)host_ptr);
}

BUN_ENET_API int bun_enet_host_get_info(void *host_ptr, BunEnetHostInfo *info) {
  ENetHost *host;

  if (host_ptr == NULL || info == NULL) {
    return -1;
  }

  host = (ENetHost *)host_ptr;
  info->incoming_bandwidth = host->incomingBandwidth;
  info->outgoing_bandwidth = host->outgoingBandwidth;
  info->mtu = host->mtu;
  info->service_time = host->serviceTime;
  info->random_seed = host->randomSeed;
  info->peer_count = (uint64_t)host->peerCount;
  info->channel_limit = (uint64_t)host->channelLimit;
  info->connected_peers = (uint64_t)host->connectedPeers;
  info->bandwidth_limited_peers = (uint64_t)host->bandwidthLimitedPeers;
  info->duplicate_peers = (uint64_t)host->duplicatePeers;
  info->total_sent_packets = (uint64_t)host->totalSentPackets;
  info->total_sent_data = (uint64_t)host->totalSentData;
  info->total_received_packets = (uint64_t)host->totalReceivedPackets;
  info->total_received_data = (uint64_t)host->totalReceivedData;
  return 0;
}

BUN_ENET_API void *bun_enet_host_connect(
    void *host_ptr,
    const BunEnetAddressInfo *address,
    size_t channel_count,
    uint32_t data) {
  ENetAddress native_address;

  if (host_ptr == NULL || address == NULL) {
    return NULL;
  }

  native_address.host = address->host;
  native_address.port = address->port;
  return (void *)enet_host_connect((ENetHost *)host_ptr, &native_address, channel_count, data);
}

BUN_ENET_API void *bun_enet_packet_create(const void *data, size_t data_length, uint32_t flags) {
  return (void *)enet_packet_create(data, data_length, flags);
}

BUN_ENET_API void bun_enet_packet_destroy(void *packet_ptr) {
  if (packet_ptr == NULL) {
    return;
  }

  enet_packet_destroy((ENetPacket *)packet_ptr);
}

BUN_ENET_API size_t bun_enet_packet_get_length(void *packet_ptr) {
  ENetPacket *packet;

  if (packet_ptr == NULL) {
    return 0;
  }

  packet = (ENetPacket *)packet_ptr;
  return packet->dataLength;
}

BUN_ENET_API const uint8_t *bun_enet_packet_get_data(void *packet_ptr) {
  ENetPacket *packet;

  if (packet_ptr == NULL) {
    return NULL;
  }

  packet = (ENetPacket *)packet_ptr;
  return packet->data;
}

BUN_ENET_API uint32_t bun_enet_packet_get_flags(void *packet_ptr) {
  ENetPacket *packet;

  if (packet_ptr == NULL) {
    return 0;
  }

  packet = (ENetPacket *)packet_ptr;
  return packet->flags;
}

BUN_ENET_API int bun_enet_packet_resize(void *packet_ptr, size_t data_length) {
  if (packet_ptr == NULL) {
    return -1;
  }

  return enet_packet_resize((ENetPacket *)packet_ptr, data_length);
}

BUN_ENET_API int bun_enet_peer_send(void *peer_ptr, uint8_t channel_id, void *packet_ptr) {
  if (peer_ptr == NULL || packet_ptr == NULL) {
    return -1;
  }

  return enet_peer_send((ENetPeer *)peer_ptr, channel_id, (ENetPacket *)packet_ptr);
}

BUN_ENET_API void bun_enet_peer_ping(void *peer_ptr) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_ping((ENetPeer *)peer_ptr);
}

BUN_ENET_API void bun_enet_peer_ping_interval(void *peer_ptr, uint32_t ping_interval) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_ping_interval((ENetPeer *)peer_ptr, ping_interval);
}

BUN_ENET_API void bun_enet_peer_timeout(void *peer_ptr, uint32_t timeout_limit, uint32_t timeout_minimum, uint32_t timeout_maximum) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_timeout((ENetPeer *)peer_ptr, timeout_limit, timeout_minimum, timeout_maximum);
}

BUN_ENET_API void bun_enet_peer_throttle_configure(void *peer_ptr, uint32_t interval, uint32_t acceleration, uint32_t deceleration) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_throttle_configure((ENetPeer *)peer_ptr, interval, acceleration, deceleration);
}

BUN_ENET_API void bun_enet_peer_disconnect(void *peer_ptr, uint32_t data) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_disconnect((ENetPeer *)peer_ptr, data);
}

BUN_ENET_API void bun_enet_peer_disconnect_now(void *peer_ptr, uint32_t data) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_disconnect_now((ENetPeer *)peer_ptr, data);
}

BUN_ENET_API void bun_enet_peer_disconnect_later(void *peer_ptr, uint32_t data) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_disconnect_later((ENetPeer *)peer_ptr, data);
}

BUN_ENET_API void bun_enet_peer_reset(void *peer_ptr) {
  if (peer_ptr == NULL) {
    return;
  }

  enet_peer_reset((ENetPeer *)peer_ptr);
}

BUN_ENET_API int bun_enet_peer_get_info(void *peer_ptr, BunEnetPeerInfo *info) {
  ENetPeer *peer;

  if (peer_ptr == NULL || info == NULL) {
    return -1;
  }

  peer = (ENetPeer *)peer_ptr;
  info->state = (uint32_t)peer->state;
  info->round_trip_time = peer->roundTripTime;
  info->packet_loss = peer->packetLoss;
  info->packet_loss_variance = peer->packetLossVariance;
  info->packet_throttle = peer->packetThrottle;
  info->packet_throttle_limit = peer->packetThrottleLimit;
  info->mtu = peer->mtu;
  info->incoming_bandwidth = peer->incomingBandwidth;
  info->outgoing_bandwidth = peer->outgoingBandwidth;
  info->incoming_data_total = peer->incomingDataTotal;
  info->outgoing_data_total = peer->outgoingDataTotal;
  info->last_send_time = peer->lastSendTime;
  info->last_receive_time = peer->lastReceiveTime;
  info->packets_sent = peer->packetsSent;
  info->packets_lost = peer->packetsLost;
  info->ping_interval = peer->pingInterval;
  info->timeout_limit = peer->timeoutLimit;
  info->timeout_minimum = peer->timeoutMinimum;
  info->timeout_maximum = peer->timeoutMaximum;
  info->total_waiting_data = (uint64_t)peer->totalWaitingData;
  info->channels = (uint64_t)peer->channelCount;
  info->address_host = peer->address.host;
  info->address_port = peer->address.port;
  return 0;
}

BUN_ENET_API int bun_enet_peer_get_address(void *peer_ptr, BunEnetAddressInfo *address) {
  ENetPeer *peer;

  if (peer_ptr == NULL || address == NULL) {
    return -1;
  }

  peer = (ENetPeer *)peer_ptr;
  address->host = peer->address.host;
  address->port = peer->address.port;
  return 0;
}

BUN_ENET_API int bun_enet_event_copy_address(const BunEnetEvent *event, BunEnetAddressInfo *address) {
  ENetPeer *peer;

  if (event == NULL || address == NULL || event->peer == NULL) {
    return -1;
  }

  peer = (ENetPeer *)event->peer;
  address->host = peer->address.host;
  address->port = peer->address.port;
  return 0;
}

BUN_ENET_API void bun_enet_mem_zero(void *target, size_t byte_length) {
  if (target == NULL || byte_length == 0) {
    return;
  }

  memset(target, 0, byte_length);
}
