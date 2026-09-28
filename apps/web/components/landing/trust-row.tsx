import { Avatar, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { trust } from "./content";

const lift = [
  "group-hover/trust:-translate-y-0.5",
  "group-hover/trust:-translate-y-1",
  "group-hover/trust:-translate-y-0.5",
];
const stack = ["z-1", "z-2", "z-4"];

export function TrustRow() {
  return (
    <AvatarGroup className="group/trust mb-[clamp(16px,2.5vh,26px)] animate-reveal items-center -space-x-[calc(var(--trust-size)*0.42)] [--trust-size:clamp(36px,4.5vw,42px)] [animation-delay:0.05s] *:data-[slot=avatar]:ring-0 motion-reduce:animate-none max-xs:[--trust-size:34px] [@media(max-height:700px)]:mb-3">
      {trust.logos.map((logo, i) => (
        <Avatar
          key={logo.label}
          className={`size-(--trust-size) border border-ink-line bg-ink p-[5px] transition-transform duration-350 ease-out-expo after:hidden ${stack[i]} ${lift[i]}`}
        >
          <AvatarFallback
            aria-label={logo.label}
            className="bg-white text-[calc(var(--trust-size)*0.34)] text-[#111] [&_svg]:size-[1em]"
          >
            {logo.icon}
          </AvatarFallback>
        </Avatar>
      ))}
      <Badge
        variant="outline"
        className="relative z-3 h-(--trust-size) rounded-full border-ink-line bg-ink pr-4 pl-[calc(var(--trust-size)*0.58)] text-[clamp(12px,1.4vw,13.5px)] font-medium text-ink-muted max-nav:text-xs"
      >
        {trust.label}
      </Badge>
    </AvatarGroup>
  );
}
