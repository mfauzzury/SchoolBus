import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(value: number | string): string {
  return Number(value).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatPeriod(dateStr: string, language: string): string {
  return new Date(dateStr).toLocaleDateString(language === "ms" ? "ms-MY" : "en-MY", {
    month: "long",
    year: "numeric",
  })
}

/**
 * What is still owed on a bill. Falls back to the face value where the API
 * doesn't send a balance (invoices nested inside another record).
 */
export function invoiceBalance(invoice: { final_amount: string; balance?: string }): number {
  return Number(invoice.balance ?? invoice.final_amount)
}

export function isInvoiceOverdue(invoice: { status: string; due_date: string }): boolean {
  return invoice.status === "issued" && new Date(invoice.due_date) < new Date()
}

/**
 * Malaysian school grade from date of birth: children enter Year 1 (Darjah 1)
 * in the January they turn 7, and Form 1 (Tingkatan 1) at 13 — placement is by
 * birth year, not exact birthday, per MOE convention.
 */
export function calculateGrade(dateOfBirth: string, language: string): string {
  const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear()
  const ms = language === "ms"

  if (age < 7) return ms ? "Prasekolah" : "Preschool"
  if (age <= 12) return ms ? `Darjah ${age - 6}` : `Year ${age - 6}`
  if (age <= 17) return ms ? `Tingkatan ${age - 12}` : `Form ${age - 12}`
  return ms ? "Tingkatan 5" : "Form 5"
}
