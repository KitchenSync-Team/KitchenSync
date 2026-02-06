"use client"

import { z } from "zod"

import {
  ALLERGEN_OPTIONS,
  CUISINE_PREFERENCE_OPTIONS,
  DIETARY_OPTIONS,
  SEX_OPTIONS,
} from "@/app/protected/onboarding/constants"
import { createClient } from "@/lib/supabase/client"

export type ProfileMutationResult = { success: true } | { success: false; error: string }

const allowedSexValues = new Set(SEX_OPTIONS.map((option) => option.value))
const dietarySet = new Set(DIETARY_OPTIONS.map((option) => option.value))
const allergenSet = new Set(ALLERGEN_OPTIONS.map((option) => option.value))
const cuisineSet = new Set(CUISINE_PREFERENCE_OPTIONS.map((option) => option.value))

function normalizeName(value: string | null | undefined) {
  return (value ?? "").trim().slice(0, 120)
}

function normalizeSex(value: string | null | undefined) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || !allowedSexValues.has(trimmed)) return null
  return trimmed
}

function buildUniqueList(values: string[] | undefined, allowed: Set<string>) {
  return Array.from(
    new Set(
      (values ?? [])
        .map((value) => value.trim())
        .filter((value) => value.length > 0 && allowed.has(value)),
    ),
  )
}

async function requireUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("You need to be signed in to update your profile.")
  }

  return { supabase, user }
}

export async function saveIdentityClient(payload: {
  firstName: string
  lastName: string
  sex?: string | null
}): Promise<ProfileMutationResult> {
  try {
    const firstName = normalizeName(payload.firstName)
    const lastName = normalizeName(payload.lastName)

    if (!firstName || !lastName) {
      return { success: false, error: "First and last names are required." }
    }

    const sex = normalizeSex(payload.sex ?? null)
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || null

    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        sex,
      })
      .eq("id", user.id)

    if (error) {
      return {
        success: false,
        error: error.message ?? "We couldn't update your profile. Please try again.",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your profile.",
    }
  }
}

export async function updateEmailClient(payload: { email: string }): Promise<ProfileMutationResult> {
  try {
    const email = payload.email.trim()
    const parsed = z.string().email().safeParse(email)
    if (!parsed.success) {
      return { success: false, error: "Enter a valid email address." }
    }

    const { supabase, user } = await requireUser()

    if ((user.email ?? "").toLowerCase() === email.toLowerCase()) {
      return { success: true }
    }

    const { error: authError } = await supabase.auth.updateUser({ email })
    if (authError) {
      return {
        success: false,
        error: authError.message ?? "We couldn't update your email. Please try again.",
      }
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email })
      .eq("id", user.id)

    if (profileError) {
      return {
        success: false,
        error: profileError.message ?? "We couldn't sync your profile email.",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your email.",
    }
  }
}

export async function updatePasswordClient(payload: { password: string }): Promise<ProfileMutationResult> {
  try {
    const password = payload.password.trim()
    if (password.length < 8) {
      return { success: false, error: "Passwords must be at least 8 characters." }
    }

    const { supabase } = await requireUser()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      return { success: false, error: error.message ?? "We couldn't update your password." }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your password.",
    }
  }
}

export async function updateCommunicationPreferencesClient(payload: {
  emailOptIn: boolean
  personalizationOptIn: boolean
}): Promise<ProfileMutationResult> {
  try {
    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          email_opt_in: payload.emailOptIn,
          personalization_opt_in: payload.personalizationOptIn,
        },
        { onConflict: "user_id" },
      )

    if (error) {
      return {
        success: false,
        error: error.message ?? "We couldn't update your communication settings.",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your communication settings.",
    }
  }
}

export async function updateDietaryProfileClient(payload: {
  dietaryPreferences: string[]
  allergens: string[]
}): Promise<ProfileMutationResult> {
  try {
    const dietaryPreferences = buildUniqueList(payload.dietaryPreferences, dietarySet)
    const allergens = buildUniqueList(payload.allergens, allergenSet)
    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          dietary_preferences: dietaryPreferences.length > 0 ? dietaryPreferences : null,
          allergens: allergens.length > 0 ? allergens : null,
        },
        { onConflict: "user_id" },
      )

    if (error) {
      return {
        success: false,
        error: error.message ?? "We couldn't update your dietary preferences.",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your dietary preferences.",
    }
  }
}

export async function updateCuisinePreferencesClient(payload: {
  likes: string[]
  dislikes: string[]
}): Promise<ProfileMutationResult> {
  try {
    const likes = buildUniqueList(payload.likes, cuisineSet)
    const dislikesRaw = buildUniqueList(payload.dislikes, cuisineSet)
    const likeSet = new Set(likes)
    const dislikes = dislikesRaw.filter((value) => !likeSet.has(value))

    const { supabase, user } = await requireUser()

    const { error } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          cuisine_likes: likes.length > 0 ? likes : null,
          cuisine_dislikes: dislikes.length > 0 ? dislikes : null,
        },
        { onConflict: "user_id" },
      )

    if (error) {
      return {
        success: false,
        error: error.message ?? "We couldn't update your cuisine preferences.",
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "We couldn't update your cuisine preferences.",
    }
  }
}
