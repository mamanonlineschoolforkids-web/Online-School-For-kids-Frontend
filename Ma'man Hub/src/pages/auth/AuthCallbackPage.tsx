import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";


// Mirrors rolePathMap in LoginPage.tsx exactly
const rolePathMap: Record<string, string> = {
  Student: "student",
  student: "student",
  Parent: "parent",
  parent: "parent",
  ContentCreator: "ContentCreator",
  "ContentCreator": "ContentCreator",
  Specialist: "specialist",
  specialist: "specialist",
  Admin: "admin",
  admin: "admin",
};

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setUser, setToken } = useAuthStore();

  useEffect(() => {
    const accessToken  = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    const error        = searchParams.get("error");

    // ── Error from backend ───────────────────────────────────────────────────
    if (error) {
      toast({
        title: "Sign in failed",
        description:
          error === "google_failed"
            ? "Google sign-in was cancelled or failed. Please try again."
            : decodeURIComponent(error),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!accessToken || !refreshToken) {
      navigate("/login");
      return;
    }

    // ── Persist tokens ───────────────────────────────────────────────────────
    setToken(accessToken);
    localStorage.setItem("refresh_token", refreshToken);

    // ── Fetch user to get role + isFirstLogin ────────────────────────────────
    authService.getCurrentUser()
      .then((userData) => {
        setUser(userData);

        const rolePath = rolePathMap[userData.role] ?? "student";

        if (userData.isFirstLogin) {
          toast({
            title: "Welcome to Ma'man!",
            description: "Please complete your profile to get started.",
          });
          navigate(`/${rolePath}/profile`);
        } else {
          toast({
            title: "Welcome back!",
            description: `Signed in as ${userData.fullName}`,
          });
          navigate(`/`);
        }
      })
      .catch(() => {
        // Tokens are saved; fall back to a safe default
        toast({ title: "Welcome!", description: "You're now signed in." });
        navigate("/");
      });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}