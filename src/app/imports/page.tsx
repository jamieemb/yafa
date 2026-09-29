import { format } from "date-fns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { prisma } from "@/lib/db";
import { STATEMENT_SOURCE_LABELS, type StatementSource } from "@/lib/categories";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { Kpi, KpiGrid } from "@/components/kpi";
import { EmptyState } from "@/components/empty-state";
import { DataList, Meta } from "@/components/data-list";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { ImportForm } from "./_components/import-form";
import { deleteImport } from "./actions";

export const dynamic = "force-dynamic";

type ImportRow = Awaited<ReturnType<typeof prisma.statementImport.findMany>>[number];

function sourceLabel(source: string): string {
  return STATEMENT_SOURCE_LABELS[source as StatementSource] ?? source;
}

export default async function ImportsPage() {
  const imports = await prisma.statementImport.findMany({
    orderBy: { importedAt: "desc" },
    take: 50,
  });

  const totalImports = imports.length;
  const totalRows = imports.reduce((acc, i) => acc + i.transactionCount, 0);

  return (
    <>
      <PageHeader
        eyebrow="Data"
        title="Imports"
        description="Drop a NatWest, Amex, or Monzo CSV. Duplicates skipped, rules applied automatically."
      />

      <KpiGrid columns={2}>
        <Kpi label="Imports" value={String(totalImports)} sub="Most recent 50" />
        <Kpi label="Rows" value={String(totalRows)} sub="Transactions brought in" />
      </KpiGrid>

      <ImportForm />

      <Box component="section" aria-label="Recent imports">
        <SectionHeader eyebrow="Audit" title="Recent imports" />
        {imports.length === 0 ? (
          <EmptyState
            icon={<UploadFileOutlined fontSize="inherit" />}
            title="No imports yet"
            description="Import a statement above and it will be listed here with a count of the transactions it brought in."
          />
        ) : (
          <Card>
            <DataList<ImportRow>
              rows={imports}
              getKey={(r) => r.id}
              columns={[
                {
                  id: "imported",
                  header: "Imported",
                  nowrap: true,
                  numeric: true,
                  render: (r) => (
                    <Typography variant="body2" color="text.secondary" component="span">
                      {format(r.importedAt, "d MMM yy, HH:mm")}
                    </Typography>
                  ),
                },
                {
                  id: "source",
                  header: "Provider",
                  nowrap: true,
                  render: (r) => <Chip size="small" variant="outlined" label={sourceLabel(r.source)} />,
                },
                {
                  id: "file",
                  header: "File",
                  render: (r) => (
                    <Typography variant="body2" component="span" sx={{ overflowWrap: "anywhere" }}>
                      {r.filename}
                    </Typography>
                  ),
                },
                {
                  id: "count",
                  header: "Transactions",
                  align: "right",
                  numeric: true,
                  render: (r) => (
                    <Typography variant="body2" component="span" sx={{ fontWeight: 500 }}>
                      {r.transactionCount}
                    </Typography>
                  ),
                },
              ]}
              mobile={{
                title: (r) => r.filename,
                meta: (r) => (
                  <Meta>
                    {sourceLabel(r.source)}
                    {format(r.importedAt, "d MMM yy, HH:mm")}
                  </Meta>
                ),
                value: (r) => String(r.transactionCount),
                valueSub: (r) => (r.transactionCount === 1 ? "transaction" : "transactions"),
              }}
              actions={(r) => (
                <ConfirmDeleteButton
                  label={`Delete import ${r.filename}`}
                  heading="Delete import?"
                  description={`This will remove “${r.filename}” and the ${r.transactionCount} transaction${
                    r.transactionCount === 1 ? "" : "s"
                  } it brought in. This can't be undone.`}
                  successMessage="Import deleted"
                  onConfirm={deleteImport.bind(null, r.id)}
                />
              )}
            />
          </Card>
        )}
      </Box>
    </>
  );
}
