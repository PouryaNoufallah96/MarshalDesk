"use client";

import type {
  PublicWidgetConfig,
  WidgetStartInput,
  WidgetThread,
} from "@marshaldesk/shared";
import { ORPCError } from "@orpc/client";
import {
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  type EmbedLayoutMessage,
  type EmbedLayoutState,
  isEmbedViewportMessage,
} from "@/lib/widget/embed-protocol";
import {
  canRequestHuman,
  startsNewConversation,
  toWidgetMessages,
} from "@/lib/widget/thread";
import {
  clearVisitorToken,
  createVisitorQueryClient,
  readVisitorToken,
  saveVisitorToken,
  visitorClient,
  visitorOrpc,
} from "@/lib/widget/visitor-client";
import type { WidgetAppearance, WidgetMessage } from "./types";
import { WidgetLauncher } from "./widget-launcher";
import { widgetThemeStyle } from "./widget-theme";
import { WidgetWindow } from "./widget-window";

// Stands in for live updates until owner replies arrive in real time.
const OPEN_POLL_INTERVAL_MS = 15_000;

const threadKey = visitorOrpc.widget.getThread.queryKey();

type WidgetAppProps = {
  config: PublicWidgetConfig;
  agentAvatarUrl: string;
  /** The embedding page's hostname, from the embed script. */
  host: string | null;
};

export function WidgetApp(props: WidgetAppProps) {
  const [queryClient] = useState(createVisitorQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <Widget {...props} />
    </QueryClientProvider>
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof ORPCError && error.code === code;
}

const SESSION_RETRY_BASE_MS = 1_000;
const SESSION_RETRY_MAX_MS = 30_000;

/** The server refused this page for good; anything else is worth retrying. */
function isSessionRefused(error: unknown): boolean {
  return (
    hasErrorCode(error, "DOMAIN_NOT_ALLOWED") ||
    hasErrorCode(error, "NOT_FOUND")
  );
}

function visitorDetails(): WidgetStartInput["details"] {
  return {
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone?.slice(0, 100) || null,
    language: navigator.language?.slice(0, 35) || null,
    // Cross-origin, the iframe's referrer is the page it's embedded in.
    page: document.referrer.slice(0, 2048) || null,
    referrer: null,
  };
}

function postLayout(message: EmbedLayoutMessage) {
  if (window.parent === window) return;
  // The page's origin isn't known here, and layout state isn't sensitive.
  window.parent.postMessage(message, "*");
}

function Widget({ config, agentAvatarUrl, host }: WidgetAppProps) {
  const queryClient = useQueryClient();
  const { workspaceId } = config;
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<readonly WidgetMessage[]>([]);
  const pendingId = useRef(0);

  const sessionKey = ["widget-session", workspaceId, host] as const;

  async function startSession() {
    if (!host) throw new Error("The embed script didn't pass a host.");
    const session = await visitorClient.widget.start({
      workspaceId,
      host,
      token: readVisitorToken(workspaceId),
      details: visitorDetails(),
    });
    saveVisitorToken(workspaceId, session.token);
    return session;
  }

  /** Runs a visitor call, starting a fresh session once if the token expired. */
  async function asVisitor<T>(call: () => Promise<T>): Promise<T> {
    try {
      return await call();
    } catch (error) {
      if (!hasErrorCode(error, "VISITOR_UNAUTHORIZED")) throw error;
      clearVisitorToken(workspaceId);
      await queryClient.fetchQuery({
        queryKey: sessionKey,
        queryFn: startSession,
        staleTime: 0,
      });
      return call();
    }
  }

  const session = useQuery({
    queryKey: sessionKey,
    queryFn: startSession,
    enabled: host !== null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: (_failureCount, error) => !isSessionRefused(error),
    retryDelay: (attempt) =>
      Math.min(SESSION_RETRY_BASE_MS * 2 ** attempt, SESSION_RETRY_MAX_MS),
    refetchOnWindowFocus: (query) =>
      query.state.status === "error" && !isSessionRefused(query.state.error),
  });

  const thread = useQuery({
    queryKey: threadKey,
    queryFn: () => asVisitor(() => visitorClient.widget.getThread()),
    enabled: session.isSuccess,
    refetchOnWindowFocus: true,
    refetchInterval: open ? OPEN_POLL_INTERVAL_MS : false,
  });

  const blocked =
    host === null ||
    isSessionRefused(session.error) ||
    hasErrorCode(thread.error, "DOMAIN_NOT_ALLOWED") ||
    hasErrorCode(thread.error, "VISITOR_UNAUTHORIZED");
  const layoutState: EmbedLayoutState | null = blocked
    ? "hidden"
    : !session.isSuccess
      ? null
      : open
        ? "open"
        : "collapsed";

  useEffect(() => {
    if (layoutState === null) return;
    postLayout({
      type: "marshaldesk:layout",
      state: layoutState,
      position: config.position,
    });
  }, [layoutState, config.position]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== window.parent) return;
      if (!host || new URL(event.origin).hostname !== host) return;
      if (isEmbedViewportMessage(event.data)) setMobile(event.data.mobile);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [host]);

  // TanStack Query refetches on visibility changes; clicking into the iframe
  // only fires `focus`.
  useEffect(() => {
    if (!session.isSuccess) return;
    function onFocus() {
      void queryClient.invalidateQueries({ queryKey: threadKey });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session.isSuccess, queryClient]);

  function handleCallError(error: unknown, message: string) {
    if (
      hasErrorCode(error, "DOMAIN_NOT_ALLOWED") ||
      hasErrorCode(error, "VISITOR_UNAUTHORIZED")
    ) {
      void queryClient.invalidateQueries({ queryKey: threadKey });
    }
    setNotice(message);
  }

  async function send(body: string) {
    setNotice(null);
    pendingId.current += 1;
    const optimistic: WidgetMessage = {
      id: `pending-${pendingId.current}`,
      author: "visitor",
      body,
    };
    setPending((current) => [...current, optimistic]);
    try {
      const next = await asVisitor(() =>
        visitorClient.widget.sendMessage({ body }),
      );
      queryClient.setQueryData<WidgetThread>(threadKey, next);
    } catch (error) {
      handleCallError(error, "Your message couldn't be sent. Try again.");
    } finally {
      setPending((current) =>
        current.filter((message) => message.id !== optimistic.id),
      );
    }
  }

  async function requestHuman() {
    setNotice(null);
    try {
      const next = await asVisitor(() => visitorClient.widget.requestHuman());
      queryClient.setQueryData<WidgetThread>(threadKey, next);
    } catch (error) {
      handleCallError(error, "We couldn't reach a person. Try again.");
    }
  }

  if (layoutState === null || layoutState === "hidden") return null;

  // Until the thread loads, a returning visitor's history is unknown.
  const threadLoaded = thread.data !== undefined;
  const conversation = thread.data?.conversation ?? null;
  const newConversation = threadLoaded && startsNewConversation(conversation);
  const messages: WidgetMessage[] = [
    ...toWidgetMessages(thread.data?.messages ?? []),
    // Shown before the conversation exists; the server saves it on first send.
    ...(newConversation
      ? [{ id: "greeting", author: "agent" as const, body: config.greeting }]
      : []),
    ...pending,
  ];

  const appearance: WidgetAppearance = {
    agentEnabled: config.agentEnabled,
    agentName: config.agentName,
    agentAvatarUrl,
    color: config.color,
    position: config.position,
    greeting: config.greeting,
    suggestedQuestions: config.suggestedQuestions,
  };
  const fullScreen = open && mobile;

  return (
    <div
      style={widgetThemeStyle(config.color)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className={cn(
        "flex h-full w-full flex-col justify-end",
        config.position === "bottom-right" ? "items-end" : "items-start",
        fullScreen ? null : "gap-3 p-4",
        open && !fullScreen && "pt-8",
      )}
    >
      {open ? (
        <WidgetWindow
          appearance={appearance}
          messages={messages}
          showGreeting={false}
          showSuggestedQuestions={
            config.agentEnabled && newConversation && pending.length === 0
          }
          showTalkToHuman={
            threadLoaded && canRequestHuman(config.agentEnabled, conversation)
          }
          notice={notice}
          onClose={() => setOpen(false)}
          onSelectQuestion={(question) => void send(question)}
          onTalkToHuman={() => void requestHuman()}
          onSend={(body) => void send(body)}
          className={
            fullScreen
              ? "h-full w-full rounded-none shadow-none ring-0"
              : "min-h-0 w-full max-w-[400px] flex-1"
          }
        />
      ) : null}
      {fullScreen ? null : (
        <WidgetLauncher open={open} onToggle={() => setOpen(!open)} />
      )}
    </div>
  );
}
