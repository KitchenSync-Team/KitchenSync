"use client"

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Upload } from "lucide-react"

import { getCroppedAvatarBlob, type CroppedAreaPixels } from "@/lib/image/crop-avatar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024

type AvatarUploaderProps = {
  currentAvatarUrl: string | null
  fallbackText: string
  refreshOnSuccess?: boolean
  onUploadSuccessAction?: (blob: Blob) => void
  triggerLabel?: string
}

export function AvatarUploader({
  currentAvatarUrl,
  fallbackText,
  refreshOnSuccess = true,
  onUploadSuccessAction,
  triggerLabel = "Change avatar",
}: AvatarUploaderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const selectedImageRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      if (selectedImageRef.current) {
        URL.revokeObjectURL(selectedImageRef.current)
        selectedImageRef.current = null
      }
    }
  }, [])

  const effectivePreviewUrl = useMemo(() => previewUrl ?? currentAvatarUrl, [previewUrl, currentAvatarUrl])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Unsupported file", { description: "Please choose an image file." })
      event.target.value = ""
      return
    }

    if (selectedImageRef.current) {
      URL.revokeObjectURL(selectedImageRef.current)
      selectedImageRef.current = null
    }

    const objectUrl = URL.createObjectURL(file)
    selectedImageRef.current = objectUrl
    setSelectedImageUrl(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setCroppedAreaPixels(null)
    setPreviewUrl(null)
    event.target.value = ""
  }

  useEffect(() => {
    if (!selectedImageUrl || !croppedAreaPixels) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = null
      }
      setPreviewUrl(null)
      return
    }

    let cancelled = false
    const timeout = window.setTimeout(async () => {
      try {
        const blob = await getCroppedAvatarBlob(selectedImageUrl, croppedAreaPixels, {
          outputWidth: 320,
        })
        const url = URL.createObjectURL(blob)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current)
        }
        previewUrlRef.current = url
        setPreviewUrl(url)
      } catch {
        // ignore preview errors
      }
    }, 150)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [croppedAreaPixels, selectedImageUrl])

  const handleCropComplete = (_: Area, pixels: Area) => {
    setCroppedAreaPixels({
      x: pixels.x,
      y: pixels.y,
      width: pixels.width,
      height: pixels.height,
    })
  }

  const handleUpload = async () => {
    if (!selectedImageUrl || !croppedAreaPixels) {
      toast.error("Select an image", { description: "Choose and crop an image first." })
      return
    }

    setIsUploading(true)
    try {
      const blob = await getCroppedAvatarBlob(selectedImageUrl, croppedAreaPixels, {
        outputWidth: 640,
      })

      if (blob.size > MAX_AVATAR_SIZE_BYTES) {
        toast.error("Image too large", {
          description: "Try zooming out or using a smaller file (max 2MB).",
        })
        return
      }

      const file = new File([blob], `avatar-${Date.now()}.webp`, { type: blob.type })
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })
      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        toast.error("Avatar upload failed", {
          description: result?.error ?? "We couldn’t update your avatar.",
        })
      } else {
        toast.success("Avatar updated", {
          description: "Your new profile photo is live.",
        })
        onUploadSuccessAction?.(blob)
        setOpen(false)
        setSelectedImageUrl(null)
        setCroppedAreaPixels(null)
        setPreviewUrl(null)
        if (refreshOnSuccess) {
          router.refresh()
        }
      }
    } catch (error) {
      toast.error("Avatar upload failed", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-full max-w-[90vw] lg:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Update avatar</DialogTitle>
          <DialogDescription>Select, crop, and preview how your photo appears across KitchenSync.</DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {selectedImageUrl ? (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <div className="space-y-6">
                <div className="relative mx-auto aspect-square w-full max-w-[520px] overflow-hidden rounded-2xl border border-border bg-muted shadow-sm lg:max-w-full">
                  <Cropper
                    image={selectedImageUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={handleCropComplete}
                    minZoom={1}
                    maxZoom={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avatar-zoom">Zoom</Label>
                  <Slider
                    id="avatar-zoom"
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.01}
                    onValueChange={(value) => setZoom(value[0] ?? 1)}
                  />
                </div>
                <Button variant="outline" size="sm" className="w-full lg:w-auto" onClick={() => fileInputRef.current?.click()}>
                  Choose another image
                </Button>
              </div>

              <div className="flex flex-col gap-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Profile preview</p>
                  <Avatar className="size-28 border bg-muted">
                    {effectivePreviewUrl ? (
                      <AvatarImage src={effectivePreviewUrl} alt="Profile preview" />
                    ) : (
                      <AvatarFallback>{fallbackText}</AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Sidebar preview</p>
                  <Avatar className="size-16 border bg-muted">
                    {effectivePreviewUrl ? (
                      <AvatarImage src={effectivePreviewUrl} alt="Sidebar preview" />
                    ) : (
                      <AvatarFallback className="text-xs">{fallbackText}</AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <p className="text-xs text-muted-foreground">
                  We’ll crop your photo into a circle for consistency across the app.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-muted-foreground/40 p-10 text-center">
              <Upload className="size-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Upload an image</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, or WebP up to 2MB.</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()}>Choose image</Button>
            </div>
          )}
          <Input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={handleFileChange}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!selectedImageUrl || !croppedAreaPixels || isUploading} onClick={handleUpload}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save avatar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
