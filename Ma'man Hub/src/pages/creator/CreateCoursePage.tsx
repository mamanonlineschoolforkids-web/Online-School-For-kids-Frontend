import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Loader2, AlertCircle, BookOpen, Upload, Image as ImageIcon,
  Video, X, Plus, GripVertical, DollarSign, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { courseService } from "@/services/courseService";

// ─── Constants ────────────────────────────────────────────────────────────────

const LANGUAGES = [
  "English", "Arabic", "French", "Spanish", "German",
  "Turkish", "Persian", "Urdu", "Hindi", "Portuguese",
];

const AGE_GROUPS = [
  { value: "ForParents", label: "For Parents" },
  { value: "ForEducators", label: "For Educators" },
  { value: "Toddlers", label: "Toddlers (1–3 years)" },
  { value: "Preschool", label: "Preschool (3–5 years)" },
  { value: "EarlyPrimary", label: "Early Primary (5–8 years)" },
  { value: "LatePrimary", label: "Late Primary (8–12 years)" },
  { value: "Tweens", label: "Tweens (10–13 years)" },
  { value: "Teenagers", label: "Teenagers (13–18 years)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryItem {
  id: string;
  name: string;
  displayOrder: number;
}

// ─── Sub-component: repeatable list editor ───────────────────────────────────

interface ListEditorProps {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
}

function ListEditor({ label, placeholder, items, onChange }: ListEditorProps) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const value = draft.trim();
    if (!value) return;
    onChange([...items, value]);
    setDraft("");
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="flex-1">{item}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" onClick={addItem} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Sub-component: image upload (thumbnail) ─────────────────────────────────

interface ImageUploadProps {
  url: string;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

function ThumbnailUpload({ url, uploading, onUpload, onRemove }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Thumbnail Image</Label>
      {url ? (
        <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border group">
          <img src={url} alt="Course thumbnail" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full max-w-xs aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors text-muted-foreground"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <>
              <ImageIcon className="h-6 w-6" />
              <span className="text-xs">Click to upload</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
      />
      <p className="text-xs text-muted-foreground">JPG, PNG, GIF or WEBP · up to 5 MB</p>
    </div>
  );
}

// ─── Sub-component: preview video upload ─────────────────────────────────────

interface VideoUploadProps {
  url: string;
  uploading: boolean;
  progress: number;
  onUpload: (file: File) => void;
  onRemove: () => void;
}

function PreviewVideoUpload({ url, uploading, progress, onUpload, onRemove }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>Preview Video (optional)</Label>
      <p className="text-xs text-muted-foreground -mt-1">
        A short promotional clip shown to students before they enroll.
      </p>
      {url ? (
        <div className="relative w-full max-w-sm rounded-lg overflow-hidden border group">
          <video src={url} controls className="w-full aspect-video bg-black" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          className="w-full max-w-sm aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors text-muted-foreground"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 w-full px-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-xs">{progress}%</span>
            </div>
          ) : (
            <>
              <Video className="h-6 w-6" />
              <span className="text-xs">Click to upload</span>
            </>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
      />
      <p className="text-xs text-muted-foreground">MP4, MOV, WEBM or AVI · up to 250 MB</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateCoursePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [language, setLanguage] = useState("English");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");

  const [whatYoullLearn, setWhatYoullLearn] = useState<string[]>([]);
  const [requirements, setRequirements] = useState<string[]>([]);

  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [previewVideoUploading, setPreviewVideoUploading] = useState(false);
  const [previewVideoProgress, setPreviewVideoProgress] = useState(0);

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/category", { params: { page: 1, pageSize: 50 } })
      .then((res) => setCategories(res.data?.data?.items ?? []))
      .catch(() => setCategoriesError("Could not load categories."))
      .finally(() => setCategoriesLoading(false));
  }, []);

  const handleThumbnailUpload = async (file: File) => {
    setThumbnailUploading(true);
    try {
      const url = await courseService.uploadThumbnail(file);
      setThumbnailUrl(url);
    } catch (err: any) {
      toast({
        title: "Thumbnail upload failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handlePreviewVideoUpload = async (file: File) => {
    setPreviewVideoUploading(true);
    setPreviewVideoProgress(0);
    try {
      const url = await courseService.uploadPreviewVideo(file, setPreviewVideoProgress);
      setPreviewVideoUrl(url);
    } catch (err: any) {
      toast({
        title: "Preview video upload failed",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    } finally {
      setPreviewVideoUploading(false);
    }
  };

  const isValid =
    title.trim().length > 0 &&
    categoryId.length > 0 &&
    ageGroup.length > 0 &&
    language.length > 0 &&
    price.trim().length > 0 &&
    !isNaN(parseFloat(price)) &&
    (discountPrice.trim().length === 0 || !isNaN(parseFloat(discountPrice)));

  const handleSubmit = async () => {
    if (!isValid) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await courseService.createCourse({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim(),
        categoryId,
        ageGroup,
        language,
        price: parseFloat(price),
        discountPrice: discountPrice.trim() ? parseFloat(discountPrice) : null,
        thumbnailUrl: thumbnailUrl || null,
        previewVideoUrl: previewVideoUrl || null,
        whatYoullLearn,
        requirements,
      });

      toast({ title: "Course created!", description: "Now add sections and lessons." });
      navigate(`/creator/courses/${created.id}`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to create course. Please try again.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 pb-16">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() => navigate("/creator/my-courses")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        My Courses
      </Button>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Create a New Course
        </h1>
        <p className="text-muted-foreground">
          Fill in the course details below — you can add sections and lessons once it's created.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>All fields marked * are required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Introduction to Phonics for Kids"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              placeholder="A short tagline shown under the title"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will students learn in this course?"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              {categoriesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : categoriesError ? (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {categoriesError}
                </div>
              ) : categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories available yet.</p>
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Age Group *</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Who is this course for?" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              Language *
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Select a language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountPrice">Discount Price ($)</Label>
              <Input
                id="discountPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Media
          </CardTitle>
          <CardDescription>Help students recognize and preview your course.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ThumbnailUpload
            url={thumbnailUrl}
            uploading={thumbnailUploading}
            onUpload={handleThumbnailUpload}
            onRemove={() => setThumbnailUrl("")}
          />
          <PreviewVideoUpload
            url={previewVideoUrl}
            uploading={previewVideoUploading}
            progress={previewVideoProgress}
            onUpload={handlePreviewVideoUpload}
            onRemove={() => setPreviewVideoUrl("")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Students Will Learn</CardTitle>
          <CardDescription>Add the key outcomes students should expect.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ListEditor
            label="What you'll learn"
            placeholder="e.g. Read and write basic phonics sounds"
            items={whatYoullLearn}
            onChange={setWhatYoullLearn}
          />
          <ListEditor
            label="Requirements"
            placeholder="e.g. No prior experience needed"
            items={requirements}
            onChange={setRequirements}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSubmit} disabled={isSubmitting || !isValid} size="lg">
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create Course
        </Button>
      </div>
    </div>
  );
}