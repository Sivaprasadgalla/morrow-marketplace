"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Cloud,
  Folder,
  ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type MediaItem = {
  _id: string;
  url: string;
  secureUrl: string;
  publicId: string;
  originalFilename?: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  vendorFolder?: string;
  altText?: string;
  createdAt: string;
};

type MediaManagerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  mode?: "picker-single" | "picker-multiple" | "manage";
  title?: string;
  initialSelectedUrls?: string[];
  onSelect?: (selectedUrls: string[]) => void;
};

export function MediaManagerModal({
  isOpen,
  onClose,
  mode = "manage",
  title,
  initialSelectedUrls = [],
  onSelect,
}: MediaManagerModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"library" | "upload" | "url">("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(true);
  const [vendorFolder, setVendorFolder] = useState("");

  // Selection state
  const [selectedUrls, setSelectedUrls] = useState<string[]>(initialSelectedUrls);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelectedUrls(initialSelectedUrls);
    }
  }

  // Upload state
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [directUrl, setDirectUrl] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);

  const refreshMedia = async (query = search) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "48");

      const res = await fetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load media assets");

      setItems(data.items || []);
      setCloudinaryConfigured(Boolean(data.cloudinaryConfigured));
      setVendorFolder(data.vendorFolder || "vendor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load media");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    params.set("limit", "48");

    fetch(`/api/media?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.items) setItems(data.items);
        setCloudinaryConfigured(Boolean(data.cloudinaryConfigured));
        setVendorFolder(data.vendorFolder || "vendor");
        setLoading(false);
      })
      .catch((err) => {
        if (ignore) return;
        toast.error(err instanceof Error ? err.message : "Unable to load media");
        setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isOpen, search, toast]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void refreshMedia(search);
  };

  const toggleSelect = (url: string) => {
    if (mode === "picker-single") {
      setSelectedUrls([url]);
    } else if (mode === "picker-multiple") {
      setSelectedUrls((prev) =>
        prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
      );
    }
  };

  const handleConfirmSelection = () => {
    if (onSelect) {
      onSelect(selectedUrls);
    }
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadFiles(Array.from(e.target.files));
    }
  };

  const handleUploadFiles = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    let successCount = 0;
    const newSelected: string[] = [];

    try {
      for (const file of uploadFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("altText", file.name.replace(/\.[^/.]+$/, ""));

        const res = await fetch("/api/media", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.media) {
          successCount++;
          newSelected.push(data.media.secureUrl || data.media.url);
        } else {
          toast.error(data.error ?? `Failed to upload ${file.name}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} image${successCount > 1 ? "s" : ""}`);
        setUploadFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await refreshMedia();

        if (mode === "picker-single" && newSelected.length > 0) {
          setSelectedUrls([newSelected[0]]);
        } else if (mode === "picker-multiple") {
          setSelectedUrls((prev) => [...prev, ...newSelected]);
        }
        setActiveTab("library");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAddDirectUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directUrl.trim()) return;

    try {
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: directUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save URL");

      toast.success("Image URL added to media library");
      const url = data.media?.secureUrl || directUrl.trim();
      setDirectUrl("");
      await refreshMedia();

      if (mode === "picker-single") {
        setSelectedUrls([url]);
      } else if (mode === "picker-multiple") {
        setSelectedUrls((prev) => [...prev, url]);
      }
      setActiveTab("library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add image URL");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget._id);
    try {
      const res = await fetch(`/api/media/${deleteTarget._id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete");

      toast.success("Image removed from library");
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget._id));
      setSelectedUrls((prev) =>
        prev.filter((u) => u !== deleteTarget.secureUrl && u !== deleteTarget.url),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete image");
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-4xl max-h-[calc(100dvh-24px)] sm:max-h-[90dvh] overflow-hidden rounded-lg bg-[#faf7f2] border border-stone-300 shadow-2xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 p-4 sm:p-6 pb-4 border-b border-stone-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl tracking-tight text-stone-900">
                  {title || (mode === "manage" ? "Media Assets" : "Select Product Media")}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-600">
                  <span className="inline-flex items-center gap-1 max-w-full break-all font-mono text-[11px] bg-stone-200/80 px-2 py-0.5 rounded text-stone-700">
                    <Folder className="size-3 text-stone-500" />
                    {vendorFolder}
                  </span>
                  {cloudinaryConfigured ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                      <Cloud className="size-3 text-emerald-600" /> Cloudinary Connected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-medium">
                      <AlertCircle className="size-3 text-amber-600" /> Demo Mode (Add Cloudinary keys to .env)
                    </span>
                  )}
                </div>
              </div>

              {/* Mode Actions */}
              <div className="flex items-center gap-2">
                {mode !== "manage" && (
                  <Button
                    size="sm"
                    onClick={handleConfirmSelection}
                    disabled={selectedUrls.length === 0}
                    className="bg-[#91412e] hover:bg-[#7e3828] text-white"
                  >
                    <Check className="size-3.5 mr-1" />
                    {mode === "picker-single"
                      ? "Select Image"
                      : `Use Selected (${selectedUrls.length})`}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 overflow-x-auto whitespace-nowrap [&>button]:shrink-0 mt-4 border-b border-stone-200 -mb-4 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("library")}
                className={cn(
                  "pb-3 text-xs font-medium border-b-2 transition-colors",
                  activeTab === "library"
                    ? "border-[#91412e] text-[#91412e]"
                    : "border-transparent text-stone-500 hover:text-stone-900",
                )}
              >
                Media Library ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("upload")}
                className={cn(
                  "pb-3 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5",
                  activeTab === "upload"
                    ? "border-[#91412e] text-[#91412e]"
                    : "border-transparent text-stone-500 hover:text-stone-900",
                )}
              >
                <UploadCloud className="size-3.5" /> Upload to Cloudinary
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("url")}
                className={cn(
                  "pb-3 text-xs font-medium border-b-2 transition-colors",
                  activeTab === "url"
                    ? "border-[#91412e] text-[#91412e]"
                    : "border-transparent text-stone-500 hover:text-stone-900",
                )}
              >
                Add by URL
              </button>
            </div>
          </div>

        {/* Tab 1: Library */}
        {activeTab === "library" && (
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your images by title or tag…"
                  className="pl-9 h-9 bg-white border-stone-300 text-xs"
                />
              </div>
              <Button type="submit" variant="outline" size="sm">
                Search
              </Button>
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    void refreshMedia("");
                  }}
                >
                  Clear
                </Button>
              )}
            </form>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-500">
                <Loader2 className="size-8 animate-spin text-[#91412e]" />
                <p className="mt-3 text-xs">Loading media assets…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-stone-300 bg-white/50 rounded-lg">
                <ImageIcon className="mx-auto size-10 text-stone-400 stroke-1" />
                <h4 className="mt-3 font-serif text-lg text-stone-800">No media assets found</h4>
                <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                  Upload high-resolution photography for your products. Images are stored securely
                  in Cloudinary under your studio folder.
                </p>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("upload")}
                  className="mt-4 bg-[#91412e] hover:bg-[#7e3828] text-white"
                >
                  <Plus className="size-3.5 mr-1" /> Upload Images Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
                {items.map((item) => {
                  const url = item.secureUrl || item.url;
                  const isSelected = selectedUrls.includes(url);
                  const isDeleting = deletingId === item._id;

                  return (
                    <div
                      key={item._id}
                      onClick={() => mode !== "manage" && toggleSelect(url)}
                      className={cn(
                        "group relative aspect-square rounded overflow-hidden border transition-all bg-stone-100 cursor-pointer",
                        isSelected
                          ? "border-[#91412e] ring-2 ring-[#91412e]/30 shadow-sm"
                          : "border-stone-200 hover:border-stone-400",
                      )}
                    >
                      <Image
                        src={url}
                        alt={item.altText || item.originalFilename || "Media item"}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform group-hover:scale-105 duration-300"
                      />

                      {/* Selection Badge */}
                      {mode !== "manage" && (
                        <div
                          className={cn(
                            "absolute top-2 left-2 size-5 rounded-full flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-[#91412e] text-white"
                              : "bg-black/40 text-transparent group-hover:text-white/60",
                          )}
                        >
                          <Check className="size-3 stroke-[2.5]" />
                        </div>
                      )}

                      {/* Delete action overlay */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                        disabled={isDeleting}
                        aria-label="Delete media item"
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-stone-600 opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-700 shadow-sm"
                      >
                        {isDeleting ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="size-3.5" />
                        )}
                      </button>

                      {/* Image Details Bar */}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[10px] truncate font-medium">
                          {item.originalFilename || "Image"}
                        </p>
                        {item.width && item.height && (
                          <p className="text-[9px] text-white/70">
                            {item.width} × {item.height}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload */}
        {activeTab === "upload" && (
          <div className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-stone-300 hover:border-[#91412e] bg-white/70 hover:bg-stone-50/80 rounded-lg p-8 text-center cursor-pointer transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <UploadCloud className="mx-auto size-10 text-stone-400 stroke-1" />
              <p className="mt-3 text-sm font-medium text-stone-800">
                Click or drag images here to upload
              </p>
              <p className="mt-1 text-xs text-stone-500">
                PNG, JPG, WEBP up to 10MB each. Stored in Cloudinary folder:{" "}
                <span className="font-mono text-stone-700 font-semibold">{vendorFolder}</span>
              </p>
            </div>

            {uploadFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-stone-700">
                    Selected files ({uploadFiles.length}):
                  </p>
                  <button
                    type="button"
                    onClick={() => setUploadFiles([])}
                    className="text-xs text-stone-500 hover:text-stone-900"
                  >
                    Clear selection
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {uploadFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="p-2 border border-stone-200 bg-white rounded text-xs truncate flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{file.name}</span>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={handleUploadFiles}
                  disabled={uploading}
                  className="w-full bg-[#91412e] hover:bg-[#7e3828] text-white"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Uploading {uploadFiles.length} item(s) to Cloudinary…
                    </>
                  ) : (
                    <>
                      <UploadCloud className="size-4 mr-2" />
                      Upload to Cloudinary Folder
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Direct URL */}
        {activeTab === "url" && (
          <form onSubmit={handleAddDirectUrl} className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-800 mb-1.5">
                Image Web URL
              </label>
              <Input
                type="url"
                required
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or https://res.cloudinary.com/..."
                className="bg-white border-stone-300 text-xs"
              />
              <p className="mt-1 text-[11px] text-stone-500">
                You can link high-quality image URLs directly to your catalog.
              </p>
            </div>

            <Button type="submit" className="bg-[#91412e] hover:bg-[#7e3828] text-white text-xs">
              Save to Library
            </Button>
          </form>
        )}
        </motion.div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Remove Media Asset"
        description={`Are you sure you want to remove "${deleteTarget?.originalFilename || "this image"}" from your studio library? This action cannot be undone.`}
        confirmLabel="Remove Image"
        variant="danger"
        busy={Boolean(deletingId)}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </AnimatePresence>
  );
}
