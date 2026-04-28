import Link from "next/link";
import { Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  slug: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedTime: string;
  className?: string;
}

const difficultyColors = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export function RecipeCard({
  slug,
  title,
  description,
  difficulty,
  estimatedTime,
  className,
}: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${slug}`}
      className={cn(
        "group flex flex-col p-5 border border-border rounded-lg bg-card hover:border-primary/50 hover:bg-accent/30 transition-all",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-semibold text-base group-hover:text-primary transition-colors">
          {title}
        </h3>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
      </div>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-1">
        {description}
      </p>
      <div className="flex items-center gap-3 text-xs">
        <span
          className={cn(
            "px-2 py-0.5 rounded font-medium capitalize",
            difficultyColors[difficulty]
          )}
        >
          {difficulty}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          {estimatedTime}
        </span>
      </div>
    </Link>
  );
}
