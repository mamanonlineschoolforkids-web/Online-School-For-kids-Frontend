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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Mail, Phone, MapPin, Camera, Video, Users, DollarSign, Star,
  Loader2, MessageSquare, Save, X, Plus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { userService, ProfileDto } from "@/services/userService";
import { useAuthStore } from "@/stores/authStore";
import { NotificationsTab } from "@/components/profile/NotificationsTab";
import { ExperienceTab } from "@/components/profile/creator/ExperienceTab";
import { SocialLinksTab } from "@/components/profile/creator/SocialLinksTab";
import { BillingTab } from "@/components/profile/parent/BillingTab";
import { CertificationsTab } from "@/components/profile/CertificationsTab";
import { CoursesTab } from "@/components/profile/CoursesTab";
import { PayoutsTab } from "@/components/profile/PayoutsTab";

const COUNTRIES = ["Egypt", "Iraq", "Jordan", "Palestine", "Saudi Arabia", "Syria", "Other"];

interface CreatorStats {
  totalCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
}

export default function CreatorProfilePage() {
  const { toast } = useToast();
  const { user: currentUser, setUser } = useAuthStore();
  const [userData, setUserData] = useState<ProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [currentTab, setCurrentTab] = useState("profile");
  const [showOtherCountryInput, setShowOtherCountryInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [creatorStats, setCreatorStats] = useState<CreatorStats>({ totalCourses: 0, totalStudents: 0, totalRevenue: 0, averageRating: 0 });
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", phone: "", country: "", otherCountry: "", bio: "" });
  const [expertiseTags, setExpertiseTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await userService.getProfile();
        setUserData(data);
        const nameParts = data.fullName?.split(" ") || ["", ""];
        const isOtherCountry = data.country && !COUNTRIES.slice(0, -1).includes(data.country);
        setProfile({
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: data.email || "",
          phone: data.phone || "",
          country: isOtherCountry ? "Other" : (data.country || ""),
          otherCountry: isOtherCountry ? (data.country || "") : "",
          bio: data.bio || "",
        });
        setShowOtherCountryInput(!!isOtherCountry);
        if (data.specializations) setExpertiseTags(data.specializations);
        if (data.totalCourses !== undefined) {
          setCreatorStats({ totalCourses: data.totalCourses, totalStudents: data.totalStudents || 0, totalRevenue: data.totalRevenue || 0, averageRating: data.averageRating || 0 });
        }
      } catch (error: any) {
        toast({ title: "Error", description: error.response?.data?.message || "Failed to load profile", variant: "destructive" });
      } finally { setIsLoading(false); }
    };
    fetchProfile();
  }, [toast]);

  const handleProfilePictureChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ title: "Invalid File", description: "Please select an image file", variant: "destructive" });
    if (file.size > 5 * 1024 * 1024) return toast({ title: "File Too Large", description: "Please select an image smaller than 5MB", variant: "destructive" });
    try {
      setIsUploadingImage(true);
      const formData = new FormData(); formData.append("profilePicture", file);
      const response = await userService.uploadProfilePicture(formData);
      setUserData(prev => prev ? { ...prev, profilePictureUrl: response.profilePictureUrl } : null);
      if (currentUser) setUser({ ...currentUser, profilePictureUrl: response.profilePictureUrl });
      toast({ title: "Success", description: "Profile picture updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to upload profile picture", variant: "destructive" });
    } finally { setIsUploadingImage(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSavingProfile(true);
      const actualCountry = profile.country === "Other" ? profile.otherCountry : profile.country;
      if (!actualCountry) return toast({ title: "Validation Error", description: "Please select or enter a country", variant: "destructive" });
      const updateData = {
        fullName: `${profile.firstName} ${profile.lastName}`.trim(),
        phone: profile.phone, country: actualCountry, bio: profile.bio,
        specializations: expertiseTags,
      };
      const updatedProfile = await userService.updateProfile(updateData);
      setUserData(prev => prev ? { ...prev, ...updateData } : null);
      if (currentUser) setUser({ ...currentUser, fullName: updatedProfile.fullName });
      setIsEditingProfile(false);
      toast({ title: "Profile Updated", description: "Your profile has been saved successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: error.response?.data?.message || "Failed to update profile", variant: "destructive" });
    } finally { setIsSavingProfile(false); }
  };

  const handleCancelProfile = () => {
    if (userData) {
      const nameParts = userData.fullName?.split(" ") || ["", ""];
      const isOtherCountry = userData.country && !COUNTRIES.slice(0, -1).includes(userData.country);
      setProfile({ firstName: nameParts[0] || "", lastName: nameParts.slice(1).join(" ") || "", email: userData.email || "", phone: userData.phone || "", country: isOtherCountry ? "Other" : (userData.country || ""), otherCountry: isOtherCountry ? (userData.country || "") : "", bio: userData.bio || "" });
      setShowOtherCountryInput(!!isOtherCountry);
      if (userData.specializations) setExpertiseTags(userData.specializations);
    }
    setIsEditingProfile(false);
  };

  const handleCountryChange = (value: string) => {
    setProfile(prev => ({ ...prev, country: value, otherCountry: value !== "Other" ? "" : prev.otherCountry }));
    setShowOtherCountryInput(value === "Other");
  };

  const addTag = () => { const t = newTag.trim(); if (t && !expertiseTags.includes(t)) setExpertiseTags([...expertiseTags, t]); setNewTag(""); };

  const getInitials = (): string => {
    if (!userData?.fullName) return "U";
    const parts = userData.fullName.trim().split(" ");
    return parts.length >= 2 ? `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}` : userData.fullName.charAt(0);
  };

  const courseStats = [
    { label: "Total Courses",   value: creatorStats.totalCourses.toString(),           icon: Video },
    { label: "Total Students",  value: creatorStats.totalStudents.toLocaleString(),     icon: Users },
    { label: "Total Revenue",   value: `$${creatorStats.totalRevenue.toLocaleString()}`, icon: DollarSign },
    { label: "Avg. Rating",     value: creatorStats.averageRating.toFixed(1),           icon: Star },
  ];

  if (isLoading) return (
    <div className="flex h-[400px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!userData) return (
    <div className="flex h-[400px] items-center justify-center">
      <p className="text-muted-foreground">Failed to load profile</p>
    </div>
  );

  return (
    <DashboardLayout>
    <div className="mx-auto max-w-6xl space-y-6 p-4 lg:p-6">

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={userData.profilePictureUrl} alt={userData.fullName} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfilePictureChange} />
              <Button size="icon" variant="secondary" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage}>
                {isUploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <h1 className="text-2xl font-bold">{userData.fullName}</h1>
                <Badge>Verified Creator</Badge>
              </div>
              <p className="text-muted-foreground capitalize">{userData.role || "Content Creator"}</p>
              {expertiseTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 justify-center sm:justify-start">
                  {expertiseTags.slice(0, 4).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  {expertiseTags.length > 4 && <Badge variant="outline" className="text-xs">+{expertiseTags.length - 4} more</Badge>}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link to="/messages"><Button variant="outline" size="icon"><MessageSquare className="h-4 w-4" /></Button></Link>
              <ShareProfileDialog userId={userData.id} userName={userData.fullName} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {courseStats.map(stat => (
              <div key={stat.label} className="rounded-lg bg-muted/50 p-4 text-center">
                <stat.icon className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 md:grid-cols-8">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="social">Social Links</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="payment">Billing</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Personal Information</CardTitle><CardDescription>Your public creator profile</CardDescription></div>
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
                <div className="space-y-2"><Label htmlFor="firstName">First Name</Label><Input id="firstName" value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} disabled={!isEditingProfile} /></div>
                <div className="space-y-2"><Label htmlFor="lastName">Last Name</Label><Input id="lastName" value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} disabled={!isEditingProfile} /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" className="pl-9" value={profile.email} disabled /></div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="phone" type="tel" className="pl-9" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} disabled={!isEditingProfile} placeholder="+1 (555) 123-4567" /></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <Select value={profile.country} onValueChange={handleCountryChange} disabled={!isEditingProfile}>
                    <SelectTrigger id="country" className="pl-9"><SelectValue placeholder="Select a country" /></SelectTrigger>
                    <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {showOtherCountryInput && (
                <div className="space-y-2"><Label htmlFor="otherCountry">Enter Country</Label><Input id="otherCountry" value={profile.otherCountry} onChange={e => setProfile({ ...profile, otherCountry: e.target.value })} disabled={!isEditingProfile} placeholder="Enter your country" /></div>
              )}
              <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={4} value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} disabled={!isEditingProfile} placeholder="Tell us about yourself and your expertise..." /></div>
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

        <TabsContent value="courses"><CoursesTab /></TabsContent>
        <TabsContent value="certifications"><CertificationsTab /></TabsContent>
        <TabsContent value="experience"><ExperienceTab /></TabsContent>
        <TabsContent value="social"><SocialLinksTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab role="creator" /></TabsContent>
        <TabsContent value="payouts"><PayoutsTab role="creator" /></TabsContent>
        <TabsContent value="payment"><BillingTab /></TabsContent>
      </Tabs>
    </div>
    </DashboardLayout>
  );
}