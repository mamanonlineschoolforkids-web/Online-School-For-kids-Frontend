import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { appointmentService, AppointmentDto } from "@/services/appointmentService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, isAfter } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Backend status strings are PascalCase: "Pending" | "Confirmed" | "Cancelled" | "Completed"
const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-800",
  Confirmed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
  Completed: "bg-blue-100 text-blue-800",
};

const QUERY_KEY = ["specialist-appointments-all"];

export default function SpecialistDashboardPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: appointmentService.getMySessionsAsSpecialist,
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => appointmentService.confirmAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Appointment confirmed", description: "The session has been accepted." });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't confirm",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => appointmentService.cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: "Appointment cancelled", description: "The appointment has been cancelled." });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't cancel",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
    },
  });

  const pending = appointments.filter((a) => a.status === "Pending");
  const upcoming = appointments.filter(
    (a) =>
      (a.status === "Confirmed" || a.status === "Pending") &&
      isAfter(parseISO(a.appointmentDate), new Date(new Date().setDate(new Date().getDate() - 1)))
  );
  const past = appointments.filter(
    (a) =>
      !isAfter(parseISO(a.appointmentDate), new Date(new Date().setDate(new Date().getDate() - 1))) ||
      a.status === "Completed" ||
      a.status === "Cancelled"
  );

  const AppointmentCard = ({ appointment }: { appointment: AppointmentDto }) => (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{appointment.title}</h4>
          <p className="text-xs text-muted-foreground">{appointment.studentName}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {format(parseISO(appointment.appointmentDate), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {appointment.startTime} - {appointment.endTime}
            </span>
          </div>
          {appointment.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{appointment.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge className={statusColors[appointment.status] || "bg-muted"}>
          {appointment.status}
        </Badge>
        {appointment.status === "Pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50"
              disabled={confirmMutation.isPending}
              onClick={() => confirmMutation.mutate(appointment.id)}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => setCancelId(appointment.id)}
            >
              <XCircle className="h-4 w-4 mr-1" /> Decline
            </Button>
          </>
        )}
        {appointment.status === "Confirmed" && (
          <Button
            size="sm"
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={!appointment.canCancel}
            onClick={() => setCancelId(appointment.id)}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p>Loading your sessions…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Sessions</h1>
          <p className="text-muted-foreground">Manage your appointment requests and schedule</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pending.length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <CalendarDays className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{appointments.length}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">
              History ({past.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-3">
            {pending.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No pending requests at the moment.
                </CardContent>
              </Card>
            ) : (
              pending.map((a) => <AppointmentCard key={a.id} appointment={a} />)
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-3">
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No upcoming sessions scheduled.
                </CardContent>
              </Card>
            ) : (
              upcoming.map((a) => <AppointmentCard key={a.id} appointment={a} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {past.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No past sessions yet.
                </CardContent>
              </Card>
            ) : (
              past.map((a) => <AppointmentCard key={a.id} appointment={a} />)
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (cancelId) cancelMutation.mutate(cancelId);
                setCancelId(null);
              }}
            >
              Cancel Appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}