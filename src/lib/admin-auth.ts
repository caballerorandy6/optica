"use server"

import { timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ADMIN_COOKIE, createSessionToken } from "@/lib/admin-session"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  // timingSafeEqual exige buffers del mismo largo
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "")

  if (!passwordMatches(password)) {
    await sleep(1000) // frena fuerza bruta
    redirect("/admin/login?error=1")
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })
  redirect("/admin")
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  redirect("/admin/login")
}
