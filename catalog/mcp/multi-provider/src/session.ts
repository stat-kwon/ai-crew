import type { ProviderMessage } from "./providers/base.js";

interface Session {
  messages: ProviderMessage[];
  createdAt: number;
  lastAccessedAt: number;
}

const DEFAULT_MAX_MESSAGES = 50;

export class SessionManager {
  private sessions = new Map<string, Session>();
  private maxMessages: number;

  constructor(maxMessages: number = DEFAULT_MAX_MESSAGES) {
    this.maxMessages = maxMessages;
  }

  addMessage(sessionId: string, message: ProviderMessage): void {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        messages: [],
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
      };
      this.sessions.set(sessionId, session);
    }

    session.messages.push(message);
    session.lastAccessedAt = Date.now();

    // Auto-trim: keep system messages + most recent messages
    if (session.messages.length > this.maxMessages) {
      const systemMessages = session.messages.filter((m) => m.role === "system");
      const nonSystem = session.messages.filter((m) => m.role !== "system");
      const trimmed = nonSystem.slice(-this.maxMessages + systemMessages.length);
      session.messages = [...systemMessages, ...trimmed];
    }
  }

  getHistory(sessionId: string): ProviderMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    session.lastAccessedAt = Date.now();
    return [...session.messages];
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  listSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

/** Singleton session manager */
export const sessionManager = new SessionManager();
