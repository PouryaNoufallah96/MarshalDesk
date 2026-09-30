"use client";

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
import {
  type InboxAgent,
  InboxStoreProvider,
  useConversation,
} from "@/components/inbox/inbox-store";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { INBOX_LAYOUT_COOKIE } from "@/lib/inbox/layout-cookie";
import { visitorLabel } from "@/lib/inbox/format";
import type { Conversation } from "@/lib/inbox/types";
import { inboxRoute } from "@/lib/routes";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function saveLayout(layout: Layout, meta: LayoutChangedMeta) {
  const value = encodeURIComponent(
    JSON.stringify(meta.requestedLayout ?? layout),
  );
  document.cookie = `${INBOX_LAYOUT_COOKIE}=${value}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
}

export function Inbox({
  initialNow,
  agent,
  defaultLayout,
}: {
  initialNow: number;
  agent: InboxAgent;
  defaultLayout: Layout | undefined;
}) {
  return (
    <InboxStoreProvider initialNow={initialNow} agent={agent}>
      <TooltipProvider>
        <InboxPanes defaultLayout={defaultLayout} />
      </TooltipProvider>
    </InboxStoreProvider>
  );
}

function InboxPanes({ defaultLayout }: { defaultLayout: Layout | undefined }) {
  const params = useParams<{ conversationId?: string }>();
  const searchParams = useSearchParams();
  const selectedId = params.conversationId;
  const filterValue = searchParams.get("state");
  const conversation = useConversation(selectedId);
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
        conversation={conversation}
        requestedId={selectedId}
        backHref={inboxRoute({ state: filterValue ?? undefined })}
      />
    ) : (
      list
    );
  }

  return (
    <DesktopPanes
      defaultLayout={defaultLayout}
      list={list}
      conversation={conversation}
      requestedId={selectedId}
    />
  );
}

function DesktopPanes({
  defaultLayout,
  list,
  conversation,
  requestedId,
}: {
  defaultLayout: Layout | undefined;
  list: ReactNode;
  conversation: Conversation | null;
  requestedId: string | undefined;
}) {
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
              requestedId={requestedId}
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
  conversation,
  requestedId,
  backHref,
}: {
  conversation: Conversation | null;
  requestedId: string;
  backHref: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <ConversationPane
        conversation={conversation}
        requestedId={requestedId}
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
