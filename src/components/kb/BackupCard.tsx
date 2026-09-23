import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ClipboardCopy, DatabaseBackup, FileDown, FolderUp } from "lucide-react";
import { useLogs, useSession, useSettings, useTemplates } from "@/lib/kb-store";
import { copyText } from "@/lib/kb-export";
import {
  backupFileName,
  mergeBackup,
  parseBackup,
  serializeBackup,
  type BackupData,
  type MergeSummary,
} from "@/lib/kb-backup";

export function BackupCard() {
  const [templates, setTemplates] = useTemplates();
  const [logs, setLogs] = useLogs();
  const [settings, setSettings] = useSettings();
  const [session] = useSession();
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<BackupData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary: MergeSummary | null = useMemo(
    () => (pending ? mergeBackup({ templates, logs }, pending) : null),
    [pending, templates, logs],
  );

  const exportBackup = () => {
    const text = serializeBackup(templates, logs, settings);
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded", {
      description: `${logs.length} session${logs.length === 1 ? "" : "s"}, ${templates.length} templates`,
    });
  };

  const copyBackup = async () => {
    const ok = await copyText(serializeBackup(templates, logs, settings));
    toast[ok ? "success" : "error"](ok ? "Backup copied" : "Could not access the clipboard.");
  };

  const validate = (text: string) => {
    const result = parseBackup(text, { restSec: settings.defaultRestSec });
    if (result.ok) {
      setPending(result.data);
      setErrors([]);
    } else {
      setPending(null);
      setErrors(result.errors);
    }
  };

  const restore = () => {
    if (!summary || !pending) return;
    const touchesSession =
      !!session && pending.templates.some((t) => t.id === session.templateId);
    if (
      touchesSession &&
      !window.confirm("A workout is in progress and its routine will be updated. Restore anyway?")
    ) {
      return;
    }
    setTemplates(summary.templates);
    setLogs(summary.logs);
    if (pending.settings) setSettings(pending.settings);
    toast.success(
      `Restored — ${summary.counts.logsNew} new session${summary.counts.logsNew === 1 ? "" : "s"} added`,
    );
    setRaw("");
    setPending(null);
    setErrors([]);
  };

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-display text-xl font-semibold">Backup &amp; restore</p>
          <p className="text-xs text-muted-foreground">
            Save all history, routines and settings — or bring them back
          </p>
        </div>
        <DatabaseBackup className="size-5 text-muted-foreground" />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <button
            onClick={exportBackup}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground"
          >
            <FileDown className="size-4" /> Export backup
          </button>
          <button
            onClick={copyBackup}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground"
          >
            <ClipboardCopy className="size-4" /> Copy backup to clipboard
          </button>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold">Restore a backup</p>
            <textarea
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setErrors([]);
                setPending(null);
              }}
              rows={5}
              spellCheck={false}
              placeholder="Paste backup JSON, or choose a file below"
              className="mt-2 w-full rounded-xl border border-input bg-background p-3 font-mono text-xs text-foreground outline-none focus:border-primary"
            />
            <div className="mt-2 flex gap-2">
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
                <FolderUp className="size-4" /> Choose file
              </button>
              <button
                onClick={() => validate(raw)}
                disabled={!raw.trim()}
                className="h-12 flex-1 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground disabled:opacity-40"
              >
                Preview
              </button>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="rounded-xl bg-destructive/10 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="size-4" /> Couldn&apos;t read this backup
              </p>
              <ul className="mt-2 space-y-1 text-xs text-destructive">
                {errors.map((e) => (
                  <li key={e}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {summary && (
            <div className="space-y-3">
              <div className="rounded-xl bg-background/50 p-3 text-xs text-muted-foreground">
                <p className="text-sm font-semibold text-foreground">What will change</p>
                <ul className="mt-2 space-y-1">
                  <li>
                    {summary.counts.logsInFile} session
                    {summary.counts.logsInFile === 1 ? "" : "s"} in file —{" "}
                    {summary.counts.logsDuplicate} already here,{" "}
                    <span className="text-foreground">{summary.counts.logsNew} new</span>
                  </li>
                  <li>
                    {summary.counts.templatesInFile} template
                    {summary.counts.templatesInFile === 1 ? "" : "s"} —{" "}
                    {summary.counts.templatesReplaced} match existing, {summary.counts.templatesNew}{" "}
                    new
                  </li>
                  <li>
                    {summary.hasSettings
                      ? "Settings will be updated"
                      : "No settings in this file — yours stay as they are"}
                  </li>
                </ul>
              </div>
              <button
                onClick={restore}
                className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground"
              >
                Restore backup
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
