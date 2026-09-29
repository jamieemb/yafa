"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import EditOutlined from "@mui/icons-material/EditOutlined";
import { toast } from "@/components/toast";
import { FormDialog } from "@/components/form-dialog";
import { ResponsiveAction } from "@/components/responsive-action";
import {
  IMPORTANCE_LEVELS,
  IMPORTANCE_LABELS,
  type ImportanceLevel,
} from "@/lib/categories";
import { formatGBP } from "@/lib/money";
import { createPerson, updatePerson } from "../actions";

export interface PersonInitial {
  id: string;
  name: string;
  importance: string;
  birthday: Date | null;
  notes: string | null;
}

export type GiftAmounts = Record<ImportanceLevel, number>;

interface Props {
  /** When set, the dialog edits this person and the trigger is an edit icon. */
  initial?: PersonInitial;
  /** Tier budgets from settings, shown on each importance option. */
  giftAmounts: GiftAmounts;
  /** For the create trigger: render as a FAB on phones (default) or a plain button. */
  fabOnMobile?: boolean;
}

export function PersonDialog({ initial, giftAmounts, fabOnMobile = true }: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(initial);

  return (
    <>
      {isEdit ? (
        <Tooltip title={`Edit ${initial!.name}`}>
          <IconButton size="small" aria-label={`Edit ${initial!.name}`} onClick={() => setOpen(true)}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <ResponsiveAction label="New person" onClick={() => setOpen(true)} fabOnMobile={fabOnMobile} />
      )}
      {open ? (
        <PersonForm initial={initial} giftAmounts={giftAmounts} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

interface FormProps {
  initial?: PersonInitial;
  giftAmounts: GiftAmounts;
  onClose: () => void;
}

function PersonForm({ initial, giftAmounts, onClose }: FormProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [importance, setImportance] = useState<ImportanceLevel>(
    (initial?.importance as ImportanceLevel | undefined) ?? "MEDIUM",
  );
  const [birthday, setBirthday] = useState(dateInputValue(initial?.birthday));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [pending, startTransition] = useTransition();

  const valid = name.trim().length > 0;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!valid) return;
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("importance", importance);
    fd.set("birthday", birthday);
    fd.set("notes", notes.trim());

    startTransition(async () => {
      try {
        if (initial) {
          await updatePerson(initial.id, fd);
          toast.success("Updated", name.trim());
        } else {
          await createPerson(fd);
          toast.success("Added", name.trim());
        }
        onClose();
      } catch (err) {
        toast.error("Could not save", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <FormDialog
      open
      onClose={onClose}
      title={isEdit ? "Edit person" : "New person"}
      description="Importance drives the default gift budget. Add a birthday and it shows up on the calendar every year."
      onSubmit={onSubmit}
      submitLabel={isEdit ? "Save" : "Add"}
      pending={pending}
      submitDisabled={!valid}
    >
      <Stack spacing={2.5}>
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
          placeholder="e.g. Mum, Sarah"
          slotProps={{ htmlInput: { maxLength: 120 } }}
        />

        <Box>
          <Typography
            id="person-importance-label"
            variant="overline"
            component="p"
            color="text.secondary"
            sx={{ mb: 1, mx: 2 }}
          >
            Importance
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={importance}
            onChange={(_, v: ImportanceLevel | null) => {
              if (v) setImportance(v);
            }}
            aria-labelledby="person-importance-label"
            sx={{
              // M3 segmented button: pill-shaped outer corners.
              "& .MuiToggleButtonGroup-firstButton": {
                borderTopLeftRadius: 20,
                borderBottomLeftRadius: 20,
              },
              "& .MuiToggleButtonGroup-lastButton": {
                borderTopRightRadius: 20,
                borderBottomRightRadius: 20,
              },
            }}
          >
            {IMPORTANCE_LEVELS.map((lvl) => (
              <ToggleButton
                key={lvl}
                value={lvl}
                sx={{ flexDirection: "column", gap: 0.25, py: 1, lineHeight: 1.25 }}
              >
                <span>{IMPORTANCE_LABELS[lvl]}</span>
                <Typography
                  component="span"
                  variant="caption"
                  className="tabular"
                  sx={{ color: "inherit", opacity: 0.75 }}
                >
                  {formatGBP(giftAmounts[lvl])}
                </Typography>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <FormHelperText>
            Default gift budget {formatGBP(giftAmounts[importance])} ({IMPORTANCE_LABELS[importance]}{" "}
            tier). Tier amounts live in Settings.
          </FormHelperText>
        </Box>

        <TextField
          label="Birthday"
          type="date"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
          helperText="Optional — shows on the calendar every year"
          slotProps={{ inputLabel: { shrink: true } }}
        />

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          placeholder="Optional"
        />
      </Stack>
    </FormDialog>
  );
}
