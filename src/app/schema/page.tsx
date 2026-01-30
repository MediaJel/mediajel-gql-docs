import Link from "next/link";
import {
  getCategories,
  getOperations,
  getAllTypes,
} from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Building2,
  Megaphone,
  ClipboardList,
} from "lucide-react";

const iconMap: Record<string, React.ReactNode> = {
  lock: <Lock className="h-5 w-5" />,
  building: <Building2 className="h-5 w-5" />,
  megaphone: <Megaphone className="h-5 w-5" />,
  "clipboard-list": <ClipboardList className="h-5 w-5" />,
};

export default function SchemaOverviewPage() {
  const categories = getCategories();
  const operations = getOperations();
  const types = getAllTypes();

  const queryCount = operations.filter((o) => o.type === "query").length;
  const mutationCount = operations.filter((o) => o.type === "mutation").length;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <h1 className="text-3xl font-bold mb-2">API Reference</h1>
      <p className="text-muted-foreground mb-8">
        The MediaJel GraphQL API provides {queryCount} queries and{" "}
        {mutationCount} mutations organized into the following categories.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-primary">{queryCount}</div>
          <div className="text-sm text-muted-foreground">Queries</div>
        </div>
        <div className="border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {mutationCount}
          </div>
          <div className="text-sm text-muted-foreground">Mutations</div>
        </div>
        <div className="border border-border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {types.length}
          </div>
          <div className="text-sm text-muted-foreground">Types</div>
        </div>
      </div>

      {/* Category cards */}
      <h2 className="text-xl font-semibold mb-4">Categories</h2>
      <div className="space-y-4 mb-10">
        {categories.map((cat) => {
          const catOps = operations.filter((o) => o.category === cat.id);
          return (
            <Link
              key={cat.id}
              href={`/schema/${cat.id}`}
              className="group flex items-start gap-4 border border-border rounded-lg p-5 hover:border-primary/50 hover:bg-accent/30 transition-all"
            >
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary flex-shrink-0">
                {iconMap[cat.icon] || <Lock className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-1">{cat.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {cat.description}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {catOps.map((op) => (
                    <Badge
                      key={op.name}
                      variant={op.type === "query" ? "query" : "mutation"}
                    >
                      {op.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-sm text-muted-foreground flex-shrink-0">
                {catOps.length} operations
              </div>
            </Link>
          );
        })}
      </div>

      {/* Types overview */}
      <h2 className="text-xl font-semibold mb-4">Types</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {types.map((t) => (
          <div
            key={t.name}
            className="border border-border rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-medium">{t.name}</span>
              <Badge>
                {t.kind === "OBJECT"
                  ? "type"
                  : t.kind === "INPUT_OBJECT"
                  ? "input"
                  : t.kind.toLowerCase()}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {t.fields
                ? `${t.fields.length} fields`
                : t.enumValues
                ? `${t.enumValues.length} values`
                : "scalar"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
