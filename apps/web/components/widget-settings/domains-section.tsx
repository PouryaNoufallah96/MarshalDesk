"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type AddAllowedDomainInput,
  type AddAllowedDomainOutput,
  addAllowedDomainSchema,
} from "@marshaldesk/shared";
import { GlobeIcon, PlusIcon, XIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/dashboard/settings-section";
import { IconButton } from "@/components/dashboard/icon-button";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { WidgetSettingsForm } from "./form";

export function DomainsSection({
  form,
  domains,
}: {
  form: WidgetSettingsForm;
  domains: readonly string[];
}) {
  const addForm = useForm<
    AddAllowedDomainInput,
    unknown,
    AddAllowedDomainOutput
  >({
    resolver: zodResolver(addAllowedDomainSchema),
    defaultValues: { domain: "" },
  });
  const { errors } = addForm.formState;

  function setDomains(next: string[]) {
    form.setValue("allowedDomains", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const onAdd = addForm.handleSubmit(({ domain }) => {
    if (domains.includes(domain)) {
      addForm.setError("domain", {
        message: `${domain} is already on the list.`,
      });
      return;
    }
    setDomains([...domains, domain]);
    addForm.reset();
  });

  return (
    <SettingsSection
      id="domains"
      title="Allowed domains"
      description="The widget only loads on these websites."
    >
      <SettingsRow
        label="Add a domain"
        htmlFor="allowed-domain"
        description="Add each subdomain on its own, for example both example.com and www.example.com."
      >
        <form onSubmit={onAdd} noValidate>
          <Field data-invalid={!!errors.domain}>
            <div className="flex gap-2">
              <Input
                id="allowed-domain"
                size="lg"
                placeholder="example.com"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={!!errors.domain}
                {...addForm.register("domain")}
              />
              <Button type="submit" size="lg" variant="outline">
                <PlusIcon data-icon="inline-start" aria-hidden />
                Add
              </Button>
            </div>
            <FieldError errors={[errors.domain]} />
            {errors.domain ? null : (
              <FieldDescription>
                Pasting a full address works too. Only the domain is kept.
              </FieldDescription>
            )}
          </Field>
        </form>
      </SettingsRow>

      {domains.length === 0 ? (
        <p className="bg-muted/40 px-4 py-3 text-sm text-muted-foreground md:px-5">
          No allowed domains yet. The widget won&apos;t load anywhere until you
          add one.
        </p>
      ) : (
        <ul>
          {domains.map((domain) => (
            <li
              key={domain}
              className="flex items-center gap-3 py-2 pr-2.5 pl-4 md:pl-5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <GlobeIcon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                {domain}
              </span>
              <IconButton
                label={`Remove ${domain}`}
                onClick={() =>
                  setDomains(domains.filter((item) => item !== domain))
                }
              >
                <XIcon aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </SettingsSection>
  );
}
