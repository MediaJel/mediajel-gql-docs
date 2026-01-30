import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "query" | "mutation" | "required" | "optional";
  className?: string;
}

const variantStyles = {
  default: "bg-muted text-muted-foreground",
  query: "bg-green-100 text-green-800",
  mutation: "bg-purple-100 text-purple-800",
  required: "bg-red-100 text-red-800",
  optional: "bg-gray-100 text-gray-600",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
