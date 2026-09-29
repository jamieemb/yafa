import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { SwipeableRow, type SwipeAction } from "@/components/swipeable-row";

export type { SwipeAction };

export interface Column<T> {
  id: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Monospace / tabular figures (money, counts, dates). */
  numeric?: boolean;
  width?: number | string;
  /** Prevent wrapping in this cell. */
  nowrap?: boolean;
}

export interface MobileRow<T> {
  /** Main line, e.g. the item name. */
  title: (row: T) => ReactNode;
  /** Secondary line(s): account · frequency · date. Return a string or node. */
  meta?: (row: T) => ReactNode;
  /** Right-aligned figure, e.g. the amount. */
  value?: (row: T) => ReactNode;
  /** Small text under the value. */
  valueSub?: (row: T) => ReactNode;
}

interface Props<T> {
  rows: T[];
  getKey: (row: T) => string;
  /** Desktop table columns (md and up). */
  columns: Column<T>[];
  /** How a row is summarised on phones (below md). */
  mobile: MobileRow<T>;
  /** Edit / delete / toggle controls, shown in a trailing cell on desktop and a footer row on phones. */
  actions?: (row: T) => ReactNode;
  /** Fade a row (e.g. inactive items). */
  muted?: (row: T) => boolean;
  /**
   * Touch swipe actions for the phone cards: `start` is revealed by
   * swiping right, `end` by swiping left. Pass bound server actions as
   * `onTrigger`. The same actions must also be present in `actions`.
   */
  swipe?: (row: T) => { start?: SwipeAction; end?: SwipeAction } | null | undefined;
  size?: "small" | "medium";
}

/**
 * Responsive record list: a data table from the md breakpoint, stacked
 * cards on phones. Both are rendered and toggled with CSS so server and
 * client markup match. Works from Server Components (render functions
 * run where the list is rendered).
 */
export function DataList<T>({
  rows,
  getKey,
  columns,
  mobile,
  actions,
  muted,
  swipe,
  size = "medium",
}: Props<T>) {
  return (
    <>
      {/* ── Desktop table ─────────────────────────────────────── */}
      <Box sx={{ display: { xs: "none", md: "block" }, overflowX: "auto" }}>
        <Table size={size}>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.id} align={c.align} sx={{ width: c.width, whiteSpace: "nowrap" }}>
                  {c.header}
                </TableCell>
              ))}
              {actions ? <TableCell align="right" sx={{ width: 1 }} /> : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isMuted = muted?.(row) ?? false;
              return (
                <TableRow key={getKey(row)} hover sx={{ opacity: isMuted ? 0.55 : 1 }}>
                  {columns.map((c) => (
                    <TableCell
                      key={c.id}
                      align={c.align}
                      className={c.numeric ? "tabular" : undefined}
                      sx={{ whiteSpace: c.nowrap ? "nowrap" : undefined }}
                    >
                      {c.render(row)}
                    </TableCell>
                  ))}
                  {actions ? (
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        {actions(row)}
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {/* ── Mobile cards ──────────────────────────────────────── */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        {rows.map((row, i) => {
          const isMuted = muted?.(row) ?? false;
          const value = mobile.value?.(row);
          const valueSub = mobile.valueSub?.(row);
          const meta = mobile.meta?.(row);
          const rowActions = actions?.(row);
          const swipeActions = swipe?.(row);
          const card = (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                columnGap: 2,
                rowGap: 0.5,
                px: 2,
                py: 1.5,
                borderTop: i === 0 ? 0 : "1px solid",
                borderColor: "divider",
                opacity: isMuted ? 0.55 : 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" component="div" sx={{ overflowWrap: "anywhere" }}>
                  {mobile.title(row)}
                </Typography>
                {meta ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="div"
                    sx={{ display: "flex", flexWrap: "wrap", gap: "2px 8px", alignItems: "center" }}
                  >
                    {meta}
                  </Typography>
                ) : null}
              </Box>
              {value !== undefined ? (
                <Box sx={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Typography variant="subtitle1" component="div" className="tabular">
                    {value}
                  </Typography>
                  {valueSub ? (
                    <Typography variant="caption" color="text.secondary" component="div">
                      {valueSub}
                    </Typography>
                  ) : null}
                </Box>
              ) : null}
              {rowActions ? (
                <Box
                  sx={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 0.5,
                  }}
                >
                  {rowActions}
                </Box>
              ) : null}
            </Box>
          );
          return swipeActions ? (
            <SwipeableRow key={getKey(row)} start={swipeActions.start} end={swipeActions.end}>
              {card}
            </SwipeableRow>
          ) : (
            <Box key={getKey(row)}>{card}</Box>
          );
        })}
      </Box>
    </>
  );
}

/** Dot separator for mobile meta lines: <Meta>{a}{b}{c}</Meta>. */
export function Meta({ children }: { children: ReactNode[] | ReactNode }) {
  const parts = (Array.isArray(children) ? children : [children]).filter(
    (c) => c !== null && c !== undefined && c !== false && c !== "",
  );
  return (
    <>
      {parts.map((p, i) => (
        <Box component="span" key={i} sx={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
          {i > 0 ? (
            <Box component="span" aria-hidden sx={{ opacity: 0.5 }}>
              ·
            </Box>
          ) : null}
          {p}
        </Box>
      ))}
    </>
  );
}
