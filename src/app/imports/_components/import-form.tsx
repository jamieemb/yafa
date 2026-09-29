"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { toast } from "@/components/toast";
import {
  STATEMENT_SOURCES,
  STATEMENT_SOURCE_LABELS,
  type StatementSource,
} from "@/lib/categories";
import { importStatement } from "../actions";

// Short names for the segmented control so all three fit at 375px.
const SHORT_LABELS: Record<StatementSource, string> = {
  NATWEST: "NatWest",
  AMEX: "Amex",
  MONZO: "Monzo",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<StatementSource>("NATWEST");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    // Field names match what importStatement() reads.
    const formData = new FormData();
    formData.set("source", source);
    formData.set("file", file);

    startTransition(async () => {
      try {
        const outcome = await importStatement(formData);
        if (!outcome.ok) {
          toast.error("Import failed", outcome.error);
          return;
        }
        const { result } = outcome;
        const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
        const parts: string[] = [];
        if (result.skipped) parts.push(`${plural(result.skipped, "duplicate")} skipped`);
        if (result.payments) parts.push(`${plural(result.payments, "payment")} hidden`);
        if (result.refunds) parts.push(plural(result.refunds, "refund"));
        if (result.autoCategorised) parts.push(`${result.autoCategorised} auto-categorised`);
        if (result.needsReview) parts.push(`${result.needsReview} need review`);
        toast.success(
          `Imported ${plural(result.imported, "transaction")}`,
          parts.length > 0
            ? parts.join(" · ")
            : `${STATEMENT_SOURCE_LABELS[result.source]} · ${result.filename}`,
        );
        clearFile();
      } catch {
        // importStatement returns expected failures as data, so reaching
        // here means the request itself failed before the action ran —
        // most commonly the file exceeding the Server Action upload
        // limit, or the server being unreachable.
        toast.error(
          "Import request failed",
          "The file may be too large, or the server is unreachable.",
        );
      }
    });
  }

  return (
    <Card component="section" aria-labelledby="import-form-title">
      <CardContent>
        <form onSubmit={onSubmit} noValidate>
          <Stack spacing={2.5}>
            <Box>
              <Typography id="import-form-title" variant="h5" component="h2">
                Import a statement
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pick the provider, then drop the CSV you downloaded from its website or app.
              </Typography>
            </Box>

            <Box>
              <Typography variant="overline" component="p" color="text.secondary" sx={{ mb: 0.5 }}>
                Provider
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                value={source}
                onChange={(_, v: StatementSource | null) => {
                  if (v) setSource(v);
                }}
                aria-label="Statement provider"
                disabled={pending}
              >
                {STATEMENT_SOURCES.map((s) => (
                  <ToggleButton key={s} value={s} aria-label={STATEMENT_SOURCE_LABELS[s]}>
                    {SHORT_LABELS[s]}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>

            {/* Drop zone */}
            <Box
              onDragOver={(e) => {
                e.preventDefault();
                if (!dragging) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              sx={{
                border: "2px dashed",
                borderColor: dragging ? "primary.main" : "m3.outline",
                borderRadius: 3,
                bgcolor: dragging ? "m3.secondaryContainer" : "m3.surface",
                transition: "background-color 150ms, border-color 150ms",
                p: 3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 1.5,
              }}
            >
              <input
                ref={inputRef}
                type="file"
                name="file"
                accept=".csv,text/csv"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <>
                  <DescriptionOutlined sx={{ fontSize: 40, color: "primary.main" }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 0, maxWidth: "100%" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ overflowWrap: "anywhere" }}>
                        {file.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="tabular">
                        {formatBytes(file.size)}
                      </Typography>
                    </Box>
                    <Tooltip title="Remove file">
                      <IconButton size="small" aria-label="Remove file" onClick={clearFile} disabled={pending}>
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </>
              ) : (
                <>
                  <UploadFileOutlined sx={{ fontSize: 40, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    Drag a CSV here, or choose one from your device.
                  </Typography>
                </>
              )}
              <Button
                variant="tonal"
                onClick={() => inputRef.current?.click()}
                disabled={pending}
                startIcon={<UploadFileOutlined />}
              >
                {file ? "Choose a different CSV" : "Choose CSV"}
              </Button>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: { xs: "stretch", sm: "center" },
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Duplicates are skipped and your category rules are applied automatically. Sample
                files to try live in the repo&apos;s <code>samples/</code> folder (
                <code>sample-natwest.csv</code>, <code>sample-amex.csv</code>, <code>sample-monzo.csv</code>).
              </Typography>
              <Button
                type="submit"
                variant="contained"
                disabled={pending || !file}
                sx={{ flexShrink: 0 }}
              >
                {pending ? "Importing…" : "Import"}
              </Button>
            </Box>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
