import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getOperationsByCategory } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";

interface CategoryPageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return getCategories().map((cat) => ({ category: cat.id }));
}

export default function CategoryPage({ params }: CategoryPageProps) {
  const categories = getCategories();
  const category = categories.find((c) => c.id === params.category);

  if (!category) {
    notFound();
  }

  const operations = getOperationsByCategory(params.category);

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-2">
        <Link
          href="/schema"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          API Reference
        </Link>
        <span className="text-sm text-muted-foreground mx-2">/</span>
      </div>
      <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
      <p className="text-muted-foreground mb-8">{category.description}</p>

      <div className="space-y-4">
        {operations.map((op) => (
          <Link
            key={op.name}
            href={`/schema/${params.category}/${op.name}`}
            className="group block border border-border rounded-lg p-5 hover:border-primary/50 hover:bg-accent/30 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <Badge variant={op.type === "query" ? "query" : "mutation"}>
                {op.type}
              </Badge>
              <h3 className="font-mono font-semibold">{op.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {op.description}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                {op.args.length} argument{op.args.length !== 1 ? "s" : ""}
              </span>
              <span>
                Returns: <code className="font-mono">{op.returnType}</code>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
