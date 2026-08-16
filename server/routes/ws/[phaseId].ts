import type { Peer } from "crossws";
import {
  subscribeToPhase,
  unsubscribeFromPhase,
} from "~~/server/utils/ws-rooms";

/**
 * Broadcast-only WebSocket channel for a single phase (`/ws/:phaseId`).
 * `board.vue` never connects here — it saves via the standard `$fetch` API.
 * `result.vue` connects to receive `score-updated` broadcasts triggered by
 * `server/api/phases/[id]/board.post.ts` after a successful save.
 */
export default defineWebSocketHandler({
  open(peer) {
    const phaseId = resolvePhaseId(peer);
    if (!phaseId) {
      peer.close();
      return;
    }

    // Cache on the peer's context so `close`/`error` don't need to
    // re-parse the upgrade request URL.
    peer.context.phaseId = phaseId;
    subscribeToPhase(phaseId, peer);
  },

  message() {
    // Read-only channel: clients only listen for broadcasts, no inbound
    // message handling is needed.
  },

  close(peer) {
    const phaseId = getCachedPhaseId(peer);
    if (!phaseId) return;

    unsubscribeFromPhase(phaseId, peer);
  },

  error(peer, error) {
    console.error("WebSocket error on phase channel:", error);

    const phaseId = getCachedPhaseId(peer);
    if (!phaseId) return;

    unsubscribeFromPhase(phaseId, peer);
  },
});

/**
 * Nitro/crossws does not populate `peer.context.params` with the matched
 * route params for WebSocket upgrades — only the raw upgrade `Request` is
 * available. So the `phaseId` is extracted directly from the request URL's
 * `/ws/:phaseId` path instead.
 */
function resolvePhaseId(peer: Peer): string | undefined {
  const url = peer.request?.url;
  if (!url) return undefined;

  const { pathname } = new URL(url, "http://localhost");
  const match = pathname.match(/\/ws\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

function getCachedPhaseId(peer: Peer): string | undefined {
  return (peer.context as { phaseId?: string }).phaseId;
}
