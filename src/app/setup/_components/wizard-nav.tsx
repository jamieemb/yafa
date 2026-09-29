"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Step from "@mui/material/Step";
import StepButton from "@mui/material/StepButton";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import DoneAllRounded from "@mui/icons-material/DoneAllRounded";
import { toast } from "@/components/toast";
import {
  WIZARD_STEPS,
  nextStep,
  prevStep,
  setupHref,
  stepIndex,
  type StepId,
} from "@/lib/plan";
import { finishPlan, setStepDone } from "../actions";

interface StepperProps {
  monthIso: string;
  current: StepId;
  completed: StepId[];
}

/** Horizontal stepper on tablets and up; "Step n of 5" + progress bar on phones. */
export function WizardStepper({ monthIso, current, completed }: StepperProps) {
  const done = new Set(completed);
  const index = stepIndex(current);
  const total = WIZARD_STEPS.length;
  const pct = (done.size / total) * 100;

  return (
    <Box>
      <Stepper
        nonLinear
        activeStep={index}
        alternativeLabel
        sx={{ display: { xs: "none", sm: "flex" } }}
      >
        {WIZARD_STEPS.map((s) => (
          <Step key={s.id} completed={done.has(s.id)}>
            <StepButton component={Link} href={setupHref(monthIso, s.id)}>
              {s.title}
            </StepButton>
          </Step>
        ))}
      </Stepper>
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
          <Typography variant="overline" color="text.secondary">
            Step {index + 1} of {total}
          </Typography>
          <Typography variant="overline" color="text.secondary">
            {done.size} done
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} aria-label={`${done.size} of ${total} steps complete`} />
      </Box>
    </Box>
  );
}

interface ActionsProps {
  monthIso: string;
  current: StepId;
  isDone: boolean;
  /** Label for the primary button when not yet done, e.g. "Income sorted". */
  doneLabel?: string;
  /** On the last step, whether the plan can be finished. */
  canFinish?: boolean;
}

/**
 * Footer for a wizard step: Back · Skip · Mark done & continue. On the
 * last step the primary action finishes the month and returns to the
 * dashboard.
 */
export function StepActions({ monthIso, current, isDone, doneLabel, canFinish = true }: ActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const prev = prevStep(current);
  const next = nextStep(current);
  const last = next === null;

  function markDone() {
    startTransition(async () => {
      try {
        await setStepDone(monthIso, current, true);
        if (last) {
          await finishPlan(monthIso);
          toast.success("Month set up", "Your plan is on the dashboard.");
          router.push(`/dashboard?month=${monthIso}`);
        } else {
          router.push(setupHref(monthIso, next));
        }
      } catch (err) {
        toast.error("Could not save progress", err instanceof Error ? err.message : undefined);
      }
    });
  }

  function undo() {
    startTransition(async () => {
      try {
        await setStepDone(monthIso, current, false);
      } catch (err) {
        toast.error("Could not update", err instanceof Error ? err.message : undefined);
      }
    });
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
        justifyContent: "space-between",
        pt: 2,
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", gap: 1 }}>
        {prev ? (
          <Button component={Link} href={setupHref(monthIso, prev)} startIcon={<ArrowBackRounded />}>
            Back
          </Button>
        ) : null}
        {isDone ? (
          <Button onClick={undo} disabled={pending}>
            Mark not done
          </Button>
        ) : null}
      </Box>
      <Box sx={{ display: "flex", gap: 1, flex: { xs: "1 1 100%", sm: "0 0 auto" }, justifyContent: "flex-end" }}>
        {!last ? (
          <Button component={Link} href={setupHref(monthIso, next)} endIcon={<ArrowForwardRounded />}>
            {isDone ? "Next" : "Skip"}
          </Button>
        ) : null}
        <Button
          variant="contained"
          onClick={markDone}
          disabled={pending || (last && !canFinish)}
          startIcon={last ? <DoneAllRounded /> : <CheckRounded />}
          sx={{ flex: { xs: 1, sm: "0 0 auto" } }}
        >
          {pending ? "Saving…" : last ? "Finish setup" : isDone ? "Continue" : doneLabel ?? "Done, next"}
        </Button>
      </Box>
    </Box>
  );
}
