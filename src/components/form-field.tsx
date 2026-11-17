import { Label } from "@/components/ui/label";

/**
 * Label + input + error/hint, shared by every form.
 * The error and the hint get ids (`{id}-error`, `{id}-hint`): pass
 * `describedBy(id, { error, hint })` to the input's aria-describedby so screen
 * readers announce them with the field.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          data-testid={`${id}-error`}
          className="text-sm text-destructive"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Value for aria-describedby: the error when there is one, otherwise the hint. */
export function describedBy(
  id: string,
  { error, hint }: { error?: string; hint?: string },
): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}
