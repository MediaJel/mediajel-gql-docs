import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getOperationsByCategory,
  getOperation,
} from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { OperationDetail } from "@/components/schema/operation-detail";

interface OperationPageProps {
  params: { category: string; operation: string };
}

export function generateStaticParams() {
  const categories = getCategories();
  const params: { category: string; operation: string }[] = [];

  for (const cat of categories) {
    const ops = getOperationsByCategory(cat.id);
    for (const op of ops) {
      params.push({ category: cat.id, operation: op.name });
    }
  }

  return params;
}

export default function OperationPage({ params }: OperationPageProps) {
  const operation = getOperation(params.operation);
  const categories = getCategories();
  const category = categories.find((c) => c.id === params.category);

  if (!operation || !category) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="mb-2 flex items-center gap-2 text-sm">
        <Link
          href="/schema"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          API Reference
        </Link>
        <span className="text-muted-foreground">/</span>
        <Link
          href={`/schema/${params.category}`}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {category.name}
        </Link>
        <span className="text-muted-foreground">/</span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <Badge variant={operation.type === "query" ? "query" : "mutation"}>
          {operation.type}
        </Badge>
        <h1 className="text-3xl font-bold font-mono">{operation.name}</h1>
      </div>
      <p className="text-muted-foreground mb-8">{operation.description}</p>

      <OperationDetail operation={operation} />
    </div>
  );
}
