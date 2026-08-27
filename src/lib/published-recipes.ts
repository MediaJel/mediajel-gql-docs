import listCampaigns from "@/content/recipes/list-campaigns.json";
import organizations from "@/content/recipes/organizations.json";
import displayRollup from "@/content/recipes/display-rollup.json";
import orgSummary from "@/content/recipes/org-summary.json";

/**
 * The recipes the docs publish, in sidebar order.
 *
 * campaign-performance, campaign-attribution, device-analytics and analytics are
 * withheld: each walkthrough is built on an operation a customer key cannot call
 * (see the allowlist in `public-operations.ts`), so the steps cannot be
 * completed as written. Their JSON is still in `src/content/recipes/` — add the
 * import back here to republish one.
 *
 * The recipes index, the recipe routes and the sidebar all read this list, so a
 * published recipe cannot end up linked from one place and missing from another.
 */
export const PUBLISHED_RECIPES = [
  listCampaigns,
  organizations,
  displayRollup,
  orgSummary,
] as const;

export const PUBLISHED_RECIPE_SLUGS: readonly string[] =
  PUBLISHED_RECIPES.map((r) => r.slug);
