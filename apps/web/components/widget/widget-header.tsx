import { ChevronDownIcon } from "lucide-react";
import { WidgetAvatar } from "./widget-avatar";

export function WidgetHeader({
  agentName,
  agentAvatarUrl,
  status,
  onClose,
}: {
  agentName: string;
  agentAvatarUrl: string;
  status: string | null;
  onClose?: () => void;
}) {
  return (
    <header className="flex shrink-0 items-center gap-3 bg-(--widget-accent) px-4 py-3.5 text-(--widget-accent-foreground)">
      <WidgetAvatar
        name={agentName}
        src={agentAvatarUrl}
        className="size-10 ring-2 ring-(--widget-accent-foreground)/25"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-display text-lg leading-tight tracking-[-0.03em]">
          {agentName}
        </p>
        {status ? (
          <p className="flex items-center gap-1.5 truncate text-xs leading-tight opacity-85">
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-current"
            />
            {status}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close chat"
        className="-mr-1 flex size-8 items-center justify-center rounded-lg transition-colors outline-none hover:bg-(--widget-accent-foreground)/15 focus-visible:ring-2 focus-visible:ring-(--widget-accent-foreground)/60"
      >
        <ChevronDownIcon className="size-5" aria-hidden />
      </button>
    </header>
  );
}
