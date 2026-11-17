import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth, type UserRole } from "@/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export async function requireRole(allowed: UserRole[] = ["customer", "vendor", "admin"]) {
  const session = await auth();
  if (!session?.user) throw new ApiError(401, "Authentication required.");
  if (!allowed.includes(session.user.role)) throw new ApiError(403, "You do not have permission to perform this action.");
  return session;
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, details: error.details }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Invalid request.", details: error.flatten() }, { status: 422 });
  }

  if (error instanceof Error && error.name === "ValidationError") {
    return NextResponse.json({ error: "Validation failed.", details: error.message }, { status: 422 });
  }

  console.error(error);
  return NextResponse.json({ error: "Something went wrong on the server." }, { status: 500 });
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
