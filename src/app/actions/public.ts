"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { fail, ok, str, toActionError, type ActionState } from "@/lib/action-state";

async function ip() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

export async function requestDemo(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    if (!rateLimit(`demo:${await ip()}`, 5, 3600_000).ok) return fail("Too many requests. Please try again later.");
    const data = z
      .object({
        name: z.string().min(2, "Please enter your name."),
        email: z.string().email("Please enter a valid work email."),
        company: z.string().min(2, "Please enter your company."),
        employees: z.string().optional(),
        phone: z.string().optional(),
        message: z.string().max(2000).optional(),
      })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), company: str(fd, "company"), employees: str(fd, "employees"), phone: str(fd, "phone"), message: str(fd, "message") });
    await db.lead.create({ data });
    return ok("Thank you! We'll get back to you within one business day to find a time for your demo.");
  } catch (e) {
    return toActionError(e);
  }
}
