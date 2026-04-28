import { format } from "date-fns";
import { prisma } from "@/lib/db";
import {
  STATEMENT_SOURCE_LABELS,
  type StatementSource,
} from "@/lib/categories";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Kpi } from "@/components/kpi";
import { ImportForm } from "./_components/import-form";
import { DeleteImportButton } from "./_components/delete-import-button";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  const imports = await prisma.statementImport.findMany({
    orderBy: { importedAt: "desc" },
    take: 50,
  });

  const totalImports = imports.length;
  const totalRows = imports.reduce((acc, i) => acc + i.transactionCount, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <p className="label-eyebrow">Data</p>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] mt-1">
            Imports
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5">
            Drop a NatWest, Amex, or Monzo CSV. Duplicates skipped, rules
            applied automatically.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 min-w-[280px]">
          <Kpi label="Imports" value={String(totalImports)} />
          <Kpi label="Rows" value={String(totalRows)} />
        </div>
      </div>

      <ImportForm />

      <section>
        <div className="flex items-end justify-between gap-3 border-b pb-3">
          <div>
            <p className="label-eyebrow">Audit</p>
            <h2 className="text-sm font-semibold mt-0.5">Recent imports</h2>
          </div>
        </div>
        {imports.length === 0 ? (
          <div className="mt-5 rounded-md border border-dashed p-12 text-center">
            <p className="text-sm text-muted-foreground">No imports yet.</p>
          </div>
        ) : (
          <div className="mt-5 rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  <TableHead className="h-9">Imported</TableHead>
                  <TableHead className="h-9">Provider</TableHead>
                  <TableHead className="h-9">File</TableHead>
                  <TableHead className="h-9 text-right">Transactions</TableHead>
                  <TableHead className="h-9" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground tabular-nums text-[12px]">
                      {format(row.importedAt, "d MMM yy, HH:mm")}
                    </TableCell>
                    <TableCell className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {STATEMENT_SOURCE_LABELS[row.source as StatementSource] ??
                        row.source}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">
                      {row.filename}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono text-[13px]">
                      {row.transactionCount}
                    </TableCell>
                    <TableCell className="text-right">
                      <DeleteImportButton
                        id={row.id}
                        filename={row.filename}
                        transactionCount={row.transactionCount}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

