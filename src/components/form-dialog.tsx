"use client";

import type { ReactNode } from "react";
import AppBar from "@mui/material/AppBar";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Slide from "@mui/material/Slide";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloseRounded from "@mui/icons-material/CloseRounded";
import type { TransitionProps } from "@mui/material/transitions";
import { forwardRef } from "react";

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Called on submit; the children are rendered inside a <form>. */
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitLabel?: string;
  pending?: boolean;
  /** Text shown on the submit button while pending. Defaults to "Saving…". */
  pendingLabel?: string;
  /** Disable the submit button (e.g. invalid form). */
  submitDisabled?: boolean;
  children: ReactNode;
  /** Desktop dialog width. */
  maxWidth?: "xs" | "sm" | "md";
  /** Optional extra footer control on the left (e.g. a secondary action). */
  footerStart?: ReactNode;
}

/**
 * Form dialog that follows M3 guidance: a full-screen dialog with a
 * top app bar on phones, a standard dialog on larger screens. Children
 * are laid out in a form; use <Stack spacing={2.5}> inside.
 */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitLabel = "Save",
  pending = false,
  pendingLabel = "Saving…",
  submitDisabled = false,
  children,
  maxWidth = "sm",
  footerStart,
}: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const formId = `form-dialog-${title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Dialog
      open={open}
      onClose={() => !pending && onClose()}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={maxWidth}
      slots={fullScreen ? { transition: SlideUp } : undefined}
      aria-labelledby={`${formId}-title`}
    >
      {fullScreen ? (
        <AppBar position="sticky" color="default" elevation={0} enableColorOnDark>
          <Toolbar sx={{ gap: 1 }}>
            <IconButton edge="start" aria-label="Close" onClick={onClose} disabled={pending}>
              <CloseRounded />
            </IconButton>
            <Typography id={`${formId}-title`} variant="h6" component="h2" sx={{ flex: 1 }} noWrap>
              {title}
            </Typography>
            <Button type="submit" form={formId} variant="text" disabled={pending || submitDisabled}>
              {pending ? pendingLabel : submitLabel}
            </Button>
          </Toolbar>
        </AppBar>
      ) : (
        <DialogTitle id={`${formId}-title`}>{title}</DialogTitle>
      )}
      <DialogContent sx={{ pt: fullScreen ? 3 : 1 }}>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            {description}
          </Typography>
        ) : null}
        <form id={formId} onSubmit={onSubmit} noValidate>
          {children}
        </form>
      </DialogContent>
      {!fullScreen ? (
        <DialogActions sx={{ justifyContent: footerStart ? "space-between" : "flex-end" }}>
          {footerStart}
          <span>
            <Button onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              variant="contained"
              disabled={pending || submitDisabled}
              sx={{ ml: 1 }}
            >
              {pending ? pendingLabel : submitLabel}
            </Button>
          </span>
        </DialogActions>
      ) : footerStart ? (
        <DialogActions>{footerStart}</DialogActions>
      ) : null}
    </Dialog>
  );
}
