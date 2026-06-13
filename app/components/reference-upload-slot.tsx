"use client";

interface ReferenceUploadSlotProps {
  id: string;
  label: string;
  description: string;
  previewUrl: string | null;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
}

export default function ReferenceUploadSlot({
  id,
  label,
  description,
  previewUrl,
  disabled = false,
  onFileSelect,
}: ReferenceUploadSlotProps) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-secondary-foreground">
        {label}
      </label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>

      <div className="mt-4 flex min-h-[112px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-card/50">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="max-h-28 max-w-full object-contain"
          />
        ) : (
          <span className="px-3 text-center text-xs text-muted-foreground">
            JPG, PNG, or WebP up to 5MB
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <label
          htmlFor={id}
          className={`inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-secondary-foreground transition hover:border-ring/60 ${
            disabled ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          {previewUrl ? "Replace" : "Upload"}
        </label>
        {previewUrl && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onFileSelect(null)}
            className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-ring/60 hover:text-secondary-foreground disabled:opacity-60"
          >
            Remove
          </button>
        )}
      </div>

      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          onFileSelect(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
