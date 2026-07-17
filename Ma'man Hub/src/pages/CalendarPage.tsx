import { useMemo, useState } from "react";
import { format, isSameDay, startOfMonth, addMonths, subMonths, startOfWeek, endOfWeek, eachDayOfInterval, parseISO } from "date-fns";
import { CalendarDays, Clock, Plus, Video, FileText, Users, ChevronLeft, ChevronRight, Tv, Pencil, Trash2, MoreVertical, Loader2, ClipboardList } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  calendarService,
  type BackendEventType,
  type EventDto,
  type CreateEventRequest,
} from "@/services/calendarService";

type EventFormData = {
  title: string;
  description: string;
  type: BackendEventType;
  date: string;
  time: string;
  duration: number;
  meetingUrl: string;
};

const emptyForm: EventFormData = {
  title: "", description: "", type: "Deadline", date: "", time: "", duration: 60, meetingUrl: "",
};

const eventTypeConfig: Record<BackendEventType, { label: string; icon: typeof Video; bg: string; text: string }> = {
  LiveSession: { label: "Live Class", icon: Video, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  Webinar: { label: "Webinar", icon: Tv, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700" },
  StudyGroup: { label: "Study Group", icon: Users, bg: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  Assignment: { label: "Assignment", icon: ClipboardList, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  Deadline: { label: "Deadline", icon: FileText, bg: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  Exam: { label: "Exam", icon: FileText, bg: "bg-red-50 border-red-200", text: "text-red-700" },
  Other: { label: "Reminder", icon: Clock, bg: "bg-purple-50 border-purple-200", text: "text-purple-700" },
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default function CalendarPage() {
  const [month, setMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventDto | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EventDto | null>(null);
  const [formData, setFormData] = useState<EventFormData>(emptyForm);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const year = month.getFullYear();
  const monthNum = month.getMonth() + 1;

  const { data: monthData, isLoading: isLoadingMonth } = useQuery({
    queryKey: ["calendar-month", year, monthNum],
    queryFn: () => calendarService.getCalendarMonth(year, monthNum),
  });

  const { data: upcomingEvents = [], isLoading: isLoadingUpcoming } = useQuery({
    queryKey: ["calendar-upcoming"],
    queryFn: () => calendarService.getUpcomingEvents(5),
  });

  const { data: stats } = useQuery({
    queryKey: ["calendar-stats"],
    queryFn: calendarService.getStats,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["calendar-month"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-upcoming"] });
    queryClient.invalidateQueries({ queryKey: ["calendar-stats"] });
  };

  const createMutation = useMutation({
    mutationFn: (dto: CreateEventRequest) => calendarService.createEvent(dto),
    onSuccess: (created) => {
      invalidateAll();
      toast({ title: "Event created", description: `"${created.title}" added to your calendar.` });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't create event", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CreateEventRequest }) => calendarService.updateEvent(id, dto),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Event updated" });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Couldn't update event", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarService.deleteEvent(id),
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Event deleted" });
      setDeletingEvent(null);
    },
    onError: (err: any) => {
      toast({ title: "Couldn't delete event", description: err?.response?.data?.message, variant: "destructive" });
      setDeletingEvent(null);
    },
  });

  const joinMutation = useMutation({
    mutationFn: (id: string) => calendarService.joinEvent(id),
    onSuccess: (result) => {
      invalidateAll();
      if (result.meetingUrl) window.open(result.meetingUrl, "_blank", "noopener,noreferrer");
      toast({ title: result.message });
    },
    onError: (err: any) => {
      toast({ title: "Couldn't join event", description: err?.response?.data?.message, variant: "destructive" });
    },
  });

  const calendarDays = useMemo(() => {
    const start = startOfWeek(month);
    const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const endDisplay = endOfWeek(lastDay);
    return eachDayOfInterval({ start, end: endDisplay });
  }, [month]);

  const daysWithEvents = useMemo(() => {
    const set = new Set<number>();
    monthData?.days.forEach((d) => { if (d.hasEvents) set.add(d.day); });
    return set;
  }, [monthData]);

  const hasEvent = (day: Date) =>
    day.getMonth() === month.getMonth() && daysWithEvents.has(day.getDate());

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingEvent(null);
    setFormData(emptyForm);
  };

  const openCreateDialog = () => {
    setEditingEvent(null);
    setFormData({ ...emptyForm, date: format(selectedDate, "yyyy-MM-dd") });
    setDialogOpen(true);
  };

  const openEditDialog = (event: EventDto) => {
    const start = parseISO(event.startDateTime);
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description ?? "",
      type: event.type,
      date: format(start, "yyyy-MM-dd"),
      time: format(start, "HH:mm"),
      duration: event.duration,
      meetingUrl: event.meetingUrl ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title.trim() || formData.title.trim().length < 5) {
      toast({ title: "Title too short", description: "Title must be at least 5 characters.", variant: "destructive" });
      return;
    }
    if (!formData.date || !formData.time) {
      toast({ title: "Missing fields", description: "Please pick a date and time.", variant: "destructive" });
      return;
    }
    if (formData.meetingUrl && !/^https?:\/\//.test(formData.meetingUrl)) {
      toast({ title: "Invalid meeting URL", description: "Must start with http:// or https://", variant: "destructive" });
      return;
    }

    const startDateTime = new Date(`${formData.date}T${formData.time}:00`).toISOString();
    const dto: CreateEventRequest = {
      title: formData.title.trim(),
      description: formData.description || undefined,
      type: formData.type,
      startDateTime,
      duration: formData.duration,
      meetingUrl: formData.meetingUrl || undefined,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const getActionLabel = (type: BackendEventType) => {
    if (type === "LiveSession" || type === "Webinar" || type === "StudyGroup") return "Join";
    if (type === "Assignment" || type === "Deadline") return "View";
    return null;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">
              My <span className="text-accent">Calendar</span>
            </h1>
            <p className="mt-1 text-muted-foreground">Track your learning schedule, deadlines, and upcoming events</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" /> Add Event
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Left column */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMonth(subMonths(month, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-semibold text-sm">{format(month, "MMMM yyyy")}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setMonth(addMonths(month, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-1">
                  {WEEKDAYS.map((d) => (<div key={d} className="py-1 font-medium">{d}</div>))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm">
                  {calendarDays.map((day, i) => {
                    const isCurrentMonth = day.getMonth() === month.getMonth();
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    const dayHasEvent = hasEvent(day);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(day)}
                        className={cn(
                          "relative h-8 w-8 rounded-full mx-auto flex items-center justify-center transition-colors text-sm",
                          !isCurrentMonth && "text-muted-foreground/40",
                          isCurrentMonth && "hover:bg-accent/10",
                          isToday && !isSelected && "bg-accent text-accent-foreground font-bold",
                          isSelected && "bg-primary text-primary-foreground font-bold",
                        )}
                      >
                        {day.getDate()}
                        {dayHasEvent && !isSelected && !isToday && (
                          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {isLoadingMonth && (
                  <div className="flex justify-center pt-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-5">
                  <span className="text-2xl font-bold text-accent">{stats?.eventsThisWeek ?? "—"}</span>
                  <span className="text-xs text-muted-foreground mt-1">Events This Week</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-5">
                  <span className="text-2xl font-bold text-destructive">{stats?.deadlinesThisWeek ?? "—"}</span>
                  <span className="text-xs text-muted-foreground mt-1">Deadlines</span>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right column */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingUpcoming ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold">Nothing planned</p>
                  <p className="text-sm text-muted-foreground">No upcoming events.</p>
                </div>
              ) : (
                upcomingEvents.map((event) => {
                  const config = eventTypeConfig[event.type];
                  const Icon = config.icon;
                  const action = getActionLabel(event.type);
                  return (
                    <div key={event.id} className={cn("flex items-center gap-4 rounded-xl border p-4", config.bg)}>
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.text, "bg-white/70")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("font-semibold text-sm truncate", config.text)}>{event.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{event.date}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{event.time}</span>
                          {event.attendeesCount > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.attendeesCount} attending</span>}
                          {event.instructorName && <span>with {event.instructorName}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {action && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground"
                            disabled={joinMutation.isPending}
                            onClick={() =>
                              action === "Join"
                                ? joinMutation.mutate(event.id)
                                : toast({ title: event.title, description: "Deadline details" })
                            }
                          >
                            {action}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={async () => {
                                const full = await calendarService.getEvent(event.id);
                                openEditDialog(full);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={async () => {
                                const full = await calendarService.getEvent(event.id);
                                setDeletingEvent(full);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle>
            <DialogDescription>{editingEvent ? "Update the event details below." : "Add a new event to your calendar."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="evt-title">Title</Label>
              <Input id="evt-title" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Study Session" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evt-desc">Description (optional)</Label>
              <Textarea id="evt-desc" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="evt-date">Date</Label>
                <Input id="evt-date" type="date" value={formData.date} onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-time">Time</Label>
                <Input id="evt-time" type="time" value={formData.time} onChange={(e) => setFormData((p) => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="evt-duration">Duration (minutes)</Label>
                <Input
                  id="evt-duration"
                  type="number"
                  min={1}
                  max={600}
                  value={formData.duration}
                  onChange={(e) => setFormData((p) => ({ ...p, duration: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData((p) => ({ ...p, type: v as BackendEventType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(eventTypeConfig) as BackendEventType[]).map((t) => (
                      <SelectItem key={t} value={t}>{eventTypeConfig[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {(formData.type === "LiveSession" || formData.type === "Webinar" || formData.type === "StudyGroup") && (
              <div className="space-y-2">
                <Label htmlFor="evt-url">Meeting URL (optional)</Label>
                <Input id="evt-url" value={formData.meetingUrl} onChange={(e) => setFormData((p) => ({ ...p, meetingUrl: e.target.value }))} placeholder="https://meet.google.com/..." />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              {editingEvent ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingEvent} onOpenChange={(open) => { if (!open) setDeletingEvent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingEvent && deleteMutation.mutate(deletingEvent.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}