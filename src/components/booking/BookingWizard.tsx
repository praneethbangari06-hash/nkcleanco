import { ClientOnly, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  CookingPot,
  Crosshair,
  Home,
  Info,
  Loader2,
  Map as MapIcon,
  MapPin,
  Phone,
  Sofa,
  Sparkles,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { requestAutoAssignment } from "@/lib/booking.functions";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode.functions";
import {
  AREA_COORDS,
  CONFIRMATION_KEY,
  SERVICES,
  SERVICE_AREAS,
  TIME_SLOTS,
  bookingSchema,
  cleanAddressText,
  getService,
  inr,
  newReference,
  prettyDate,
  slotLabel,
  todayIso,
  type BookingInput,
  type ServiceId,
} from "@/lib/nkcleanco";

const PinPickerMap = lazy(() => import("@/components/booking/PinPickerMap"));

const ICONS: Record<ServiceId, LucideIcon> = {
  home: Home,
  deep: Sparkles,
  bathroom: Bath,
  kitchen: CookingPot,
  sofa: Sofa,
  office: Building2,
};

const STEPS = ["Service", "Address", "Date & time", "Contact", "Review"];

type Draft = Partial<BookingInput>;
type Point = { lat: number; lng: number };

const OTHER_AREA = "__other__";

export function BookingWizard({ initialService }: { initialService?: string | undefined }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(initialService && getService(initialService) ? 1 : 0);
  const [draft, setDraft] = useState<Draft>(() =>
    getService(initialService) ? { serviceType: initialService as ServiceId } : {},
  );
  const [areaChoice, setAreaChoice] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  /** Exact coordinates captured from GPS or the map pin (wins over typed text). */
  const [point, setPoint] = useState<Point | null>(null);
  const [source, setSource] = useState<"gps" | "map" | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [resolved, setResolved] = useState<string>("");

  const mapCenter: Point =
    point ?? AREA_COORDS[draft.area ?? ""] ?? AREA_COORDS["Narsingi"] ?? { lat: 17.3894, lng: 78.3517 };

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Your browser doesn't support location. Please pick on the map instead.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPoint(next);
        setSource("gps");
        setShowMap(false);
        try {
          const info = await reverseGeocode({ data: next });
          if (info) {
            setResolved(info.display);
            setDraft((prev) => ({
              ...prev,
              flat: prev.flat?.trim() ? prev.flat : info.flat || prev.flat,
              street: prev.street?.trim() ? prev.street : info.street,
            }));
            setErrors({});
          }
        } catch {
          /* keep GPS coords even if the address lookup fails */
        }
        setGpsBusy(false);
        toast.success("Location captured");
      },
      () => {
        setGpsBusy(false);
        toast.error("We couldn't get your location. Allow location access or pick on the map.");
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };


  const service = getService(draft.serviceType);
  const minDate = todayIso();

  const set = <K extends keyof BookingInput>(key: K, value: BookingInput[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const fieldsForStep = useMemo<Record<number, (keyof BookingInput)[]>>(
    () => ({
      0: ["serviceType"],
      1: ["flat", "street", "area"],
      2: ["date", "slot"],
      3: ["name", "phone"],
      4: [],
    }),
    [],
  );

  const validateStep = (index: number) => {
    const result = bookingSchema.safeParse(draft);
    if (result.success) return true;
    const relevant = fieldsForStep[index] ?? [];
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0]);
      if (relevant.includes(key as keyof BookingInput) && !next[key]) next[key] = issue.message;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    const parsed = bookingSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error("Some details are missing. Please review the earlier steps.");
      setStep(0);
      return;
    }
    const data = parsed.data;
    const picked = getService(data.serviceType)!;

    setSubmitting(true);
    setLocating(true);

    // Geocode the exact typed address so tracking + distance use the real location.
    let point: { lat: number; lng: number } | null = null;
    try {
      point = await geocodeAddress({
        data: { flat: data.flat, street: data.street, area: data.area },
      });
    } catch {
      point = null;
    }
    setLocating(false);

    const record = {
      reference: newReference(),
      customer_name: data.name,
      phone: data.phone,
      address: `${data.flat}, ${data.street}`,
      area: data.area,
      service_type: picked.name,
      booking_date: data.date,
      time_slot: data.slot,
      notes: data.notes ?? null,
      price_min: picked.priceMin,
      price_max: picked.priceMax,
      customer_lat: point?.lat ?? null,
      customer_lng: point?.lng ?? null,
    };

    const { error } = await supabase.from("bookings").insert(record);
    setSubmitting(false);

    if (error) {
      toast.error("We couldn't save your booking. Please try again or call us.");
      return;
    }

    // Kick off automatic assignment to the nearest online cleaner.
    void requestAutoAssignment({
      data: { reference: record.reference, phone: record.phone },
    }).catch(() => undefined);

    sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(record));
    navigate({ to: "/booking-confirmed" });
  };

  return (
    <div className="section-shell max-w-3xl pb-24 pt-8 sm:pt-12">
      <Stepper step={step} />

      <div className="mt-8 rounded-3xl border border-border bg-card p-5 shadow-card sm:p-8">
        {step === 0 && (
          <StepBlock
            title="What do you need cleaned?"
            hint="Pick one service — you can add notes later."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((item) => {
                const Icon = ICONS[item.id];
                const active = draft.serviceType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => set("serviceType", item.id)}
                    aria-pressed={active}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-smooth active:scale-[0.98] ${
                      active
                        ? "border-primary bg-primary-soft shadow-glow"
                        : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-smooth ${
                        active
                          ? "bg-gradient-primary text-primary-foreground"
                          : "bg-primary-soft text-primary"
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{item.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.blurb}
                      </span>
                      <span className="mt-2 block text-xs font-semibold text-primary">
                        from {inr(item.from)} · {item.duration}
                      </span>
                    </span>
                    {active && <Check className="ml-auto size-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
            <FieldError message={errors["serviceType"]} />
          </StepBlock>
        )}

        {step === 1 && (
          <StepBlock title="Where should we come?" hint="We only serve three areas right now.">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="flat">House / flat number</Label>
                <Input
                  id="flat"
                  inputMode="text"
                  autoComplete="address-line1"
                  placeholder="Flat 402, Tower B"
                  value={draft.flat ?? ""}
                  onChange={(e) => set("flat", e.target.value)}
                  className="mt-1.5 h-12"
                />
                <FieldError message={errors["flat"]} />
              </div>

              <div>
                <Label htmlFor="street">Street / apartment / landmark</Label>
                <Input
                  id="street"
                  autoComplete="address-line2"
                  placeholder="My Home Avatar, Outer Ring Road"
                  value={draft.street ?? ""}
                  onChange={(e) => set("street", e.target.value)}
                  className="mt-1.5 h-12"
                />
                <FieldError message={errors["street"]} />
              </div>

              <div>
                <Label htmlFor="area">Area</Label>
                <select
                  id="area"
                  value={areaChoice}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAreaChoice(value);
                    if (value === OTHER_AREA || value === "") {
                      setDraft((prev) => {
                        const next = { ...prev };
                        delete next.area;
                        return next;
                      });
                    } else {
                      set("area", value as BookingInput["area"]);
                    }
                  }}
                  className="mt-1.5 h-12 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-soft transition-smooth focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="">Select your area</option>
                  {SERVICE_AREAS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                  <option value={OTHER_AREA}>Somewhere else in Hyderabad</option>
                </select>
                {areaChoice === OTHER_AREA ? (
                  <p className="mt-3 flex gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3.5 text-sm font-medium text-warning-foreground">
                    <Info className="mt-0.5 size-4 shrink-0" />
                    We currently serve Narsingi, Kokapet and Kanapur — expanding soon! Call us and
                    we&apos;ll tell you the moment your area goes live.
                  </p>
                ) : (
                  <FieldError message={errors["area"]} />
                )}
              </div>
            </div>
          </StepBlock>
        )}

        {step === 2 && (
          <StepBlock title="When works for you?" hint="Same-day slots close at 4 PM.">
            <div>
              <Label htmlFor="date" className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />
                Preferred date
              </Label>
              <Input
                id="date"
                type="date"
                min={minDate}
                value={draft.date ?? ""}
                onChange={(e) => set("date", e.target.value)}
                className="mt-1.5 h-12"
              />
              <FieldError message={errors["date"]} />
            </div>

            <div className="mt-6">
              <Label className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Time slot
              </Label>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {TIME_SLOTS.map((slot) => {
                  const active = draft.slot === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => set("slot", slot.id)}
                      className={`rounded-2xl border p-4 text-left transition-smooth active:scale-[0.98] ${
                        active
                          ? "border-primary bg-primary-soft shadow-glow"
                          : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
                      }`}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-bold text-ink">{slot.label}</span>
                        {active && <Check className="size-4 text-primary" />}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">{slot.window}</span>
                      <span className="mt-2 inline-block rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-semibold text-mint">
                        {slot.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
              <FieldError message={errors["slot"]} />
            </div>
          </StepBlock>
        )}

        {step === 3 && (
          <StepBlock title="How do we reach you?" hint="We call to confirm within 30 minutes.">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Full name
                </Label>
                <Input
                  id="name"
                  autoComplete="name"
                  placeholder="Praneeth Bangari"
                  value={draft.name ?? ""}
                  onChange={(e) => set("name", e.target.value)}
                  className="mt-1.5 h-12"
                />
                <FieldError message={errors["name"]} />
              </div>

              <div>
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  Mobile number
                </Label>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex h-12 items-center rounded-lg border border-input bg-muted px-3 text-sm font-semibold text-muted-foreground">
                    +91
                  </span>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="9876543210"
                    value={draft.phone ?? ""}
                    onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="h-12"
                  />
                </div>
                <FieldError message={errors["phone"]} />
              </div>

              <div>
                <Label htmlFor="notes">Anything we should know? (optional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  maxLength={400}
                  placeholder="3BHK, one bathroom has heavy hard-water stains, pet at home."
                  value={draft.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                  className="mt-1.5 resize-none"
                />
                <FieldError message={errors["notes"]} />
              </div>
            </div>
          </StepBlock>
        )}

        {step === 4 && service && (
          <StepBlock title="Review your booking" hint="Confirm and we'll take it from here.">
            <dl className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              <SummaryRow label="Service" value={service.name} />
              <SummaryRow
                label="Address"
                value={`${draft.flat}, ${draft.street}`}
                sub={`${draft.area}, Hyderabad`}
                icon={MapPin}
              />
              <SummaryRow
                label="Date & time"
                value={prettyDate(draft.date ?? "")}
                sub={slotLabel(draft.slot ?? "")}
                icon={CalendarDays}
              />
              <SummaryRow label="Contact" value={draft.name ?? ""} sub={`+91 ${draft.phone}`} />
              {draft.notes && <SummaryRow label="Notes" value={draft.notes} />}
            </dl>

            <div className="mt-5 rounded-2xl bg-gradient-primary p-5 shadow-glow">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
                Estimated price
              </p>
              <p className="font-display mt-1 text-2xl font-extrabold text-primary-foreground">
                {inr(service.priceMin)} – {inr(service.priceMax)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-primary-foreground/85">
                Final amount is confirmed on the call based on home size and condition. Pay after the
                cleaning is done.
              </p>
            </div>

            <Button
              variant="hero"
              size="xl"
              className="mt-6 w-full"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  {locating ? "Pinpointing your address…" : "Confirming…"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5" />
                  Confirm booking
                </>
              )}
            </Button>
          </StepBlock>
        )}

        {step < 4 && (
          <div className="mt-8 flex items-center gap-3">
            {step > 0 && (
              <Button variant="outline" size="lg" onClick={goBack} className="flex-1 sm:flex-none">
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button variant="hero" size="lg" onClick={goNext} className="flex-1">
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}

        {step === 4 && (
          <Button variant="ghost" size="lg" onClick={goBack} className="mt-3 w-full">
            <ArrowLeft className="size-4" />
            Edit details
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const progress = (step / (STEPS.length - 1)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-primary">
          Step {step + 1} of {STEPS.length}
        </span>
        <span className="text-muted-foreground">{STEPS[step]}</span>
      </div>
      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(progress, 6)}%` }}
        />
      </div>
      <ol className="mt-3 hidden justify-between sm:flex">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs font-semibold transition-smooth ${
              index <= step ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                index < step
                  ? "bg-mint text-mint-foreground"
                  : index === step
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {index < step ? <Check className="size-3" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up" key={title}>
      <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-destructive">{message}</p>;
}

function SummaryRow({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
  icon?: LucideIcon | undefined;
}) {
  return (
    <div className="flex gap-3 bg-card px-4 py-3.5">
      <dt className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-semibold text-foreground">
        <span className="flex items-start gap-1.5">
          {Icon && <Icon className="mt-0.5 size-4 shrink-0 text-primary" />}
          <span className="break-words">{value}</span>
        </span>
        {sub && <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{sub}</span>}
      </dd>
    </div>
  );
}
