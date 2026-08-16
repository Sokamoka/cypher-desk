import type { Peer } from "crossws";

/**
 * In-memory room registry for phase-scoped WebSocket broadcasts, keyed by
 * `phaseId`. This works correctly for local dev (`nuxt dev`) and any
 * single-instance deployment, but note: on a real multi-instance Cloudflare
 * Pages/Workers production deployment, this Map is per-isolate — a peer
 * connected to a different isolate than the one handling a save request
 * will NOT receive the broadcast. A production-safe fix would use
 * Cloudflare Durable Objects to hold shared connection state; that is a
 * follow-up, out of scope here.
 */
const phaseRooms = new Map<string, Set<Peer>>();

export function subscribeToPhase(phaseId: string, peer: Peer) {
  let room = phaseRooms.get(phaseId);
  if (!room) {
    room = new Set();
    phaseRooms.set(phaseId, room);
  }
  room.add(peer);
}

export function unsubscribeFromPhase(phaseId: string, peer: Peer) {
  const room = phaseRooms.get(phaseId);
  if (!room) return;

  room.delete(peer);
  if (room.size === 0) {
    phaseRooms.delete(phaseId);
  }
}

export interface PhaseScoreUpdatedMessage {
  type: "score-updated";
  eventId: string;
  categoryId: string;
  phaseId: string;
  participantId: number;
  sliderValue: number;
}

/**
 * Broadcasts a message to every peer currently subscribed to `phaseId`.
 * Failures sending to an individual peer are swallowed so one dead
 * connection can't break the broadcast to the rest of the room.
 */
export function broadcastToPhase(
  phaseId: string,
  payload: PhaseScoreUpdatedMessage,
) {
  const room = phaseRooms.get(phaseId);
  if (!room || room.size === 0) return;

  const message = JSON.stringify(payload);
  for (const peer of room) {
    try {
      peer.send(message);
    } catch (error) {
      console.error(`Failed to send WS message to a peer in phase ${phaseId}:`, error);
    }
  }
}
