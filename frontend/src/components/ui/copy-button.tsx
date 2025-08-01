import { Copy } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CopyButton({
  text,
  variant = "button",
}: {
  text: string;
  variant?: "icon" | "button";
}) {
  const [, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Text copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Button
      size="sm"
      variant={"outline"}
      onClick={handleCopy}
      className={cn("shrink-0", {
        "px-0! py-0! bg-transparent! border-0!": variant === "icon",
      })}
    >
      <Copy className="h-3! w-3!" />
    </Button>
  );
}
