import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Mail, Phone, MapPin, Camera, Users, Star, Briefcase,
  Plus, X, Save, Loader2, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, ProfileDto } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { BillingTab } from "@/components/profile/parent/BillingTab";
import { ExperienceTab } from "@/components/profile/creator/ExperienceTab";
import { SocialLinksTab } from "@/components/profile/creator/SocialLinksTab";
import { CertificationsTab } from "@/components/profile/CertificationsTab";
import { AvailabilityTab } from "@/components/profile/AvailabilityTab";
import { RatesTab } from "@/components/profile/RatesTab";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { PayoutsTab } from "@/components/profile/PayoutsTab";
import { Link } from "react-router-dom";

const COUNTRIES = ["Egypt", "Iraq", "Jordan", "Palestine", "Saudi Arabia", "Syria", "Other"];

export default function SpecialistProfilePage() {
  const { toast } = useToast();
  const { user: currentUser, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userData, setUserData] = useState<ProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "", country: "", otherCountry: "", bio: "", professionalTitle: "", yearsOfExperience: "" });
  const [showOtherCountry, setShowOtherCountry] = useState(false);
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await userService.getProfile();
        setUserData(data);
        const parts = data.fullName?.split(" ") || [];
        const isOther = data.country && !COUNTRIES.slice(0, -1).includes(data.country);
        setProfile({ firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "", email: data.email || "", phone: data.phone || "", country: isOther ? "Other" : (data.country || ""), otherCountry: isOther ? (data.country || "") : "", bio: data.bio || "", professionalTitle: data.professionalTitle || "", yearsOfExperience: data.yearsOfExperience?.toString() || "" });
        setShowOtherCountry(!!isOther);
        if (data.specializations) setExpertiseTags(data.specializations);
      } catch { toast({ title: "Error", description: "Failed to load profile", variant: "destructive" }); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  const getInitials = () => {
    if (!userData?.fullName) return "S";
    const parts = userData.fullName.trim().split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0][0];
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ title: "Invalid file", variant: "destructive" });
    if (file.size > 5 * 1024 * 1024) return toast({ title: "Too large", description: "Max 5MB", variant: "destructive" });
    try {
      setIsUploadingImage(true);
      const formData = new FormData(); formData.append("profilePicture", file);
      const res = await userService.uploadProfilePicture(formData);
      setUserData(prev => prev ? { ...prev, profilePictureUrl: res.profilePictureUrl } : null);
      if (currentUser) setUser({ ...currentUser, profilePictureUrl: res.profilePictureUrl });
      toast({ title: "Updated" });
    } catch (e: any) { toast({ title: "Error", description: e.response?.data?.message || "Failed", variant: "destructive" }); }
    finally { setIsUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveProfile = async () => {
    const actualCountry = profile.country === "Other" ? profile.otherCountry : profile.country;
    if (!actualCountry) return toast({ title: "Error", description: "Select a country", variant: "destructive" });
    try {
      setIsSavingProfile(true);
      const payload = { fullName: `${profile.firstName} ${profile.lastName}`.trim(), phone: profile.phone, country: actualCountry, bio: profile.bio, professionalTitle: profile.professionalTitle, yearsOfExperience: parseInt(profile.yearsOfExperience) || 0, specializations: expertiseTags };
      await userService.updateProfile(payload);
      setUserData(prev => prev ? { ...prev, ...payload } : null);
      if (currentUser) setUser({ ...currentUser, fullName: payload.fullName });
      setIsEditingProfile(false);
      toast({ title: "Saved", description: "Profile updated successfully." });
    } catch (e: any) { toast({ title: "Error", description: e.response?.data?.message || "Failed", variant: "destructive" }); }
    finally { setIsSavingProfile(false); }
  };

  const handleCancelProfile = () => {
    if (userData) {
      const parts = userData.fullName?.split(" ") || [];
      const isOther = userData.country && !COUNTRIES.slice(0, -1).includes(userData.country);
      setProfile({ firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "", email: userData.email || "", phone: userData.phone || "", country: isOther ? "Other" : (userData.country || ""), otherCountry: isOther ? (userData.country || "") : "", bio: userData.bio || "", professionalTitle: userData.professionalTitle || "", yearsOfExperience: userData.yearsOfExperience?.toString() || "" });
      setShowOtherCountry(!!isOther);
      if (userData.specializations) setExpertiseTags(userData.specializations);
    }
    setIsEditingProfile(false);
  };

  const addTag = () => { const t = newTag.trim(); if (t && !expertiseTags.includes(t)) setExpertiseTags([...expertiseTags, t]); setNewTag(""); };

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  );

  if (!userData) return (
    <DashboardLayout>
      <div className="flex h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Failed to load profile</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">

        {/* Header Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={userData.profilePictureUrl} alt={userData.fullName} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                  {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <h1 className="text-2xl font-bold">{userData.fullName}</h1>
                  <Badge className="bg-purple-500">Specialist</Badge>
                </div>
                <p className="text-muted-foreground">{userData.professionalTitle || "Learning Specialist"}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{userData.rating || 0} Rating</span>
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{userData.studentsHelped || 0} Students</span>
                  <span className="flex items-center gap-1"><Briefcase className="h-4 w-4" />{userData.yearsOfExperience || 0} Years</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link to="/messages"><Button variant="outline" size="icon"><MessageSquare className="h-4 w-4" /></Button></Link>
                <ShareProfileDialog userId={userData.id} userName={userData.fullName} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-9">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="availability">Available Slots</TabsTrigger>
            <TabsTrigger value="rates">Rates</TabsTrigger>
            <TabsTrigger value="certifications">Certifications</TabsTrigger>
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="social">Social Links</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div><CardTitle>Professional Information</CardTitle><CardDescription>Your specialist profile details</CardDescription></div>
                  {isEditingProfile ? (
                    <div className="flex gap-2">
                      <Button onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>
                      <Button variant="outline" onClick={handleCancelProfile} disabled={isSavingProfile}><X className="mr-2 h-4 w-4" />Cancel</Button>
                    </div>
                  ) : <Button onClick={() => setIsEditingProfile(true)}>Edit Profile</Button>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>First Name</Label><Input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} disabled={!isEditingProfile} /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} disabled={!isEditingProfile} /></div>
                </div>
                <div className="space-y-2"><Label>Professional Title</Label><Input value={profile.professionalTitle} onChange={e => setProfile({ ...profile, professionalTitle: e.target.value })} disabled={!isEditingProfile} placeholder="e.g., Learning Specialist & Educational Psychologist" /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" className="pl-9" value={profile.email} disabled /></div>
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} disabled={!isEditingProfile} /></div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <Select value={profile.country} onValueChange={v => { setProfile({ ...profile, country: v, otherCountry: v !== "Other" ? "" : profile.otherCountry }); setShowOtherCountry(v === "Other"); }} disabled={!isEditingProfile}>
                        <SelectTrigger className="pl-9"><SelectValue placeholder="Select a country" /></SelectTrigger>
                        <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Years of Experience</Label><Input type="number" min="0" value={profile.yearsOfExperience} onChange={e => setProfile({ ...profile, yearsOfExperience: e.target.value })} disabled={!isEditingProfile} placeholder="e.g., 10" /></div>
                </div>
                {showOtherCountry && <div className="space-y-2"><Label>Enter Country</Label><Input value={profile.otherCountry} onChange={e => setProfile({ ...profile, otherCountry: e.target.value })} disabled={!isEditingProfile} placeholder="Enter your country" /></div>}
                <div className="space-y-2"><Label>Professional Bio</Label><Textarea rows={4} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} disabled={!isEditingProfile} placeholder="Tell students about your background and approach..." /></div>
                <div className="space-y-2">
                  <Label>Areas of Expertise</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {expertiseTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                        {tag}
                        {isEditingProfile && <button onClick={() => setExpertiseTags(expertiseTags.filter(t => t !== tag))} className="ml-1 hover:text-destructive transition-colors"><X className="h-3 w-3" /></button>}
                      </Badge>
                    ))}
                    {expertiseTags.length === 0 && <p className="text-sm text-muted-foreground">No expertise areas added yet</p>}
                  </div>
                  {isEditingProfile && (
                    <div className="flex gap-2">
                      <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} placeholder="Add expertise tag (press Enter)" className="flex-1" />
                      <Button type="button" variant="outline" onClick={addTag}><Plus className="h-4 w-4" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability"><AvailabilityTab /></TabsContent>
          <TabsContent value="rates"><RatesTab /></TabsContent>
          <TabsContent value="certifications"><CertificationsTab /></TabsContent>
          <TabsContent value="experience"><ExperienceTab /></TabsContent>
          <TabsContent value="social"><SocialLinksTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab role="specialist" /></TabsContent>
          <TabsContent value="payouts"><PayoutsTab role="specialist" /></TabsContent>
          <TabsContent value="billing"><BillingTab /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}