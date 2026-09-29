"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import PeopleOutlined from "@mui/icons-material/PeopleOutlined";

interface Props {
  /** "icon" for a row action, "button" for an outlined text button. */
  variant?: "icon" | "button";
  label?: string;
}

/**
 * Client-side link to /people. Birthdays are edited there, so birthday
 * rows on the calendar get this instead of edit/delete controls.
 * Lives in a client file so MUI can take component={Link}.
 */
export function PeopleLink({ variant = "icon", label = "Manage in People" }: Props) {
  if (variant === "button") {
    return (
      <Button component={Link} href="/people" variant="outlined" startIcon={<PeopleOutlined />}>
        {label}
      </Button>
    );
  }
  return (
    <Tooltip title={label}>
      <IconButton component={Link} href="/people" size="small" aria-label={label}>
        <PeopleOutlined fontSize="small" />
      </IconButton>
    </Tooltip>
  );
}
