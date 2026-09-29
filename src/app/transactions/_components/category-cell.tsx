"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import ArrowDropDownRounded from "@mui/icons-material/ArrowDropDownRounded";
import { toast } from "@/components/toast";
import { SPEND_CATEGORIES, type SpendCategory } from "@/lib/categories";
import { setTransactionCategory } from "../actions";

const UNCATEGORISED = "__uncategorised__";

interface Props {
  id: string;
  category: string | null;
  kind: string; // SPEND | PAYMENT | REFUND
}

/**
 * Inline category editor: a compact chip that opens a menu and saves
 * through the existing server action. Payments and refunds aren't
 * user-categorisable spend — they have a fixed identity and render as
 * static labels instead.
 */
export function CategoryCell({ id, category, kind }: Props) {
  const chipRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(category);

  if (kind === "PAYMENT") {
    return <KindLabel kind="payment" />;
  }
  if (kind === "REFUND") {
    return <KindLabel kind="refund" hint={category} />;
  }

  const open = Boolean(anchor);

  function openMenu() {
    setAnchor(chipRef.current);
  }

  function choose(next: string) {
    setAnchor(null);
    const cat = next === UNCATEGORISED ? null : (next as SpendCategory);
    if (cat === optimistic) return;
    startTransition(async () => {
      setOptimistic(cat);
      try {
        await setTransactionCategory(id, cat);
        toast.success("Category updated", cat ?? "Uncategorised");
      } catch (err) {
        toast.error(
          "Could not update category",
          err instanceof Error ? err.message : undefined,
        );
      }
    });
  }

  return (
    <>
      <Chip
        ref={chipRef}
        size="small"
        clickable
        disabled={pending}
        variant={optimistic ? "filled" : "outlined"}
        label={optimistic ?? "Uncategorised"}
        onClick={openMenu}
        onDelete={openMenu}
        deleteIcon={<ArrowDropDownRounded />}
        aria-haspopup="menu"
        aria-expanded={open}
        sx={{
          maxWidth: "100%",
          ...(optimistic ? {} : { borderColor: "warning.main", color: "warning.main" }),
          "& .MuiChip-deleteIcon": { color: "inherit", opacity: 0.7 },
        }}
      />
      <Menu anchorEl={anchor} open={open} onClose={() => setAnchor(null)}>
        <MenuItem selected={!optimistic} onClick={() => choose(UNCATEGORISED)}>
          <Typography component="span" variant="body2" color="text.secondary">
            Uncategorised
          </Typography>
        </MenuItem>
        {SPEND_CATEGORIES.map((c) => (
          <MenuItem key={c} selected={optimistic === c} onClick={() => choose(c)}>
            {c}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

function KindLabel({ kind, hint }: { kind: "payment" | "refund"; hint?: string | null }) {
  const isRefund = kind === "refund";
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <Chip
        size="small"
        label={isRefund ? "Refund" : "Card payment"}
        variant={isRefund ? "outlined" : "filled"}
        sx={isRefund ? { color: "success.main", borderColor: "success.main" } : undefined}
      />
      {hint ? (
        <Typography variant="caption" color="text.secondary" noWrap>
          offsets {hint}
        </Typography>
      ) : null}
    </Box>
  );
}
