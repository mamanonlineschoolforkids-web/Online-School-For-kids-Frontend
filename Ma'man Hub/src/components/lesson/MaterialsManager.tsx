import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FileText, Plus, Trash2, Pencil, Loader2, Upload, Download,
  FileImage, FileArchive, File as FileIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { courseService, MaterialDto } from "@/services/courseService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function materialIcon(type: string) {
  if (type.startsWith("image/")) return <FileImage className="h-5 w-5 text-accent" />;
  if (type.includes("zip") || type.includes("rar")) return <FileArchive className="h-5 w-5 text-accent" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5 text-accent" />;
  return <FileIcon className="h-5 w-5 text-accent" />;
}

const MATERIAL_TYPES = [
  { value: "application/pdf", label: "PDF" },
  { value: "application/zip", label: "ZIP Archive" },
  { value: "application/msword", label: "Document" },
  { value: "image/*", label: "Image" },
  { value: "text/plain", label: "Text File" },
  { value: "other", label: "Other" },
];

// ── Dialog: Add / Edit material ───────────────────────────────────────────────

function MaterialDialog({
  open,
  onClose,
  courseId,
  sectionId,
  lessonId,
  existing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  sectionId: string;
  lessonId: string;
  existing?: MaterialDto;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [type, setType] = useState(existing?.type ?? "application/pdf");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle(existing?.title ?? "");
    setType(existing?.type ?? "application/pdf");
    setFile(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ title: "Enter a title for this material", variant: "destructive" });
      return;
    }
    if (!existing && !file) {
      toast({ title: "Choose a file to upload", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let url = existing?.url ?? "";
      let fileSize = existing?.fileSize ?? 0;

      if (file) {
        setUploading(true);
        const uploaded = await courseService.uploadMaterialFile(file);
        url = uploaded.url;
        fileSize = file.size;
        setUploading(false);
      }

      if (existing) {
        await courseService.updateMaterial({
          courseId, sectionId, lessonId,
          materialId: existing.id,
          title: title.trim(),
          type,
          url,
          fileSize,
        });
        toast({ title: "Material updated" });
      } else {
        await courseService.addMaterial({
          courseId, sectionId, lessonId,
          title: title.trim(),
          type,
          url,
          fileSize,
        });
        toast({ title: "Material added" });
      }

      onSaved();
      handleClose();
    } catch (err: any) {
      toast({
        title: "Failed to save material",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Material" : "Add Material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Worksheet 1 — Practice Exercises"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MATERIAL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{existing ? "Replace file (optional)" : "File *"}</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors text-sm"
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
              />
              {file ? (
                <span className="font-medium">{file.name} ({formatFileSize(file.size)})</span>
              ) : existing ? (
                <span className="text-muted-foreground">Keep existing file, or click to replace</span>
              ) : (
                <span className="text-muted-foreground flex items-center justify-center gap-2">
                  <Upload className="h-4 w-4" /> Click to choose a file
                </span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {(saving || uploading) && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            {existing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface MaterialsManagerProps {
  courseId: string;
  sectionId: string;
  lessonId: string;
  materials: MaterialDto[];
  onChanged: () => void;
}

export function MaterialsManager({
  courseId, sectionId, lessonId, materials, onChanged,
}: MaterialsManagerProps) {
  const { toast } = useToast();
  const [dialog, setDialog] = useState<{ open: boolean; existing?: MaterialDto }>({ open: false });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (materialId: string) => {
    if (!window.confirm("Delete this material?")) return;
    setDeletingId(materialId);
    try {
      await courseService.deleteMaterial(courseId, sectionId, lessonId, materialId);
      toast({ title: "Material deleted" });
      onChanged();
    } catch {
      toast({ title: "Failed to delete material", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Materials
            </CardTitle>
            <CardDescription>Downloadable resources for this lesson.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setDialog({ open: true })}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Material
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {materials.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
            No materials yet — add worksheets, slides, or other resources for students.
          </div>
        ) : (
          <ul className="space-y-2">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="rounded-lg bg-accent/10 p-2 shrink-0">
                  {materialIcon(m.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(m.fileSize)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0"
                    onClick={() => setDialog({ open: true, existing: m })}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive"
                    onClick={() => handleDelete(m.id)}
                    disabled={deletingId === m.id}
                  >
                    {deletingId === m.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <MaterialDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        courseId={courseId}
        sectionId={sectionId}
        lessonId={lessonId}
        existing={dialog.existing}
        onSaved={onChanged}
      />
    </Card>
  );
}