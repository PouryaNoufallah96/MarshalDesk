"use client";

import type {
  ConversationDetail,
  ConversationSummary,
} from "@marshaldesk/shared";
import { InfoIcon, PanelRightCloseIcon } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  type Layout,
  type LayoutChangedMeta,
  usePanelRef,
} from "react-resizable-panels";
import { ConversationDetails } from "@/components/inbox/conversation-details";
import { ConversationList } from "@/components/inbox/conversation-list";
import { ConversationPane } from "@/components/inbox/conversation-pane";
import { InboxClockProvider } from "@/components/inbox/inbox-clock";
import {
  useConversationDetail,
  useConversations,
} from "@/components/inbox/use-inbox";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MOBILE_QUERY, useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { INBOX_LAYOUT_COOKIE } from "@/lib/inbox/layout-cookie";
import { visitorLabel } from "@/lib/inbox/format";
import { inboxRoute } from "@/lib/routes";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function saveLayout(layout: Layout, meta: LayoutChangedMeta) {
  // A phone mounts the desktop panes for one render before the mobile view
  // takes over. That squeezed layout mustn't reach the cookie desktop reads.
  if (window.matchMedia(MOBILE_QUERY).matches) return;
  const value = encodeURIComponent(
    JSON.stringify(meta.requestedLayout ?? layout),
  );
  document.cookie = `${INBOX_LAYOUT_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

type OpenConversation = {
  requestedId: string | undefined;
  /** The freshest copy: the detail once loaded, else the list's summary. */
  conversation: ConversationSummary | null;
  detail: ConversationDetail | undefined;
  loading: boolean;
};

export function Inbox({
  initialNow,
  defaultLayout,
}: {
  initialNow: number;
  defaultLayout: Layout | undefined;
}) {
  return (
    <InboxClockProvider initialNow={initialNow}>
      <TooltipProvider>
        <InboxPanes defaultLayout={defaultLayout} />
      </TooltipProvider>
      <Toaster position="top-center" />
    </InboxClockProvider>
  );
}

function useOpenConversation(
  requestedId: string | undefined,
): OpenConversation {
  const conversations = useConversations();
  const summary =
    conversations.find((conversation) => conversation.id === requestedId) ??
    null;
  const query = useConversationDetail(requestedId, summary);
  return {
    requestedId,
    conversation: query.data ?? summary,
    detail: query.data,
    loading: query.isPending && query.fetchStatus !== "idle",
  };
}

function InboxPanes({ defaultLayout }: { defaultLayout: Layout | undefined }) {
  const params = useParams<{ conversationId?: string }>();
  const searchParams = useSearchParams();
  const selectedId = params.conversationId;
  const filterValue = searchParams.get("state");
  const open = useOpenConversation(selectedId);
  const [search, setSearch] = useState("");
  const isMobile = useIsMobile();

  const list = (
    <ConversationList
      selectedId={selectedId}
      filterValue={filterValue}
      search={search}
      onSearchChange={setSearch}
    />
  );

  if (isMobile) {
    return selectedId ? (
      <MobileConversation
        open={open}
        backHref={inboxRoute({ state: filterValue ?? undefined })}
      />
    ) : (
      list
    );
  }

  return <DesktopPanes defaultLayout={defaultLayout} list={list} open={open} />;
}

function DesktopPanes({
  defaultLayout,
  list,
  open,
}: {
  defaultLayout: Layout | undefined;
  list: ReactNode;
  open: OpenConversation;
}) {
  const { conversation } = open;
  const detailsRef = usePanelRef();
  const [detailsOpen, setDetailsOpen] = useState(defaultLayout?.details !== 0);

  function toggleDetails() {
    const panel = detailsRef.current;
    if (!panel) return;
    if (panel.isCollapsed()) {
      panel.expand();
    } else {
      panel.collapse();
    }
  }

  return (
    <div className="h-full p-3">
      <ResizablePanelGroup
        id="inbox"
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={saveLayout}
      >
        <ResizablePanel id="list" defaultSize="30" minSize="280px" maxSize="45">
          <PaneCard>{list}</PaneCard>
        </ResizablePanel>
        <PaneHandle />
        <ResizablePanel id="conversation" defaultSize="46" minSize="360px">
          <PaneCard>
            <ConversationPane
              conversation={conversation}
              detail={open.detail}
              loading={open.loading}
              requestedId={open.requestedId}
              details={{ open: detailsOpen, toggle: toggleDetails }}
            />
          </PaneCard>
        </ResizablePanel>
        <PaneHandle />
        <ResizablePanel
          id="details"
          panelRef={detailsRef}
          defaultSize="24"
          minSize="240px"
          maxSize="36"
          collapsible
          collapsedSize={0}
          onResize={(size) => setDetailsOpen(size.asPercentage > 0)}
        >
          <PaneCard className={cn(!detailsOpen && "ring-0")}>
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex h-14 shrink-0 items-center gap-2 border-b pr-2 pl-4">
                <h2 className="text-sm font-semibold tracking-[-0.01em]">
                  Details
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="ml-auto"
                  onClick={() => detailsRef.current?.collapse()}
                  aria-label="Hide details"
                >
                  <PanelRightCloseIcon />
                </Button>
              </div>
              {conversation ? (
                <ScrollArea className="min-h-0 flex-1">
                  <ConversationDetails conversation={conversation} />
                </ScrollArea>
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InfoIcon />
                    </EmptyMedia>
                    <EmptyTitle>No details yet</EmptyTitle>
                    <EmptyDescription>
                      Open a conversation to see where the visitor is and what
                      they&apos;re looking at.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </div>
          </PaneCard>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

/** The gap between cards is the drag target; the grip only shows on hover. */
function PaneHandle() {
  return (
    <ResizableHandle className="w-3 bg-transparent after:inset-y-[40%] after:w-1 after:rounded-full after:transition-colors hover:after:bg-foreground/20 focus-visible:ring-0 focus-visible:after:bg-brand/60" />
  );
}

function PaneCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10",
        className,
      )}
    >
      {children}
    </div>
  );
}

function MobileConversation({
  open,
  backHref,
}: {
  open: OpenConversation;
  backHref: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { conversation } = open;

  return (
    <>
      <ConversationPane
        conversation={conversation}
        detail={open.detail}
        loading={open.loading}
        requestedId={open.requestedId}
        backHref={backHref}
        details={{
          open: detailsOpen,
          toggle: () => setDetailsOpen((open) => !open),
        }}
      />
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-sm">
          <SheetHeader className="border-b">
            <SheetTitle>Details</SheetTitle>
            <SheetDescription>
              {conversation
                ? visitorLabel(conversation.visitor)
                : "No conversation"}
            </SheetDescription>
          </SheetHeader>
          {conversation ? (
            <ScrollArea className="min-h-0 flex-1">
              <ConversationDetails conversation={conversation} />
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
