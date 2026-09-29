"use client";

import { useId, useState, useTransition } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { toast } from "@/components/toast";

interface Props {
  /** Accessible label for the trigger, e.g. "Delete Netflix". */
  label: string;
  /** Dialog headline. Defaults to "Delete?" */
  heading?: string;
  /** What will be removed and any consequences. */
  description: string;
  /** Server action (or any async fn) to run on confirm. */
  onConfirm: () => Promise<void>;
  successMessage?: string;
  /** "icon" renders a trash icon button; "button" renders a text button. */
  variant?: "icon" | "button";
  buttonText?: string;
  /** Confirm button text, e.g. "Un-settle". Defaults to "Delete". */
  confirmText?: string;
  size?: "small" | "medium";
}

/**
 * Shared delete-with-confirmation control (M3 basic dialog). Pass a
 * bound server action:
 *   <ConfirmDeleteButton onConfirm={deleteItem.bind(null, id)} … />
 */
export function ConfirmDeleteButton({
  label,
  heading = "Delete?",
  description,
  onConfirm,
  successMessage = "Deleted",
  variant = "icon",
  buttonText = "Delete",
  confirmText = "Delete",
  size = "small",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  function confirm() {
    startTransition(async () => {
      try {
        await onConfirm();
        toast.success(successMessage);
        setOpen(false);
      } catch (err) {
        toast.error("Delete failed", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <>
      {variant === "icon" ? (
        <Tooltip title={label}>
          <IconButton size={size} aria-label={label} onClick={() => setOpen(true)}>
            <DeleteOutlineRounded fontSize={size === "small" ? "small" : "medium"} />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          color="error"
          size={size}
          startIcon={<DeleteOutlineRounded />}
          onClick={() => setOpen(true)}
        >
          {buttonText}
        </Button>
      )}
      <Dialog
        open={open}
        onClose={() => !pending && setOpen(false)}
        aria-labelledby={titleId}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle id={titleId}>{heading}</DialogTitle>
        <DialogContent>
          <DialogContentText>{description}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button color="error" onClick={confirm} disabled={pending} autoFocus>
            {pending ? `${confirmText.replace(/e$/, "")}ing…` : confirmText}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
