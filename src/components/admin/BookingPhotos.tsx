import { useQuery } from "@tanstack/react-query";
import { Images, Loader2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { bookingPhotoLinks } from "@/lib/job-photos.functions";
import type { BookingRow } from "@/lib/admin";

/** Small "needs photo review" flag plus a viewer for the before/after pair. */
export function BookingPhotoBadge({ booking }: { booking: BookingRow }) {
  const [open, setOpen] = useState(false);
  const hasPhotos = Boolean(booking.before_photo_path && booking.after_photo_path);
  const flagged = booking.photo_check_result === "flagged";

  const links = useQuery({
    queryKey: ["admin", "booking-photos", booking.id],
    enabled: open && hasPhotos,
    staleTime: 1000 * 60 * 20,
    queryFn: () => bookingPhotoLinks({ data: { bookingId: booking.id } }),
  });

  if (!hasPhotos) return null;


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={
          flagged
            ? (booking.photo_check_reason ?? "Photos need a manual review.")
            : "View before and after photos"
        }
        className={`mt-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-smooth hover:brightness-95 ${
          flagged
            ? "border-warning/40 bg-warning/15 text-warning-foreground"
            : "border-border bg-surface text-muted-foreground"
        }`}
      >
        {flagged ? <TriangleAlert className="size-3" /> : <Images className="size-3" />}
        {flagged ? "Needs photo review" : "Before / after"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Cleaning photos — {booking.reference}</DialogTitle>
            <DialogDescription>
              {flagged
                ? (booking.photo_check_reason ?? "Photos need a manual review.")
                : "Automatic photo check passed."}
            </DialogDescription>
          </DialogHeader>

          {links.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading photos…
            </div>
          ) : links.data?.before && links.data.after ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["Before", links.data.before],
                  ["After", links.data.after],
                ] as const
              ).map(([label, url]) => (
                <figure key={label}>
                  <figcaption className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </figcaption>
                  <img
                    src={url}
                    alt={`${label} cleaning photo for booking ${booking.reference}`}
                    className="w-full rounded-2xl border border-border object-cover"
                    loading="lazy"
                  />
                </figure>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-sm font-semibold text-muted-foreground">
              These photos are no longer available.
            </p>
          )}

          <Button variant="outline" className="mt-2" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
