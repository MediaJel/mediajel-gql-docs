import { RecipeCard } from "@/components/recipes/recipe-card";
import { BookOpen } from "lucide-react";

import campaignPerformance from "@/content/recipes/campaign-performance.json";
import listCampaigns from "@/content/recipes/list-campaigns.json";
import analytics from "@/content/recipes/analytics.json";
import organizations from "@/content/recipes/organizations.json";
import displayRollup from "@/content/recipes/display-rollup.json";
import campaignAttribution from "@/content/recipes/campaign-attribution.json";
import deviceAnalytics from "@/content/recipes/device-analytics.json";
import orgSummary from "@/content/recipes/org-summary.json";

const recipes = [
  campaignPerformance,
  listCampaigns,
  analytics,
  organizations,
  displayRollup,
  campaignAttribution,
  deviceAnalytics,
  orgSummary,
] as const;

export default function RecipesPage() {
  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center gap-3 mb-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Recipes</h1>
      </div>
      <p className="text-muted-foreground mb-8">
        Step-by-step guides for common tasks. Each recipe walks you through a
        specific use case with working code examples.
      </p>

      {/* Filter by difficulty */}
      <div className="flex gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
          All
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
          Beginner
        </span>
        <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
          Intermediate
        </span>
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <RecipeCard
            key={recipe.slug}
            slug={recipe.slug}
            title={recipe.title}
            description={recipe.description}
            difficulty={recipe.difficulty as "beginner" | "intermediate"}
            estimatedTime={recipe.estimatedTime}
          />
        ))}
      </div>

      {/* Help section */}
      <div className="mt-12 border-t border-border pt-8">
        <h2 className="font-semibold mb-3">Need a recipe we don&apos;t have?</h2>
        <p className="text-sm text-muted-foreground">
          Check the{" "}
          <a href="/schema" className="text-primary hover:underline">
            API Reference
          </a>{" "}
          for all available operations, or ask our{" "}
          <a href="/assistant" className="text-primary hover:underline">
            AI Assistant
          </a>{" "}
          to help build a custom query.
        </p>
      </div>
    </div>
  );
}
