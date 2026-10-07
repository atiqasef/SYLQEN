"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthAlert } from "@/components/auth/auth-form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGER_TYPES,
  MAX_AUTOMATION_ACTIONS,
  MAX_AUTOMATION_CONDITIONS,
  allowedConditionFieldsForTrigger,
  summarizeAutomation,
  type AutomationAction,
  type AutomationCondition,
  type AutomationInput,
  type AutomationTrigger,
  type AutomationTriggerType,
} from "@/features/automations/schemas";
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS } from "@/features/projects/schemas";
import {
  createAutomationAction,
  updateAutomationAction,
} from "@/server/automations/actions";
import { cn } from "@/lib/utils/cn";

type AutomationFormProps = {
  mode: "create" | "edit";
  automationId?: string;
  initialValues?: Partial<AutomationInput>;
  readOnly?: boolean;
  readOnlyMessage?: string;
  cancelHref: string;
};

type FieldErrors = Record<string, string[] | undefined>;

const selectClassName = cn(
  "flex h-10 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 py-2 text-sm text-foreground shadow-panel transition-ui",
  "focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

function defaultCondition(
  trigger: AutomationTriggerType,
): AutomationCondition | null {
  const fields = allowedConditionFieldsForTrigger(trigger);
  const field = fields[0];
  if (!field) {
    return null;
  }
  switch (field) {
    case "invoice.currency":
    case "payment.currency":
      return { field, operator: "equals", value: "USD" };
    case "invoice.total":
      return { field, operator: "greater_than", value: 1000 };
    case "payment.amount":
      return { field, operator: "greater_than", value: 100 };
    case "customer.company":
    case "customer.email":
      return { field, operator: "exists", value: true };
    case "project.status":
    case "project.previous_status":
      return { field, operator: "equals", value: "active" };
    default:
      return null;
  }
}

export function AutomationForm({
  mode,
  automationId,
  initialValues,
  readOnly = false,
  readOnlyMessage,
  cancelHref,
}: AutomationFormProps) {
  const router = useRouter();
  const [name, setName] = React.useState(initialValues?.name ?? "");
  const [description, setDescription] = React.useState(
    initialValues?.description ?? "",
  );
  const [enabled, setEnabled] = React.useState(initialValues?.enabled ?? true);
  const [triggerType, setTriggerType] = React.useState<AutomationTriggerType>(
    initialValues?.trigger?.type ?? "customer.created",
  );
  const [conditions, setConditions] = React.useState<AutomationCondition[]>(
    initialValues?.conditions ?? [],
  );
  const [actions, setActions] = React.useState<AutomationAction[]>(
    initialValues?.actions ?? [
      {
        type: "notification.create",
        title: "Automation alert",
        message: "An automation ran for this workspace event.",
      },
    ],
  );
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>();
  const [pending, setPending] = React.useState(false);

  const disabled = pending || readOnly;
  const trigger: AutomationTrigger = { type: triggerType };

  const summary = summarizeAutomation({
    trigger,
    conditions,
    actions,
  });

  function changeTrigger(next: AutomationTriggerType) {
    setTriggerType(next);
    const allowed = new Set(allowedConditionFieldsForTrigger(next));
    setConditions((current) =>
      current.filter((condition) => allowed.has(condition.field)),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (readOnly) {
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors(undefined);

    const payload: AutomationInput = {
      name,
      description: description || undefined,
      enabled,
      trigger,
      conditions,
      actions,
    };

    const result =
      mode === "create"
        ? await createAutomationAction(payload)
        : await updateAutomationAction(automationId!, payload);

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      setFieldErrors(result.fieldErrors);
      return;
    }

    router.push(`/automations/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-6">
      {readOnly && readOnlyMessage ? (
        <p
          role="status"
          className="rounded-[var(--radius-md)] border border-border bg-muted/60 px-3 py-2 text-sm text-muted-foreground"
        >
          {readOnlyMessage}
        </p>
      ) : null}
      {error ? <AuthAlert>{error}</AuthAlert> : null}

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Basics</h3>
        <div className="space-y-2">
          <Label htmlFor="automation-name">Name</Label>
          <Input
            id="automation-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={disabled}
            required
            maxLength={120}
          />
          {fieldErrors?.name?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.name[0]}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="automation-description">Description</Label>
          <Textarea
            id="automation-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={disabled}
            rows={3}
            maxLength={500}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            disabled={disabled}
            className="size-4 rounded border-input"
          />
          Enabled
        </label>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Trigger</h3>
        <div className="space-y-2">
          <Label htmlFor="automation-trigger">When</Label>
          <select
            id="automation-trigger"
            className={selectClassName}
            value={triggerType}
            disabled={disabled}
            onChange={(e) =>
              changeTrigger(e.target.value as AutomationTriggerType)
            }
          >
            {AUTOMATION_TRIGGER_TYPES.map((type) => (
              <option key={type} value={type}>
                {AUTOMATION_TRIGGER_LABELS[type]}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Conditions (AND)
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              disabled || conditions.length >= MAX_AUTOMATION_CONDITIONS
            }
            onClick={() => {
              const next = defaultCondition(triggerType);
              if (next) {
                setConditions((current) => [...current, next]);
              }
            }}
          >
            Add condition
          </Button>
        </div>
        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No conditions — the automation runs for every matching trigger.
          </p>
        ) : (
          <ul className="space-y-3">
            {conditions.map((condition, index) => (
              <li
                key={`${condition.field}-${index}`}
                className="grid gap-2 rounded-[var(--radius-md)] border border-border p-3 sm:grid-cols-[1fr_auto]"
              >
                <ConditionEditor
                  index={index}
                  condition={condition}
                  triggerType={triggerType}
                  disabled={disabled}
                  onChange={(next) =>
                    setConditions((current) =>
                      current.map((item, i) => (i === index ? next : item)),
                    )
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    setConditions((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-panel sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Actions</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || actions.length >= MAX_AUTOMATION_ACTIONS}
            onClick={() =>
              setActions((current) => [
                ...current,
                {
                  type: "notification.create",
                  title: "Automation alert",
                  message: "An automation ran for this workspace event.",
                },
              ])
            }
          >
            Add action
          </Button>
        </div>
        <ul className="space-y-3">
          {actions.map((action, index) => (
            <li
              key={`action-${index}`}
              className="space-y-2 rounded-[var(--radius-md)] border border-border p-3"
            >
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Create internal notification
              </p>
              <div className="space-y-2">
                <Label htmlFor={`action-title-${index}`}>Title</Label>
                <Input
                  id={`action-title-${index}`}
                  value={action.title}
                  disabled={disabled}
                  maxLength={120}
                  onChange={(e) =>
                    setActions((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, title: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`action-message-${index}`}>Message</Label>
                <Textarea
                  id={`action-message-${index}`}
                  value={action.message}
                  disabled={disabled}
                  rows={2}
                  maxLength={500}
                  onChange={(e) =>
                    setActions((current) =>
                      current.map((item, i) =>
                        i === index
                          ? { ...item, message: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              {actions.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() =>
                    setActions((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove action
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section
        className="rounded-[var(--radius-lg)] border border-border bg-muted/40 px-4 py-3 text-sm leading-6 text-muted-foreground"
        aria-live="polite"
      >
        <p className="font-medium text-foreground">Summary</p>
        <p className="mt-1">{summary}</p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled}>
          {mode === "create" ? "Create automation" : "Save changes"}
        </Button>
        <Button asChild type="button" variant="outline" disabled={pending}>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

function ConditionEditor({
  index,
  condition,
  triggerType,
  disabled,
  onChange,
}: {
  index: number;
  condition: AutomationCondition;
  triggerType: AutomationTriggerType;
  disabled: boolean;
  onChange: (next: AutomationCondition) => void;
}) {
  const fields = allowedConditionFieldsForTrigger(triggerType);
  const fieldId = `condition-field-${index}`;
  const operatorId = `condition-operator-${index}`;
  const valueId = `condition-value-${index}`;

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="space-y-1">
        <Label htmlFor={fieldId}>Field</Label>
        <select
          id={fieldId}
          className={selectClassName}
          disabled={disabled}
          value={condition.field}
          onChange={(e) => {
            const next = defaultConditionForField(
              e.target.value as AutomationCondition["field"],
            );
            if (next) {
              onChange(next);
            }
          }}
        >
          {fields.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor={operatorId}>Operator</Label>
        <Input id={operatorId} value={condition.operator} disabled readOnly />
      </div>
      <div className="space-y-1">
        <Label htmlFor={valueId}>Value</Label>
        {condition.field === "project.status" ||
        condition.field === "project.previous_status" ? (
          <select
            id={valueId}
            className={selectClassName}
            disabled={disabled}
            value={condition.value}
            onChange={(e) =>
              onChange({
                ...condition,
                value: e.target.value as (typeof PROJECT_STATUSES)[number],
              })
            }
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        ) : condition.operator === "exists" ? (
          <Input id={valueId} value="must exist" disabled readOnly />
        ) : (
          <Input
            id={valueId}
            disabled={disabled}
            value={String(condition.value)}
            onChange={(e) => {
              if (
                condition.field === "invoice.total" ||
                condition.field === "payment.amount"
              ) {
                onChange({
                  ...condition,
                  value: Number(e.target.value),
                });
              } else if (
                condition.field === "invoice.currency" ||
                condition.field === "payment.currency"
              ) {
                onChange({
                  ...condition,
                  value: e.target.value.toUpperCase(),
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

function defaultConditionForField(
  field: AutomationCondition["field"],
): AutomationCondition | null {
  switch (field) {
    case "invoice.currency":
    case "payment.currency":
      return { field, operator: "equals", value: "USD" };
    case "invoice.total":
      return { field, operator: "greater_than", value: 1000 };
    case "payment.amount":
      return { field, operator: "greater_than", value: 100 };
    case "customer.company":
    case "customer.email":
      return { field, operator: "exists", value: true };
    case "project.status":
    case "project.previous_status":
      return { field, operator: "equals", value: "active" };
    default:
      return null;
  }
}
