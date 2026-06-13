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
    <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-zinc-200">
        {label}
      </label>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>

      <div className="mt-4 flex min-h-[112px] items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className="max-h-28 max-w-full object-contain"
          />
        ) : (
          <span className="px-3 text-center text-xs text-zinc-500">
            JPG, PNG, or WebP up to 5MB
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <label
          htmlFor={id}
          className={`inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:border-zinc-400 ${
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
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-60"
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
