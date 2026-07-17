import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, GraduationCap, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── 2FA OTP Input ───────────────────────────────────────────────────────────

function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, "").split("").slice(0, 6);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[idx] !== "" && newDigits[idx] !== " ") {
        newDigits[idx] = "";
      } else if (idx > 0) {
        newDigits[idx - 1] = "";
        inputsRef.current[idx - 1]?.focus();
      }
      onChange(newDigits.join("").trimEnd());
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    if (raw.length > 1) {
      const pasted = raw.slice(0, 6);
      onChange(pasted);
      inputsRef.current[Math.min(pasted.length, 5)]?.focus();
      return;
    }
    const newDigits = [...digits];
    newDigits[idx] = raw[0];
    onChange(newDigits.join("").replace(/ /g, ""));
    if (idx < 5) inputsRef.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    inputsRef.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputsRef.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] === " " || digits[idx] === undefined ? "" : digits[idx]}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`
            w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-background
            transition-all duration-150 outline-none
            focus:border-primary focus:ring-2 focus:ring-primary/20
            ${digits[idx] && digits[idx] !== " " ? "border-primary text-primary" : "border-border text-foreground"}
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        />
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

type Step = "credentials" | "2fa";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [otpCode, setOtpCode] = useState("");
  const [tempToken, setTempToken] = useState<string>("");
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { setUser, setToken } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  // ── Redirect if already authenticated ────────────────────────────────────
  useEffect(() => {
    try {
      const raw   = localStorage.getItem("user");
      const token = localStorage.getItem("access_token");
      if (raw && token) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) {
          navigate("/", { replace: true });
        }
      }
    } catch {
      // Corrupted data — clear and stay on login
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }, [navigate]);

  // ── Pre-fill email from URL / session / local storage ────────────────────
  useEffect(() => {
    const getEmailFromSources = (): string => {
      const emailFromUrl = searchParams.get("email");
      if (emailFromUrl) return emailFromUrl;
      const emailFromSession = sessionStorage.getItem("pending_verification_email");
      if (emailFromSession) { sessionStorage.removeItem("pending_verification_email"); return emailFromSession; }
      const emailFromLocal = localStorage.getItem("pending_verification_email");
      if (emailFromLocal) { localStorage.removeItem("pending_verification_email"); return emailFromLocal; }
      return "";
    };
    const email = getEmailFromSources();
    if (email) setValue("email", email);
  }, [searchParams, setValue]);

  // ── Step 1: credentials submit ────────────────────────────────────────────

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const authData = await authService.login({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      });

      if (authData.requires2FA && authData.tempToken) {
        setTempToken(authData.tempToken);
        setStep("2fa");
        return;
      }

      handleLoginSuccess(authData);
    } catch (error: any) {
      handleLoginError(error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: 2FA submit ────────────────────────────────────────────────────

  const onSubmit2FA = async () => {
    if (otpCode.length !== 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const authData = await authService.verify2FA({ tempToken, code: otpCode });
      handleLoginSuccess(authData);
    } catch (error: any) {
      handleLoginError(error);
      setOtpCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared helpers ────────────────────────────────────────────────────────

  const handleLoginSuccess = (authData: any) => {
    const userData = authData.user;
    const accessToken = authData.accessToken ?? authData.access_token ?? "";
    const refreshToken = authData.refreshToken ?? authData.refresh_token ?? "";

    // Route through the Zustand store (which also persists to localStorage)
    // rather than writing localStorage directly — components read auth state
    // via useAuthStore(), and a raw localStorage write doesn't touch that
    // in-memory state, so pages checking `user`/`token` would incorrectly
    // still see the pre-login (logged-out) state until a full page refresh.
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    const rolePathMap: Record<string, string> = {
      Student: "student", student: "student",
      Parent: "parent", parent: "parent",
      ContentCreator: "ContentCreator", "ContentCreator": "ContentCreator",
      Specialist: "specialist", specialist: "specialist",
      Admin: "admin", admin: "admin",
    };

    const rolePath     = rolePathMap[userData.role] || "student";
    const requestedRedirect = searchParams.get("redirect");
    // Only ever redirect to an internal path — never follow an absolute/external URL here.
    const isSafeInternalPath = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//");
    const redirectPath = userData.isFirstLogin
      ? `/${rolePath}/profile`
      : (isSafeInternalPath ? requestedRedirect! : "/");

    toast({
      title: userData.isFirstLogin ? "Welcome to Ma'man!" : "Welcome back!",
      description: userData.isFirstLogin
        ? "Please complete your profile to get started."
        : `Logged in as ${userData.fullName}`,
    });

    navigate(redirectPath, { replace: true });
  };

  const handleLoginError = (error: any) => {
    let message = "Invalid email or password";
    if (error.response?.data) {
      message = typeof error.response.data === "string"
        ? error.response.data
        : error.response.data.message || error.response.data.error || error.response.data.title || message;
    } else if (error.message) {
      message = error.message;
    }
    toast({ title: "Login failed", description: message, variant: "destructive" });
  };

  const handleGoogleLogin = () => authService.googleAuth();

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-2xl font-bold">Ma'man</span>
          </Link>

          <AnimatePresence mode="wait">

            {/* ── Step 1: Credentials ── */}
            {step === "credentials" && (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h1 className="text-3xl font-bold font-display">Welcome back</h1>
                  <p className="mt-2 text-muted-foreground">Sign in to continue your learning journey</p>
                </div>

                <Button variant="outline" className="w-full h-12 gap-3" onClick={handleGoogleLogin} disabled={isLoading}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="name@example.com" className="pl-10 h-12" disabled={isLoading} {...register("email")} />
                    </div>
                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link to="/forgot-password" className="text-sm text-accent hover:underline">Forgot password?</Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="pl-10 pr-10 h-12" disabled={isLoading} {...register("password")} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" disabled={isLoading}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" checked={rememberMe} onCheckedChange={(checked) => setValue("rememberMe", checked as boolean)} disabled={isLoading} />
                    <Label htmlFor="remember" className="text-sm font-normal">Remember me for 30 days</Label>
                  </div>

                  <Button type="submit" className="w-full h-12" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in"}
                  </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-accent hover:underline font-medium">Sign up for free</Link>
                </p>
              </motion.div>
            )}

            {/* ── Step 2: 2FA ── */}
            {step === "2fa" && (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <button
                  onClick={() => { setStep("credentials"); setOtpCode(""); setTempToken(""); }}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </button>

                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20"
                  >
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-bold font-display">Two-Factor Auth</h1>
                    <p className="mt-2 text-muted-foreground text-sm leading-relaxed">
                      Open your authenticator app and enter the<br />6-digit code for your account.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <OtpInput value={otpCode} onChange={setOtpCode} disabled={isLoading} />
                  <p className="text-center text-xs text-muted-foreground">Code refreshes every 30 seconds</p>
                </div>

                <Button className="w-full h-12" disabled={isLoading || otpCode.length !== 6} onClick={onSubmit2FA}>
                  {isLoading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>
                    : "Verify & Sign in"
                  }
                </Button>

                <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Can't access your authenticator?</p>
                  <p>Contact your system administrator to reset your 2FA settings.</p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Right Panel */}
      <div className="hidden lg:flex lg:flex-1 gradient-hero items-center justify-center p-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="max-w-lg text-center text-primary-foreground"
        >
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
              <GraduationCap className="h-10 w-10" />
            </div>
          </div>
          <h2 className="text-4xl font-bold font-display mb-4">Transform Your Future</h2>
          <p className="text-lg text-primary-foreground/80">
            Join thousands of learners who are advancing their careers with our world-class online courses.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-8">
            <div><p className="text-3xl font-bold">50K+</p><p className="text-sm text-primary-foreground/60">Students</p></div>
            <div><p className="text-3xl font-bold">500+</p><p className="text-sm text-primary-foreground/60">Courses</p></div>
            <div><p className="text-3xl font-bold">100+</p><p className="text-sm text-primary-foreground/60">Instructors</p></div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}