import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await prisma.transaction.count({
    where: { needsReview: true, kind: { in: ["SPEND", "REFUND"] } },
  });
  return NextResponse.json({ count });
}
