import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function WidgetAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src: string;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-7", className)}>
      <AvatarImage src={src} alt="" />
      <AvatarFallback className="text-xs">
        {name.trim().charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
