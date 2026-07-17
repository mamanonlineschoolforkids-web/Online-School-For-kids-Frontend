import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  Users,
  Video,
  Stethoscope,
  GraduationCap,
  Loader2,
  Calendar,
  Globe,
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  Briefcase,
  FileText,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Role {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const roles: Role[] = [
  {
    id: 1,
    key: "Student",
    name: "Student",
    description: "Learn from top instructors",
    icon: BookOpen,
    color: "from-blue-500/20 to-blue-600/5",
  },
  {
    id: 2,
    key: "Parent",
    name: "Parent",
    description: "Monitor your child's progress",
    icon: Users,
    color: "from-emerald-500/20 to-emerald-600/5",
  },
  {
    id: 3,
    key: "ContentCreator",
    name: "Content Creator",
    description: "Create and sell courses",
    icon: Video,
    color: "from-violet-500/20 to-violet-600/5",
  },
  {
    id: 4,
    key: "Specialist",
    name: "Specialist",
    description: "Provide expert guidance",
    icon: Stethoscope,
    color: "from-rose-500/20 to-rose-600/5",
  },
];

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const baseSchema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  country: z.string().min(1, "Please select a country"),
  otherCountry: z.string().optional(),
});

const proSchema = baseSchema.extend({
  expertise: z.string().min(2, "Area of expertise is required"),
  cvLink: z.string().url("Please enter a valid URL").min(1, "CV link is required"),
  portfolioUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
});

type BaseFormData = z.infer<typeof baseSchema>;
type ProFormData = z.infer<typeof proSchema>;
type FormData = BaseFormData & Partial<Omit<ProFormData, keyof BaseFormData>>;

// ── Rolecard component ────────────────────────────────────────────────────────

function RoleCard({
  role,
  selected,
  onClick,
}: {
  role: Role;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = role.icon;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative flex flex-col gap-3 rounded-2xl border-2 p-5 text-left transition-all duration-200 w-full",
        selected
          ? "border-accent shadow-lg shadow-accent/10"
          : "border-border hover:border-accent/40 hover:shadow-md"
      )}
    >
      {/* gradient bg */}
      <div
        className={cn(
          "absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 transition-opacity duration-200",
          role.color,
          selected && "opacity-100"
        )}
      />

      {/* selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute top-3 right-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent"
          >
            <Check className="h-3 w-3 text-accent-foreground" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
            selected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="relative">
        <p className="font-semibold text-sm">{role.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
      </div>
    </motion.button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                i < current
                  ? "bg-accent text-accent-foreground"
                  : i === current
                  ? "bg-accent text-accent-foreground ring-4 ring-accent/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                i === current ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {labels[i]}
            </span>
          </div>
          {i < total - 1 && (
            <div
              className={cn(
                "h-[2px] w-8 mb-4 rounded-full transition-colors duration-300",
                i < current ? "bg-accent" : "bg-border"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const COUNTRIES = [
  "Egypt", "Iraq", "Jordan", "Palestine",
  "Saudi Arabia", "Syria", "Other",
];

export default function CompleteProfilePage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0); // 0 = role, 1 = basics, 2 = pro fields (conditional)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showOtherCountry, setShowOtherCountry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  const tempToken = searchParams.get("temp_token");

  if (!tempToken) {
    navigate("/register");
    return null;
  }

  const isProRole =
    selectedRole?.key === "ContentCreator" ||
    selectedRole?.key === "Specialist";

  const totalSteps = isProRole ? 3 : 2;
  const stepLabels = isProRole
    ? ["Your Role", "Basic Info", "Professional"]
    : ["Your Role", "Basic Info"];

  const schema = isProRole ? proSchema : baseSchema;

  const {
    register,
    handleSubmit,
    control,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  // ── Navigation ──────────────────────────────────────────────────────────────

  const goNext = async () => {
    if (step === 0) {
      if (!selectedRole) {
        toast({
          title: "Please select a role",
          description: "Choose how you'll be using Ma'man.",
          variant: "destructive",
        });
        return;
      }
      setStep(1);
      return;
    }

    if (step === 1) {
      const valid = await trigger(["dateOfBirth", "country", "otherCountry"]);
      if (!valid) return;
      if (isProRole) {
        setStep(2);
        return;
      }
      // Non-pro role: submit directly from step 1
      handleSubmit(onSubmit)();
      return;
    }

    // step === 2 (pro): submit
    handleSubmit(onSubmit)();
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  // ── Submit ──────────────────────────────────────────────────────────────────

  const onSubmit = async (data: FormData) => {
    if (!selectedRole) return;
    setIsLoading(true);

    try {
      const finalCountry =
        data.country === "Other" ? data.otherCountry ?? "" : data.country;

      const authData = await authService.completeGoogleRegistration({
        tempToken,
        role: selectedRole.id,
        dateOfBirth: new Date(data.dateOfBirth),
        country: finalCountry,
        expertise: data.expertise,
        cvLink: data.cvLink,
        portfolioUrl: data.portfolioUrl,
      });

      setToken(authData.accessToken);
      setUser(authData.user);

      const rolePathMap: Record<string, string> = {
        Student: "student",
        Parent: "parent",
        ContentCreator: "ContentCreator",
        Specialist: "specialist",
        Admin: "admin",
      };
      const rolePath = rolePathMap[authData.user.role] ?? "student";

      if (authData.user.isFirstLogin) {
        toast({
          title: "Welcome to Ma'man!",
          description: "Your account is ready. Let's get started.",
        });
        navigate(`/${rolePath}/profile`);
      } else {
        toast({ title: "Welcome!", description: "Your account has been created." });
        navigate(`/${rolePath}/dashboard`);
      }
    } catch (error: any) {
      const message =
        error.response?.data?.error ||
        error.message ||
        "Something went wrong. Please try again.";

        if (message.toLowerCase().includes("pending")) {
      navigate("/registration-pending");  
      return;
    }
    
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-2/5 gradient-hero items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-sm text-primary-foreground"
        >
          <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold font-display mb-3">
            Almost there!
          </h2>
          <p className="text-primary-foreground/75 mb-8 leading-relaxed">
            Just a few details to personalise your Ma'man experience and get
            you learning in minutes.
          </p>

          {/* Progress preview */}
          <div className="space-y-3">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                    i < step
                      ? "bg-accent text-accent-foreground"
                      : i === step
                      ? "bg-white/20 text-white"
                      : "bg-white/10 text-white/40"
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "text-sm transition-colors",
                    i === step
                      ? "text-white font-semibold"
                      : i < step
                      ? "text-white/70 line-through"
                      : "text-white/40"
                  )}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg space-y-8"
        >
          {/* Logo (mobile only) */}
          <div className="flex lg:hidden items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold">Ma'man</span>
          </div>

          {/* Step indicator */}
          <div className="space-y-1">
            <StepIndicator
              current={step}
              total={totalSteps}
              labels={stepLabels}
            />
          </div>

          {/* ── Step content ── */}
          <AnimatePresence mode="wait">

            {/* STEP 0 — Role selection */}
            {step === 0 && (
              <motion.div
                key="step-role"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-2xl font-bold font-display">
                    How will you use Ma'man?
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    This determines your dashboard, features, and experience.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      selected={selectedRole?.id === role.id}
                      onClick={() => setSelectedRole(role)}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 1 — Basic info */}
            {step === 1 && (
              <motion.div
                key="step-basic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="text-2xl font-bold font-display">
                    Basic information
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    These are required to set up your account correctly.
                  </p>
                </div>

                {/* Date of birth */}
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">
                    Date of Birth <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      className="pl-10 h-12"
                      {...register("dateOfBirth")}
                    />
                  </div>
                  {errors.dateOfBirth && (
                    <p className="text-sm text-destructive">
                      {errors.dateOfBirth.message}
                    </p>
                  )}
                </div>

                {/* Country */}
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                    <select
                      id="country"
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      {...register("country", {
                        onChange: (e) =>
                          setShowOtherCountry(e.target.value === "Other"),
                      })}
                    >
                      <option value="">Select your country</option>
                      {COUNTRIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.country && (
                    <p className="text-sm text-destructive">
                      {errors.country.message}
                    </p>
                  )}
                </div>

                {/* Other country */}
                <AnimatePresence>
                  {showOtherCountry && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label htmlFor="otherCountry">Specify Country</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="otherCountry"
                          placeholder="Enter your country"
                          className="pl-10 h-12"
                          {...register("otherCountry")}
                        />
                      </div>
                      {errors.otherCountry && (
                        <p className="text-sm text-destructive">
                          {errors.otherCountry.message}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* STEP 2 — Professional fields (ContentCreator / Specialist only) */}
            {step === 2 && (
              <motion.div
                key="step-pro"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div>
                  <h1 className="text-2xl font-bold font-display">
                    Professional details
                  </h1>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    These help our team verify your profile before approval.
                  </p>
                </div>

                {/* Expertise */}
                <div className="space-y-2">
                  <Label htmlFor="expertise">
                    Area of Expertise <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="expertise"
                      placeholder={
                        selectedRole?.key === "ContentCreator"
                          ? "e.g., Early Childhood Education, Arabic Language, STEM for Kids"
                          : "e.g., Child Psychology, Special Education, Learning Disabilities"
                      }
                      className="pl-10 h-12"
                      {...register("expertise")}
                    />
                  </div>
                  {errors.expertise && (
                    <p className="text-sm text-destructive">
                      {errors.expertise.message}
                    </p>
                  )}
                </div>

                {/* CV Link */}
                <div className="space-y-2">
                  <Label htmlFor="cvLink">
                    CV Link <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="cvLink"
                      placeholder="https://drive.google.com/your-cv or https://linkedin.com/in/yourprofile"
                      className="pl-10 h-12"
                      {...register("cvLink")}
                    />
                  </div>
                  {errors.cvLink && (
                    <p className="text-sm text-destructive">
                      {errors.cvLink.message}
                    </p>
                  )}
                </div>

                {/* Portfolio URL (optional) */}
                <div className="space-y-2">
                  <Label htmlFor="portfolioUrl">
                    Portfolio URL{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="portfolioUrl"
                      placeholder="https://yourportfolio.com"
                      className="pl-10 h-12"
                      {...register("portfolioUrl")}
                    />
                  </div>
                  {errors.portfolioUrl && (
                    <p className="text-sm text-destructive">
                      {errors.portfolioUrl.message}
                    </p>
                  )}
                </div>

                {/* Approval notice */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
                  <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
                    <span className="font-semibold">Heads up:</span> Your
                    account will be reviewed by our team before activation.
                    You'll receive an email once approved — usually within 24
                    hours.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation buttons ── */}
          <div className="flex gap-3 pt-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                className="h-12 px-6 gap-2"
                onClick={goBack}
                disabled={isLoading}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}

            <Button
              type="button"
              className="h-12 flex-1 gap-2"
              onClick={goNext}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : step < totalSteps - 1 ? (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}