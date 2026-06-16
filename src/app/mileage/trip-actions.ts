"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { parseCarTrips } from "@/lib/importers/car-trips";

export interface TripImportResult {
  filename: string;
  imported: number;
  skipped: number;
  total: number;
}

export async function importTrips(
  contractId: string,
  formData: FormData,
): Promise<TripImportResult> {
  const contract = await prisma.mileageContract.findUnique({
    where: { id: contractId },
  });
  if (!contract) throw new Error("Contract not found");

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Please choose a CSV file");
  if (file.size === 0) throw new Error(`File "${file.name}" is empty`);
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new Error(`File must be a .csv (got "${file.name}")`);
  }

  const parsed = parseCarTrips(await file.text());

  const importRow = await prisma.tripImport.create({
    data: { filename: file.name, tripCount: 0 },
  });

  let imported = 0;
  let skipped = 0;

  // Per-row dedupe on the natural key so re-uploading an overlapping
  // month is idempotent (SQLite createMany has no skipDuplicates).
  await prisma.$transaction(async (tx) => {
    for (const t of parsed) {
      const existing = await tx.carTrip.findUnique({
        where: {
          contractId_startAt_startOdo_endOdo: {
            contractId,
            startAt: t.startAt,
            startOdo: t.startOdo,
            endOdo: t.endOdo,
          },
        },
      });
      if (existing) {
        skipped++;
        continue;
      }
      await tx.carTrip.create({
        data: {
          contractId,
          importId: importRow.id,
          startAt: t.startAt,
          endAt: t.endAt,
          timeZone: t.timeZone,
          durationMin: t.durationMin,
          startOdo: t.startOdo,
          endOdo: t.endOdo,
          distance: t.distance,
          efficiency: t.efficiency,
          batteryPct: t.batteryPct,
          startLat: t.startLat,
          startLon: t.startLon,
          endLat: t.endLat,
          endLon: t.endLon,
          startUrl: t.startUrl,
          endUrl: t.endUrl,
          purpose: t.purpose,
          driver: t.driver,
        },
      });
      imported++;
    }
  });

  await prisma.tripImport.update({
    where: { id: importRow.id },
    data: { tripCount: imported },
  });

  revalidatePath("/mileage");
  return { filename: file.name, imported, skipped, total: parsed.length };
}

export async function deleteTripImport(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.carTrip.deleteMany({ where: { importId: id } });
    await tx.tripImport.delete({ where: { id } });
  });
  revalidatePath("/mileage");
}
