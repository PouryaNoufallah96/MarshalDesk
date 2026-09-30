"use client";

import {
  GREETING_MAX_LENGTH,
  SUGGESTED_QUESTIONS_MAX,
} from "@marshaldesk/shared";
import { MessageCircleQuestionIcon } from "lucide-react";
import {
  SettingsRow,
  SettingsSection,
} from "@/components/dashboard/settings-section";
import { Badge } from "@/components/ui/badge";
import { FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { WidgetSettingsForm } from "./form";

export function MessagesSection({
  form,
  greeting,
  questions,
  agentEnabled,
}: {
  form: WidgetSettingsForm;
  greeting: string;
  questions: readonly string[];
  agentEnabled: boolean;
}) {
  const { errors } = form.formState;
  const length = greeting.trim().length;
  const overLimit = length > GREETING_MAX_LENGTH;

  return (
    <SettingsSection
      id="messages"
      title="Messages"
      description="What visitors see when they open the widget."
    >
      <SettingsRow
        label="Greeting"
        htmlFor="greeting"
        description="The first message in every conversation. It's shown even while the agent is off."
      >
        <Textarea
          id="greeting"
          rows={3}
          className="min-h-20"
          aria-invalid={!!errors.greeting}
          aria-describedby="greeting-count"
          {...form.register("greeting")}
        />
        <div className="flex items-start justify-between gap-4">
          <FieldError errors={[errors.greeting]} />
          <p
            id="greeting-count"
            className={cn(
              "ml-auto shrink-0 text-xs text-muted-foreground tabular-nums",
              overLimit && "text-destructive",
            )}
          >
            {length}/{GREETING_MAX_LENGTH}
          </p>
        </div>
      </SettingsRow>

      <SettingsRow
        label="Suggested questions"
        description="Generated from your knowledge base and updated whenever it changes. Visitors can tap one before they've typed anything."
      >
        {agentEnabled ? null : (
          <Badge variant="secondary" className="w-fit">
            Hidden while the agent is off
          </Badge>
        )}
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Questions show up here once your knowledge base has a ready source.
          </p>
        ) : (
          <ul
            className={cn(
              "flex flex-col divide-y rounded-lg ring-1 ring-foreground/10",
              !agentEnabled && "opacity-60",
            )}
          >
            {questions.slice(0, SUGGESTED_QUESTIONS_MAX).map((question) => (
              <li
                key={question}
                className="flex items-center gap-2.5 px-3 py-2.5 text-sm"
              >
                <MessageCircleQuestionIcon
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {question}
              </li>
            ))}
          </ul>
        )}
      </SettingsRow>
    </SettingsSection>
  );
}
