import { Camera, Check, ImageUp } from "lucide-react";
import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";

/** Downscales a picked photo to a compact JPEG data URL so uploads stay fast on mobile data. */
async function toCompactDataUrl(file: File, maxSide = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.72);
}

function PhotoSlot({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      onChange(await toCompactDataUrl(file));
    } catch {
      toast.error("Could not read that photo. Please try another one.");
    }
  };

  return (
    <div className="flex-1">
      <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-surface transition-smooth active:scale-[0.98] disabled:opacity-60"
      >
        {value ? (
          <img src={value} alt={`${label} photo`} className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 px-2 text-center text-[11px] font-bold text-muted-foreground">
            <Camera className="size-6 text-primary" />
            {hint}
          </span>
        )}
      </button>
      <span className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
        {value ? (
          <>
            <Check className="size-3.5 text-success" /> Added — tap to retake
          </>
        ) : (
          <>
            <ImageUp className="size-3.5" /> Camera or gallery
          </>
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        aria-label={`${label} photo`}
        onChange={pick}
      />
    </div>
  );
}

export function CompletionPhotos({
  before,
  after,
  onBefore,
  onAfter,
  disabled,
}: {
  before: string | null;
  after: string | null;
  onBefore: (dataUrl: string) => void;
  onAfter: (dataUrl: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="mt-4 rounded-3xl border border-border bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Completion photos
      </p>
      <p className="mt-1.5 text-sm font-semibold text-muted-foreground">
        Add a before and an after photo of the space. Both are needed to finish the job.
      </p>
      <div className="mt-4 flex gap-3">
        <PhotoSlot
          label="Before"
          hint="Add before photo"
          value={before}
          onChange={onBefore}
          disabled={disabled}
        />
        <PhotoSlot
          label="After"
          hint="Add after photo"
          value={after}
          onChange={onAfter}
          disabled={disabled}
        />
      </div>
    </section>
  );
}
