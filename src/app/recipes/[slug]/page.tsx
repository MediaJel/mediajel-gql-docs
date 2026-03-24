import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Lightbulb } from "lucide-react";
import { RecipeStep } from "@/components/recipes/recipe-step";
import { TryInPlaygroundButton } from "@/components/recipes/try-in-playground-button";

import campaignPerformance from "@/content/recipes/campaign-performance.json";
import listCampaigns from "@/content/recipes/list-campaigns.json";
import analytics from "@/content/recipes/analytics.json";
import organizations from "@/content/recipes/organizations.json";
import displayRollup from "@/content/recipes/display-rollup.json";
import campaignAttribution from "@/content/recipes/campaign-attribution.json";
import deviceAnalytics from "@/content/recipes/device-analytics.json";
import orgSummary from "@/content/recipes/org-summary.json";

interface RecipeStep {
  title: string;
  description: string;
  type: string;
  query?: string;
  variables?: Record<string, unknown>;
  tip?: string;
}

interface Recipe {
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  prerequisites: { label: string; link: string }[];
  steps: RecipeStep[];
  tips: string[];
  relatedRecipes: string[];
}

const recipesMap: Record<string, Recipe> = {
  "campaign-performance": campaignPerformance as Recipe,
  "list-campaigns": listCampaigns as Recipe,
  analytics: analytics as Recipe,
  organizations: organizations as Recipe,
  "display-rollup": displayRollup as Recipe,
  "campaign-attribution": campaignAttribution as Recipe,
  "device-analytics": deviceAnalytics as Recipe,
  "org-summary": orgSummary as Recipe,
};

const difficultyColors = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

export function generateStaticParams() {
  return Object.keys(recipesMap).map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Extract the first query from recipe steps
function getFirstQuery(recipe: Recipe): {
  query: string;
  variables: Record<string, unknown>;
} | null {
  for (const step of recipe.steps) {
    if (step.type === "query" && step.query) {
      return {
        query: step.query,
        variables: step.variables || {},
      };
    }
  }
  return null;
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = recipesMap[slug];

  if (!recipe) {
    notFound();
  }

  const firstQuery = getFirstQuery(recipe);

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      {/* Back link */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All Recipes
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{recipe.title}</h1>
        <p className="text-muted-foreground mb-4">{recipe.description}</p>
        <div className="flex items-center gap-4 text-sm">
          <span
            className={`px-2 py-0.5 rounded font-medium capitalize ${
              difficultyColors[recipe.difficulty as keyof typeof difficultyColors]
            }`}
          >
            {recipe.difficulty}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {recipe.estimatedTime}
          </span>
        </div>
      </div>

      {/* Prerequisites */}
      {recipe.prerequisites && recipe.prerequisites.length > 0 && (
        <div className="mb-8 border border-border rounded-lg p-4 bg-muted/30">
          <h2 className="font-semibold text-sm mb-3">Before you start</h2>
          <ul className="space-y-2">
            {recipe.prerequisites.map((prereq, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <Link
                  href={prereq.link}
                  className="text-primary hover:underline"
                >
                  {prereq.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      <div className="space-y-8 mb-10">
        {recipe.steps.map((step, i) => (
          <RecipeStep
            key={i}
            stepNumber={i + 1}
            title={step.title}
            description={step.description}
            type={step.type as "instruction" | "query"}
            query={step.type === "query" ? (step as { query?: string }).query : undefined}
            variables={step.type === "query" ? (step as { variables?: Record<string, unknown> }).variables : undefined}
            tip={(step as { tip?: string }).tip}
          />
        ))}
      </div>

      {/* Tips section */}
      {recipe.tips && recipe.tips.length > 0 && (
        <div className="mb-10 border border-amber-100 rounded-lg p-5 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-sm text-amber-800">Pro Tips</h2>
          </div>
          <ul className="space-y-2">
            {recipe.tips.map((tip, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-amber-800"
              >
                <span className="text-amber-500 mt-1">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Try it section */}
      <div className="border border-border rounded-lg p-5 bg-card">
        <h2 className="font-semibold mb-3">Try it yourself</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {firstQuery
            ? "Open the playground with this recipe's query pre-loaded."
            : "Open the playground to start building queries."}
        </p>
        <div className="flex gap-3">
          <TryInPlaygroundButton
            query={firstQuery?.query}
            variables={firstQuery?.variables}
            hasQuery={!!firstQuery}
          />
          <Link
            href="/assistant"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-md hover:bg-accent"
          >
            Ask AI for help
          </Link>
        </div>
      </div>

      {/* Related recipes */}
      {recipe.relatedRecipes && recipe.relatedRecipes.length > 0 && (
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="font-semibold mb-3">Related Recipes</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.relatedRecipes.map((relatedSlug) => {
              const related = recipesMap[relatedSlug];
              if (!related) return null;
              return (
                <Link
                  key={relatedSlug}
                  href={`/recipes/${relatedSlug}`}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:border-primary/50 hover:bg-accent/50"
                >
                  {related.title}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
