import { z } from "zod";
import {
  BUDGET_CATEGORIES,
  FREQUENCIES,
  IMPORTANCE_LEVELS,
} from "./categories";
import { THEMES } from "./themes";

const optionalDate = z
  .union([z.string(), z.date()])
  .transform((v) => {
    if (v === "" || v === null || v === undefined) return null;
    const d = v instanceof Date ? v : new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  })
  .nullable()
  .optional();

const optionalString = z
  .string()
  .max(500)
  .transform((s) => s.trim())
  .transform((s) => (s.length === 0 ? null : s))
  .optional()
  .nullable();

const optionalIntInRange = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" || v === null || v === undefined ? null : Number(v)))
    .pipe(z.number().int().min(min).max(max).nullable())
    .optional()
    .nullable();

export const recurringItemSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120)
    .transform((s) => s.trim()),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  budgetCategory: z.enum(BUDGET_CATEGORIES),
  bankAccount: optionalString,
  frequency: z.enum(FREQUENCIES).default("MONTHLY"),
  dayOfMonth: optionalIntInRange(1, 31),
  startDate: optionalDate,
  endDate: optionalDate,
  notes: optionalString,
  active: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "true" || v === "on")
    .optional(),
});

export type RecurringItemInput = z.infer<typeof recurringItemSchema>;

export const incomeEntrySchema = z.object({
  month: z
    .union([z.string(), z.date()])
    .transform((v) => {
      const d = v instanceof Date ? v : new Date(v);
      // Canonicalise to first of month at 00:00 UTC.
      return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
    }),
  paidDate: optionalDate,
  person: optionalString,
  label: z
    .string()
    .min(1, "Label is required")
    .max(120)
    .transform((s) => s.trim()),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  bankAccount: optionalString,
  notes: optionalString,
});

export type IncomeEntryInput = z.infer<typeof incomeEntrySchema>;

const percentField = (label: string) =>
  z.coerce
    .number()
    .min(0, `${label} can't be negative`)
    .max(100, `${label} can't exceed 100`);

const positiveAmountField = (label: string) =>
  z.coerce
    .number()
    .min(0, `${label} can't be negative`);

export const settingsSchema = z
  .object({
    savingsPercent: percentField("Savings"),
    investPercent: percentField("Investments"),
    freePercent: percentField("Free spend"),
    giftLow: positiveAmountField("Low"),
    giftMedium: positiveAmountField("Medium"),
    giftHigh: positiveAmountField("High"),
    theme: z.enum(THEMES).default("treasury"),
  })
  .superRefine((val, ctx) => {
    const sum = val.savingsPercent + val.investPercent + val.freePercent;
    if (Math.abs(sum - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["savingsPercent"],
        message: `Splits must total 100% — currently ${sum.toFixed(1)}%`,
      });
    }
  });

export type SettingsInput = z.infer<typeof settingsSchema>;

export const calendarEventSchema = z.object({
  title: z
    .string()
    .min(1, "Title required")
    .max(120)
    .transform((s) => s.trim()),
  date: z
    .union([z.string(), z.date()])
    .transform((v) => (v instanceof Date ? v : new Date(v))),
  recursAnnually: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "true" || v === "on")
    .optional(),
  importance: z
    .union([z.enum(IMPORTANCE_LEVELS), z.literal(""), z.null()])
    .transform((v) => (v === "" ? null : v))
    .optional()
    .nullable(),
  amount: z
    .union([z.string(), z.number()])
    .transform((v) =>
      v === "" || v === null || v === undefined ? null : Number(v),
    )
    .pipe(z.number().min(0).nullable())
    .optional()
    .nullable(),
  person: optionalString,
  notes: optionalString,
});

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

export const personSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120)
    .transform((s) => s.trim()),
  importance: z.enum(IMPORTANCE_LEVELS),
  birthday: z
    .union([z.string(), z.date()])
    .transform((v) => {
      if (v === "" || v === null || v === undefined) return null;
      const d = v instanceof Date ? v : new Date(v);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    })
    .nullable()
    .optional(),
  notes: optionalString,
});

export type PersonInput = z.infer<typeof personSchema>;
