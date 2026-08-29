import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ClipboardCopy, Download, Link2, Upload } from "lucide-react";
import { useSession, useSettings, useTemplates } from "@/lib/kb-store";
import type { Template } from "@/lib/kb-types";
import {
  SCHEMA_PATH,
  mergeTemplates,
  parsePlan,
  serializePlan,
} from "@/lib/kb-template-import";

type Mode = "merge" | "replace";

export function ImportPlanCard() {
  const [templates, setTemplates] = useTemplates();
  const [settings] = useSettings();
  const [session] = useSession();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [mode, setMode] = useState<Mode>("merge");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Template[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setRaw("");
    setErrors([]);
    setPreview(null);
  };

  const validate = (text: string) => {
    const result = parsePlan(text, { restSec: settings.defaultRestSec });
    if (result.ok) {
      setPreview(result.templates);
      setErrors([]);
    } else {
      setPreview(null);
      setErrors(result.errors);
    }
  };

  const copySchemaLink = async () => {
    const url = `${window.location.origin}${SCHEMA_PATH}`;
    await navigator.clipboard.writeText(url);
    toast.success("Schema link copied", { description: url });
  };

  const copyCurrentPlan = async () => {
    await navigator.clipboard.writeText(serializePlan(templates));
    toast.success("Current plan copied as JSON");
  };

  const affectsSession = (incoming: Template[]) =>
    !!session &&
    (mode === "replace" ||
      incoming.some(
        (t) =>
          t.id === session.templateId ||
          templates.find((c) => c.id === session.templateId)?.name.trim().toLowerCase() ===
            t.name.trim().toLowerCase(),
      ));

  const apply = () => {
    if (!preview) return;
    if (affectsSession(preview) && !window.confirm("A workout is in progress and its template will change. Import anyway?")) {
      return;
    }
    setTemplates(mode === "replace" ? preview : mergeTemplates(templates, preview));
    toast.success(
      `Imported ${preview.length} template${preview.length === 1 ? "" : "s"}`,
    );
    reset();
    setOpen(false);
  };

  const existingLabel = (t: Template) =>
    templates.some(
      (c) => c.id === t.id || c.name.trim().toLowerCase() === t.name.trim().toLowerCase(),
    )
      ? "replaces existing"
      : "new";

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-display text-xl font-semibold">Import plan</p>
          <p className="text-xs text-muted-foreground">
            Paste JSON generated from the app schema
          </p>
        </div>
        <Upload className="size-5 text-muted-foreground" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copySchemaLink}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold text-secondary-foreground"
            >
              <Link2 className="size-4" /> Copy schema link
            </button>
            <button
              onClick={copyCurrentPlan}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-3 text-sm font-semibold text-secondary-foreground"
            >
              <ClipboardCopy className="size-4" /> Copy current plan
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Give the schema link to your AI coach and ask it to return JSON matching it.
          </p>

          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setErrors([]);
              setPreview(null);
            }}
            rows={8}
            spellCheck={false}
            placeholder='{ "version": 1, "templates": [ ... ] }'
            className="w-full rounded-xl border border-input bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
          />

          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                setRaw(text);
                validate(text);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
            >
              <Download className="size-4" /> Choose file
            </button>
            <button
              onClick={() => validate(raw)}
              disabled={!raw.trim()}
              className="h-12 flex-1 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground disabled:opacity-40"
            >
              Preview
            </button>
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4" /> Couldn&apos;t read this plan
              </p>
              <ul className="mt-2 space-y-1 text-xs text-destructive">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="rounded-xl bg-background/50 p-3">
                <p className="text-sm font-semibold">
                  {preview.length} template{preview.length === 1 ? "" : "s"} found
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {preview.map((t) => (
                    <li key={t.id}>
                      {t.name}
                      {t.subtitle ? ` — ${t.subtitle}` : ""} ({t.exercises.length} exercises) —{" "}
                      <span className="text-foreground">
                        {mode === "replace" ? "imported" : existingLabel(t)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-2">
                {(
                  [
                    ["merge", "Merge"],
                    ["replace", "Replace all"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => setMode(value)}
                    className={`h-12 flex-1 rounded-xl text-sm font-bold ${
                      mode === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                onClick={apply}
                className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
              >
                Import {preview.length} template{preview.length === 1 ? "" : "s"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
