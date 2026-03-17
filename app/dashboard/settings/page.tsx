"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertCircle, Loader2, CheckCircle2,
  User, Lock, Phone, Image as ImageIcon,
} from "lucide-react"

/* =====================================================
   TYPES
===================================================== */

interface ProfileForm {
  name:         string
  phone:        string
  profileImage: string
}

interface PasswordForm {
  currentPassword: string
  newPassword:     string
  confirmPassword: string
}

/* =====================================================
   PAGE
===================================================== */

export default function SettingsPage() {
  const { user, accessToken } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<ProfileForm>({
    name:         "",
    phone:        "",
    profileImage: "",
  })

  const [passwords, setPasswords] = useState<PasswordForm>({
    currentPassword: "",
    newPassword:     "",
    confirmPassword: "",
  })

  const [profileSaving,  setProfileSaving]  = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [profileMsg,     setProfileMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [passwordMsg,    setPasswordMsg]    = useState<{ type: "success" | "error"; text: string } | null>(null)

  /* -------------------------
     Populate form from user
  -------------------------- */

  useEffect(() => {
    if (user) {
      setProfile({
        name:         user.name ?? "",
        phone:        (user as any).phone ?? "",
        profileImage: (user as any).profileImage ?? "",
      })
    }
  }, [user])

  /* -------------------------
     Save profile
  -------------------------- */

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)

    if (!profile.name.trim()) {
      setProfileMsg({ type: "error", text: "Name is required" })
      return
    }

    setProfileSaving(true)
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          name:         profile.name.trim(),
          phone:        profile.phone.trim() || null,
          profileImage: profile.profileImage.trim() || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to save")

      setProfileMsg({ type: "success", text: "Profile updated successfully" })
    } catch (err: unknown) {
      setProfileMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to save" })
    } finally {
      setProfileSaving(false)
    }
  }

  /* -------------------------
     Change password
  -------------------------- */

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordMsg({ type: "error", text: "New passwords do not match" })
      return
    }
    if (passwords.newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters" })
      return
    }

    setPasswordSaving(true)
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword:     passwords.newPassword,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to change password")

      setPasswordMsg({ type: "success", text: "Password changed successfully" })
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: unknown) {
      setPasswordMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to change password" })
    } finally {
      setPasswordSaving(false)
    }
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">

      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* ── Profile section ── */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-400" />
            Profile
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Update your name, phone number, and profile picture
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handleProfileSave} className="space-y-4" noValidate>

            {/* Avatar preview */}
            {profile.profileImage && (
              <div className="flex items-center gap-3">
                <img
                  src={profile.profileImage}
                  alt="Preview"
                  className="w-12 h-12 rounded-full object-cover border border-slate-700"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
                <span className="text-xs text-slate-500">Profile picture preview</span>
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Full Name</Label>
              <Input
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                disabled={profileSaving}
                className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Phone
                <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <Input
                type="tel"
                placeholder="+1 234 567 8900"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                disabled={profileSaving}
                className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Profile image URL */}
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                Profile Image URL
                <span className="text-slate-500 font-normal">(optional)</span>
              </Label>
              <Input
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={profile.profileImage}
                onChange={(e) => setProfile((p) => ({ ...p, profileImage: e.target.value }))}
                disabled={profileSaving}
                className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Message */}
            {profileMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                profileMsg.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {profileMsg.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />
                }
                {profileMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={profileSaving}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
            >
              {profileSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
                : "Save profile"
              }
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Password section ── */}
      <Card className="bg-slate-900/80 border-slate-700/50 rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-400" />
            Change Password
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Use a strong password with at least 8 characters
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <form onSubmit={handlePasswordSave} className="space-y-4" noValidate>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Current Password</Label>
              <Input
                type="password"
                value={passwords.currentPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
                disabled={passwordSaving}
                autoComplete="current-password"
                className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">New Password</Label>
              <Input
                type="password"
                value={passwords.newPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
                disabled={passwordSaving}
                autoComplete="new-password"
                className="h-11 rounded-xl bg-slate-800/60 border-slate-700 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Confirm New Password</Label>
              <Input
                type="password"
                value={passwords.confirmPassword}
                onChange={(e) => setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))}
                disabled={passwordSaving}
                autoComplete="new-password"
                className={`h-11 rounded-xl bg-slate-800/60 border text-white ${
                  passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword
                    ? "border-red-500/50"
                    : passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword
                    ? "border-green-500/30"
                    : "border-slate-700"
                }`}
              />
            </div>

            {/* Message */}
            {passwordMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm border ${
                passwordMsg.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}>
                {passwordMsg.type === "success"
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <AlertCircle className="w-4 h-4 shrink-0" />
                }
                {passwordMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={passwordSaving || !passwords.currentPassword || !passwords.newPassword}
              className="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white gap-2 disabled:opacity-60"
            >
              {passwordSaving
                ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</>
                : "Change password"
              }
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}