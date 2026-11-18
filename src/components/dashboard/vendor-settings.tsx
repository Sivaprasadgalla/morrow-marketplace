"use client";

import { useEffect, useState } from "react";
import { Check, Eye, EyeOff, KeyRound, LoaderCircle, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type VendorAccount = {
  name: string;
  email: string;
  phone?: string;
  vendorProfile?: {
    storeName?: string;
    description?: string;
    storeSlug?: string;
    verified?: boolean;
  };
};

export function VendorSettings() {
  const { toast } = useToast();
  const [account, setAccount] = useState<VendorAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Password visibility states
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Form states for password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let ignore = false;
    fetch("/api/account")
      .then((res) => res.json())
      .then((data: { user?: VendorAccount; error?: string }) => {
        if (ignore) return;
        if (data.user) {
          setAccount(data.user);
        } else {
          toast.error(data.error ?? "Failed to load account details.");
        }
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        toast.error(err instanceof Error ? err.message : "Failed to load account details.");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [toast]);

  const handleUpdateDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingDetails(true);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      storeName: String(formData.get("storeName") || "").trim(),
      storeDescription: String(formData.get("storeDescription") || "").trim(),
    };

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { user?: VendorAccount; error?: string };
      if (!res.ok || !data.user) {
        throw new Error(data.error ?? "Failed to update profile details.");
      }

      setAccount(data.user);
      toast.success("Studio details updated successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to change password.");
      }

      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1100px] py-16 text-center text-stone-500">
        <LoaderCircle className="mx-auto size-7 animate-spin text-[#91412e]" />
        <p className="mt-3 text-xs">Loading studio settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-10">
      <div>
        <p className="text-[11px] font-semibold tracking-[.12em] text-[#91412e] uppercase">
          Vendor Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-.045em] sm:text-4xl">
          Studio Profile &amp; Security
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Manage your independent studio credentials, contact information, and account security.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 items-start">
        {/* Studio & Profile Details */}
        <div className="border border-stone-200 min-w-0 bg-[#fcfaf6] p-4 sm:p-8">
          <div className="flex items-center gap-2.5 pb-5 border-b border-stone-200">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eee4d6] text-[#91412e]">
              <Store className="size-4" />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-stone-900">Studio Details</h2>
              <p className="text-xs text-stone-500">Public profile and studio contact details</p>
            </div>
          </div>

          <form onSubmit={handleUpdateDetails} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Maker / Studio Name *
              </label>
              <Input
                name="storeName"
                required
                defaultValue={account?.vendorProfile?.storeName || account?.name}
                placeholder="e.g. Asha Clay Studio"
                className="bg-white border-stone-300 text-xs h-10"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                This name appears on your product cards and dedicated studio collections.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Contact Full Name *
              </label>
              <Input
                name="name"
                required
                defaultValue={account?.name}
                placeholder="Full Name"
                className="bg-white border-stone-300 text-xs h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Account Email
              </label>
              <Input
                value={account?.email || ""}
                disabled
                className="bg-stone-100 border-stone-200 text-stone-500 text-xs h-10 cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                Email address is tied to your login identity.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Contact Phone
              </label>
              <Input
                name="phone"
                defaultValue={account?.phone || ""}
                placeholder="+91 98765 43210"
                className="bg-white border-stone-300 text-xs h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Studio Story / Description
              </label>
              <textarea
                name="storeDescription"
                rows={3}
                defaultValue={account?.vendorProfile?.description || ""}
                placeholder="Briefly describe your craft, materials, studio location, or philosophy…"
                className="w-full border border-stone-300 bg-white p-3 text-xs outline-none focus:border-stone-500"
              />
            </div>

            <Button
              type="submit"
              disabled={savingDetails}
              className="w-full bg-[#91412e] hover:bg-[#7e3828] text-white"
            >
              {savingDetails ? (
                <>
                  <LoaderCircle className="size-4 animate-spin mr-1.5" />
                  Saving Changes…
                </>
              ) : (
                <>
                  <Check className="size-4 mr-1.5" />
                  Save Studio Details
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Change Password & Security */}
        <div className="border border-stone-200 min-w-0 bg-[#fcfaf6] p-4 sm:p-8">
          <div className="flex items-center gap-2.5 pb-5 border-b border-stone-200">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eee4d6] text-[#91412e]">
              <KeyRound className="size-4" />
            </span>
            <div>
              <h2 className="font-serif text-2xl text-stone-900">Change Password</h2>
              <p className="text-xs text-stone-500">Update your security credentials</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Current Password *
              </label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-white border-stone-300 text-xs h-10 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                New Password *
              </label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="bg-white border-stone-300 text-xs h-10 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                Confirm New Password *
              </label>
              <Input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="bg-white border-stone-300 text-xs h-10"
              />
            </div>

            <div className="p-3 border border-stone-200 bg-white/70 text-[11px] text-stone-600 rounded space-y-1">
              <p className="font-medium text-stone-800 flex items-center gap-1.5">
                <Shield className="size-3 text-emerald-700" /> Password requirements:
              </p>
              <p>• Must be at least 8 characters in length</p>
              <p>• Use a combination of letters, numbers, and symbols</p>
            </div>

            <Button
              type="submit"
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full bg-[#171915] hover:bg-stone-800 text-white"
            >
              {savingPassword ? (
                <>
                  <LoaderCircle className="size-4 animate-spin mr-1.5" />
                  Updating Password…
                </>
              ) : (
                <>
                  <KeyRound className="size-4 mr-1.5" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
