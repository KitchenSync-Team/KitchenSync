"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  saveIdentityClient,
  updateCommunicationPreferencesClient,
  updateEmailClient,
  updatePasswordClient,
} from "@/components/profile/profile-mutations"
import { AvatarUploader } from "@/components/profile/avatar-uploader"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const sexOptions = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
]

type ProfileCardProps = {
  fullName: string | null
  email: string | null
  avatarUrl: string | null
  onboardingComplete: boolean
  firstName: string | null
  lastName: string | null
  sex: string | null
  emailOptIn: boolean
  personalizationOptIn: boolean
  lastPasswordUpdate?: string | null
}

export function ProfileCard({
  fullName,
  email,
  avatarUrl,
  firstName,
  lastName,
  sex,
  emailOptIn,
  personalizationOptIn,
}: ProfileCardProps) {
  const router = useRouter()
  const [first, setFirst] = useState(firstName ?? "")
  const [last, setLast] = useState(lastName ?? "")
  const [gender, setGender] = useState<string | undefined>(sex ?? undefined)

  const [emailDraft, setEmailDraft] = useState(email ?? "")
  const [passwordDraft, setPasswordDraft] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")

  const [emailUpdates, setEmailUpdates] = useState(emailOptIn)
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState(personalizationOptIn)
  const [identityPending, setIdentityPending] = useState(false)
  const [credentialsPending, setCredentialsPending] = useState(false)
  const [communicationPending, setCommunicationPending] = useState(false)

  useEffect(() => {
    setFirst(firstName ?? "")
    setLast(lastName ?? "")
    setGender(sex ?? undefined)
  }, [firstName, lastName, sex])

  useEffect(() => {
    setEmailDraft(email ?? "")
  }, [email])

  useEffect(() => {
    setEmailUpdates(emailOptIn)
    setPersonalizedSuggestions(personalizationOptIn)
  }, [emailOptIn, personalizationOptIn])

  const initials = useMemo(() => {
    return (
      (fullName ?? email ?? "KS")
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0]?.toUpperCase())
        .join("")
        .slice(0, 2) || "KS"
    )
  }, [email, fullName])

  const obfuscatedEmail = useMemo(() => {
    if (!email) return "Not provided"
    const [local, domain] = email.split("@")
    if (!domain) return email
    const maskedLocal =
      local.length <= 2 ? `${local[0] ?? ""}***` : `${local[0]}${"*".repeat(local.length - 2)}${local.at(-1)}`
    return `${maskedLocal}@${domain}`
  }, [email])

  const hasIdentityChange =
    first !== (firstName ?? "") || last !== (lastName ?? "") || gender !== (sex ?? undefined)

  const passwordTouched = passwordDraft.trim().length > 0
  const currentPasswordProvided = currentPassword.trim().length > 0
  const isPasswordValid = passwordDraft.trim().length >= 8
  const emailChanged = emailDraft !== (email ?? "")
  const hasCredentialChanges = emailChanged || (passwordTouched && currentPasswordProvided)
  const canSaveCredentials = hasCredentialChanges && (!passwordTouched || (isPasswordValid && currentPasswordProvided))

  const hasCommunicationChanges =
    emailUpdates !== emailOptIn || personalizedSuggestions !== personalizationOptIn

  const handleIdentitySave = async () => {
    if (!hasIdentityChange) return

    const trimmedFirst = first.trim()
    const trimmedLast = last.trim()

    if (!trimmedFirst || !trimmedLast) {
      toast.error("Missing name details", {
        description: "Enter both a first and last name before saving.",
      })
      return
    }

    setIdentityPending(true)
    try {
      const result = await saveIdentityClient({
        firstName: trimmedFirst,
        lastName: trimmedLast,
        sex: gender,
      })
      if (!result.success) {
        toast.error("Couldn’t update profile", {
          description: result.error ?? "Please try again.",
        })
        return
      }
      toast.success("Profile updated", {
        description: "Your identity details are now synced.",
      })
      router.refresh()
    } finally {
      setIdentityPending(false)
    }
  }

  const handleCredentialsSave = async () => {
    if (!canSaveCredentials) return
    setCredentialsPending(true)

    try {
      if (emailChanged) {
        const emailResult = await updateEmailClient({ email: emailDraft.trim() })
        if (!emailResult.success) {
          toast.error("Couldn’t update email", {
            description: emailResult.error ?? "Please try again.",
          })
          return
        }
        toast.success("Email update requested", {
          description: "Check your new inbox to confirm the change.",
        })
      }

      if (passwordTouched && currentPasswordProvided && isPasswordValid) {
        const passwordResult = await updatePasswordClient({
          password: passwordDraft,
        })
        if (!passwordResult.success) {
          toast.error("Couldn’t update password", {
            description: passwordResult.error ?? "Please try again.",
          })
          return
        }
        toast.success("Password updated", {
          description: "Your password has been changed.",
        })
        setPasswordDraft("")
        setCurrentPassword("")
      }

      router.refresh()
    } finally {
      setCredentialsPending(false)
    }
  }

  const handleCredentialsReset = () => {
    setEmailDraft(email ?? "")
    setPasswordDraft("")
    setCurrentPassword("")
  }

  const handleCommunicationSave = async () => {
    if (!hasCommunicationChanges) return
    setCommunicationPending(true)
    try {
      const result = await updateCommunicationPreferencesClient({
        emailOptIn: emailUpdates,
        personalizationOptIn: personalizedSuggestions,
      })
      if (!result.success) {
        toast.error("Couldn’t update preferences", {
          description: result.error ?? "Please try again.",
        })
        return
      }
      toast.success("Preferences saved", {
        description: "Your communication settings are up to date.",
      })
      router.refresh()
    } finally {
      setCommunicationPending(false)
    }
  }

  return (
    <Card>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col items-center justify-center gap-6 rounded-lg bg-muted/30 p-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="size-40">
              {avatarUrl ? (
                <AvatarImage
                  key={avatarUrl}
                  src={avatarUrl}
                  alt={fullName ?? email ?? "KitchenSync member"}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <AvatarFallback className="text-4xl font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <AvatarUploader currentAvatarUrl={avatarUrl} fallbackText={initials} />
          </div>
        </div>

        <Tabs defaultValue="identity" className="flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="identity">Identity</TabsTrigger>
            <TabsTrigger value="credentials">Login</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
          </TabsList>

          <TabsContent value="identity">
            <Card>
              <CardHeader>
                <CardTitle>Identity</CardTitle>
                <CardDescription>Update the details that appear across KitchenSync.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="identity-first-name">First name</Label>
                    <Input
                      id="identity-first-name"
                      value={first}
                      onChange={(event) => setFirst(event.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="identity-last-name">Last name</Label>
                    <Input
                      id="identity-last-name"
                      value={last}
                      onChange={(event) => setLast(event.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5 sm:max-w-xs">
                  <Label htmlFor="identity-sex">Pronouns / gender</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger id="identity-sex">
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      {sexOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasIdentityChange || identityPending}
                  onClick={() => {
                    setFirst(firstName ?? "")
                    setLast(lastName ?? "")
                    setGender(sex ?? undefined)
                  }}
                >
                  Reset
                </Button>
                <Button size="sm" disabled={!hasIdentityChange || identityPending} onClick={handleIdentitySave}>
                  {identityPending ? "Saving…" : "Save identity"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="credentials">
            <Card>
              <CardHeader>
                <CardTitle>Credentials</CardTitle>
                <CardDescription>Adjust your login email or update your password.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="credentials-email">Email address</Label>
                  <Input
                    id="credentials-email"
                    type="email"
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder="you@example.com"
                  />
                  <p className="text-xs text-muted-foreground">Current email: {obfuscatedEmail}</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="credentials-current-password">Current password</Label>
                  <Input
                    id="credentials-current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    placeholder="Current password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="credentials-password">New password</Label>
                  <Input
                    id="credentials-password"
                    type="password"
                    value={passwordDraft}
                    onChange={(event) => setPasswordDraft(event.target.value)}
                    placeholder="New password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use at least 8 characters combining letters, numbers, and symbols.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasCredentialChanges || credentialsPending}
                  onClick={handleCredentialsReset}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  disabled={!canSaveCredentials || credentialsPending}
                  onClick={handleCredentialsSave}
                >
                  {credentialsPending ? "Saving…" : "Save credentials"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="communication">
            <Card>
              <CardHeader>
                <CardTitle>Communication</CardTitle>
                <CardDescription>Choose which KitchenSync updates you receive.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <PreferenceSwitch
                  title="Email updates"
                  description="Recipe drops, release notes, occasional product news."
                  checked={emailUpdates}
                  onCheckedChange={setEmailUpdates}
                />
                <PreferenceSwitch
                  title="Personalized suggestions"
                  description="Tailor recipe and inventory tips using your kitchen data."
                  checked={personalizedSuggestions}
                  onCheckedChange={setPersonalizedSuggestions}
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasCommunicationChanges || communicationPending}
                  onClick={handleCommunicationSave}
                >
                  {communicationPending ? "Saving…" : "Save preferences"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

type PreferenceSwitchProps = {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}

function PreferenceSwitch({ title, description, checked, onCheckedChange }: PreferenceSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
