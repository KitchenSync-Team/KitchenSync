"use client";

export type OnboardingActionState =
  | {
      status: "idle";
      error?: undefined;
    }
  | {
      status: "error";
      error: string;
    };

export const defaultOnboardingState: OnboardingActionState = { status: "idle" };
