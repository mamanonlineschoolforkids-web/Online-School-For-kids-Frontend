// pages/BookSessionPage.tsx
// Step 1 of 2 — pick a date/time and reserve the slot (status = Pending).
// The user is then redirected to ConfirmBookingPage to pay.

import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MapPin, Clock, CalendarDays, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { userService } from "@/services/userService";
import { appointmentService } from "@/services/appointmentService";

const ALL_HALF_HOUR_SLOTS: string[] = Array.from({ length: 20 }, (_, i) => {
  const totalMin = 8 * 60 + i * 30; // 08:00 – 17:30
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
});

export default function BookSessionPage() {
  const { specialistId } = useParams<{ specialistId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isBooking, setIsBooking] = useState(false);

  // Specialist public profile (includes availabilitySlots)
  const { data: specialist, isLoading: loadingSpecialist } = useQuery({
    queryKey: ["specialist-public-profile", specialistId],
    queryFn: () => userService.getPublicProfile(specialistId!),
    enabled: !!specialistId,
  });

  // Already-booked slots for the selected date
  const { data: bookedSlots = [], isFetching: loadingSlots, refetch: refetchBookedSlots } = useQuery({
    queryKey: ["booked-slots", specialistId, selectedDate],
    queryFn: () =>
      appointmentService.getBookedSlots(
        specialistId!,
        format(selectedDate!, "yyyy-MM-dd")
      ),
    enabled: !!specialistId && !!selectedDate,
    // Re-fetch every 30 s so a Pending hold released by another user shows up
    refetchInterval: 30_000,
  });

  // Ticks every second so "Reserved" slot countdowns stay live, and lets us
  // immediately re-check availability the moment a hold's countdown hits 0:00
  // instead of waiting for the next 30s poll.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const bookedSlotsByTime = useMemo(() => {
    const map = new Map<string, (typeof bookedSlots)[number]>();
    bookedSlots.forEach((b) => map.set(b.time, b));
    return map;
  }, [bookedSlots]);

  // The moment any reserved slot's hold expires, re-check with the server —
  // it may have just become bookable again.
  useEffect(() => {
    const anyJustExpired = bookedSlots.some(
      (b) => b.status === "Reserved" && b.holdExpiresAtUtc &&
        new Date(b.holdExpiresAtUtc).getTime() <= now &&
        new Date(b.holdExpiresAtUtc).getTime() > now - 1000
    );
    if (anyJustExpired) refetchBookedSlots();
  }, [now, bookedSlots, refetchBookedSlots]);

  const availability = specialist?.availabilitySlots ?? [];

  const daySlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayName = format(selectedDate, "EEEE");
    const windows = availability.filter((a: any) => a.day === dayName);
    if (windows.length === 0) return [];

    return ALL_HALF_HOUR_SLOTS.filter((slot) =>
      windows.some((a: any) => slot >= a.startTime && slot < a.endTime)
    ).map((slot) => {
      const booked = bookedSlotsByTime.get(slot);
      const secondsRemaining = booked?.holdExpiresAtUtc
        ? Math.max(0, Math.floor((new Date(booked.holdExpiresAtUtc).getTime() - now) / 1000))
        : 0;
      return {
        time: slot,
        state: !booked ? "available" as const
          : booked.status === "Reserved" && secondsRemaining > 0 ? "reserved" as const
          : booked.status === "Reserved" ? "available" as const // hold just expired, treat as free until refetch confirms
          : "booked" as const,
        secondsRemaining,
      };
    });
  }, [selectedDate, availability, bookedSlotsByTime, now]);

  const endTime = useMemo(() => {
    if (!selectedSlot) return "";
    const [h, m] = selectedSlot.split(":").map(Number);
    const totalMin = h * 60 + m + 30;
    return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(
      totalMin % 60
    ).padStart(2, "0")}`;
  }, [selectedSlot]);

  const handleReserve = async () => {
    if (!selectedDate || !selectedSlot || !title.trim()) {
      toast({
        title: "Missing details",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    if (!user) {
      toast({ title: "Not logged in", variant: "destructive" });
      return;
    }

    setIsBooking(true);
    try {
      const { id: appointmentId } = await appointmentService.bookSession({
        specialistId: specialistId!,
        appointmentDate: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedSlot,
        endTime,
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // Redirect to payment — pass context via state
      navigate(`/bookings/${appointmentId}/confirm`, {
        state: {
          specialistName: specialist?.fullName,
          appointmentDate: format(selectedDate, "MMMM d, yyyy"),
          startTime: selectedSlot,
          endTime,
          title: title.trim(),
          hourlyRate: specialist?.hourlyRate,
        },
      });
    } catch (err: any) {
      toast({
        title: "Could not reserve slot",
        description: err.response?.data?.message ?? err.message,
        variant: "destructive",
      });
    } finally {
      setIsBooking(false);
    }
  };

  const displayName = specialist?.fullName ?? "Specialist";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/profile/${specialistId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Profile
        </Button>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-primary">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">1</span>
            Choose a slot
          </span>
          <span className="h-px flex-1 bg-border" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs">2</span>
            Confirm &amp; pay
          </span>
        </div>

        {/* Specialist card */}
        {loadingSpecialist ? (
          <Card><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <Avatar className="h-16 w-16 flex-shrink-0">
                <AvatarImage src={specialist?.profilePictureUrl ?? ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{displayName}</h2>
                {specialist?.professionalTitle && (
                  <p className="text-sm text-primary font-medium">{specialist.professionalTitle}</p>
                )}
                {specialist?.country && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {specialist.country}
                  </p>
                )}
                {specialist?.hourlyRate != null && (
                  <Badge variant="secondary" className="mt-1">
                    ${specialist.hourlyRate}/hr
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-5 w-5" /> Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                disabled={(d) => d < startOfDay(new Date())}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time + details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5" /> Select Time
                </CardTitle>
                <CardDescription>
                  {selectedDate
                    ? `Available slots for ${format(selectedDate, "MMMM d, yyyy")}`
                    : "Pick a date first"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedDate ? (
                  <p className="text-sm text-muted-foreground">
                    Please select a date to see available times.
                  </p>
                ) : loadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                ) : daySlots.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No available slots on this day. Try another date.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {daySlots.map(({ time, state, secondsRemaining }) => {
                      if (state === "available") {
                        return (
                          <Button
                            key={time}
                            variant={selectedSlot === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedSlot(time)}
                          >
                            {time}
                          </Button>
                        );
                      }
                      if (state === "reserved") {
                        const mm = String(Math.floor(secondsRemaining / 60)).padStart(2, "0");
                        const ss = String(secondsRemaining % 60).padStart(2, "0");
                        return (
                          <div
                            key={time}
                            className="flex flex-col items-center justify-center gap-0.5 rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-amber-800 cursor-not-allowed"
                            title="Someone else has this slot on hold — it may free up if they don't complete payment in time."
                          >
                            <span className="text-sm font-medium">{time}</span>
                            <span className="text-[10px] font-medium uppercase tracking-wide">Reserved</span>
                            <span className="text-[10px] tabular-nums">frees in {mm}:{ss}</span>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={time}
                          className="flex items-center justify-center rounded-md border bg-muted px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed"
                        >
                          {time} · Booked
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Study Skills Assessment"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Notes (optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you'd like help with..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {selectedDate && selectedSlot && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
                    <p className="font-medium text-primary">Slot summary</p>
                    <p className="text-muted-foreground">
                      {format(selectedDate, "MMMM d, yyyy")} · {selectedSlot} – {endTime}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      You'll have 30 minutes to complete payment after reserving.
                    </p>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleReserve}
                  disabled={!selectedDate || !selectedSlot || !title.trim() || isBooking}
                >
                  {isBooking ? "Reserving slot..." : "Reserve & Continue to Payment →"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}