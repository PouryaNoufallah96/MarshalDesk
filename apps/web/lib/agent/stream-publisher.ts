import "server-only";
import { publishConversationEvent } from "@/lib/realtime/publish";

const MIN_CHUNK_INTERVAL_MS = 60;
const HOLD_BACK_CHARS = 40;

/**
 * Publishes a streamed reply as batched `agent.chunk` events carrying the whole
 * reply so far: one publish in flight at a time, and at most one every 60 ms,
 * never one per token. Nothing goes out until 40 characters have arrived or the
 * reply is drained, so a model that writes a few words and then hands off never
 * shows them.
 */
export class ChunkPublisher {
  readonly messageId = crypto.randomUUID();
  /** When the first chunk went out, in `performance.now()` time. */
  firstChunkAt: number | null = null;

  private seq = 0;
  private text = "";
  private publishedLength = 0;
  private released = false;
  private inFlight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastFlushAt = Number.NEGATIVE_INFINITY;
  private closed = false;

  constructor(private readonly conversationId: string) {}

  /** Whether any chunk of this reply reached the room's clients. */
  get started(): boolean {
    return this.seq > 0;
  }

  private get hasPending(): boolean {
    return this.text.length > this.publishedLength;
  }

  push(text: string): void {
    if (this.closed || text === "") return;
    this.text += text;
    if (this.text.length >= HOLD_BACK_CHARS) this.released = true;
    if (this.released) this.schedule();
  }

  /** Publishes everything pushed so far and waits for it. */
  async drain(): Promise<void> {
    this.released = true;
    while (this.inFlight || this.hasPending) {
      this.clearTimer();
      if (!this.inFlight) this.flush();
      await this.inFlight;
    }
  }

  /** Drops unsent text and, when clients saw a partial reply, ends it. */
  async abandon(): Promise<void> {
    this.closed = true;
    this.clearTimer();
    await this.inFlight;
    if (this.started) await this.done();
  }

  async done(): Promise<void> {
    this.closed = true;
    this.clearTimer();
    await publishConversationEvent(this.conversationId, {
      type: "agent.done",
      conversationId: this.conversationId,
      messageId: this.messageId,
    });
  }

  private schedule(): void {
    if (this.inFlight || this.timer) return;
    const wait = Math.max(
      0,
      this.lastFlushAt + MIN_CHUNK_INTERVAL_MS - performance.now(),
    );
    if (wait === 0) {
      this.flush();
    } else {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.flush();
      }, wait);
    }
  }

  private flush(): void {
    if (!this.hasPending || this.inFlight) return;
    const text = this.text;
    this.publishedLength = text.length;
    const seq = this.seq++;
    this.lastFlushAt = performance.now();
    this.firstChunkAt ??= this.lastFlushAt;
    this.inFlight = publishConversationEvent(this.conversationId, {
      type: "agent.chunk",
      conversationId: this.conversationId,
      messageId: this.messageId,
      seq,
      text,
    }).then(() => {
      this.inFlight = null;
      if (!this.closed && this.hasPending) this.schedule();
    });
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
