"use client";

import { useRef, useState, useTransition, type DragEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import FileUploadOutlined from "@mui/icons-material/FileUploadOutlined";
import UploadFileOutlined from "@mui/icons-material/UploadFileOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import { importTrips } from "../trip-actions";

interface Props {
  contractId: string;
  /**
   * The page's primary action: extended FAB on phones, filled button on
   * desktop. Only one trigger per page should be primary; the others
   * render as tonal buttons.
   */
  primary?: boolean;
}

export function ImportTripsDialog({ contractId, primary = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <ResponsiveAction
        label="Import trips"
        icon={<FileUploadOutlined />}
        onClick={() => setOpen(true)}
        fabOnMobile={primary}
        variant={primary ? "contained" : "tonal"}
      />
      {open ? <ImportForm contractId={contractId} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
}

interface FormProps {
  contractId: string;
  onClose: () => void;
}

function ImportForm({ contractId, onClose }: FormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();

  function choose(next: File | null | undefined) {
    if (!next) return;
    if (!isCsv(next)) {
      toast.error("Not a CSV", `"${next.name}" must be a .csv export`);
      return;
    }
    setFile(next);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files?.[0]);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);

    startTransition(async () => {
      try {
        const res = await importTrips(contractId, fd);
        const imported = `${res.imported} trip${res.imported === 1 ? "" : "s"}`;
        const skipped = res.skipped
          ? `${res.skipped} duplicate${res.skipped === 1 ? "" : "s"} skipped`
          : undefined;
        if (res.imported === 0 && res.skipped > 0) {
          toast.info("Nothing new to import", skipped);
        } else {
          toast.success(`Imported ${imported}`, skipped ?? res.filename);
        }
        onClose();
      } catch (err) {
        toast.error("Import failed", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Import trip history"
      description="Upload your vehicle's trip-history CSV. Re-uploading is safe — trips already recorded are skipped."
      onSubmit={onSubmit}
      submitLabel="Import"
      pending={pending}
      submitDisabled={!file}
      maxWidth="xs"
    >
      <Stack spacing={2}>
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 1.5,
            px: 2,
            py: 4,
            borderRadius: 3,
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "m3.outline",
            bgcolor: dragging ? "m3.primaryContainer" : "m3.surfaceContainerLow",
            color: dragging ? "m3.onPrimaryContainer" : "text.secondary",
            transition: "background-color 150ms, border-color 150ms",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {file ? (
            <>
              <DescriptionOutlined sx={{ fontSize: 40, color: "primary.main" }} />
              <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
                <Typography variant="subtitle1" color="text.primary" sx={{ overflowWrap: "anywhere" }}>
                  {file.name}
                </Typography>
                <Typography variant="caption" className="tabular">
                  {formatSize(file.size)}
                </Typography>
              </Box>
              <Button variant="text" size="small" onClick={() => inputRef.current?.click()} disabled={pending}>
                Change file
              </Button>
            </>
          ) : (
            <>
              <UploadFileOutlined sx={{ fontSize: 40 }} />
              <Typography variant="body2">Drag a CSV here, or</Typography>
              <Button variant="tonal" onClick={() => inputRef.current?.click()} disabled={pending}>
                Choose CSV
              </Button>
            </>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          The export with Start/End ODO, dates and Lat/Lon columns.
        </Typography>
      </Stack>
    </FormDialog>
  );
}
