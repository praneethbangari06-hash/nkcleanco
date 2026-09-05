import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type BookingStatus = "pending" | "assigned" | "completed" | "cancelled";

export interface BookingRow {
  id: string;
  reference: string;
  customer_name: string;
  phone: string;
  address: string;
  area: string;
  service_type: string;
  booking_date: string;
  time_slot: string;
  notes: string | null;
  price_min: number;
  price_max: number;
  status: BookingStatus;
  created_at: string;
  before_photo_path?: string | null;
  after_photo_path?: string | null;
  photo_check_result?: string | null;
  photo_check_reason?: string | null;
}

export const STATUS_META: Record<BookingStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-warning/15 text-warning-foreground border-warning/30",
  },
  assigned: {
    label: "Assigned",
    className: "bg-primary-soft text-primary border-primary/25",
  },
  completed: {
    label: "Completed",
    className: "bg-mint-soft text-mint border-mint/30",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive border-destructive/25",
  },
};

export const bookingsQueryKey = ["admin", "bookings"] as const;

export function useBookings() {
  return useQuery({
    queryKey: bookingsQueryKey,
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BookingRow[];
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BookingStatus }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKey });
      toast.success("Status updated");
    },
    onError: () => toast.error("Could not update the status"),
  });
}

export function midpointRevenue(booking: BookingRow) {
  return Math.round((booking.price_min + booking.price_max) / 2);
}
