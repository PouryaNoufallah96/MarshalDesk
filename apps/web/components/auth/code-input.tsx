"use client";

import { VERIFICATION_CODE_LENGTH } from "@marshaldesk/shared";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import type { Ref } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

function Slot({ index, invalid }: { index: number; invalid: boolean }) {
  return (
    <InputOTPSlot
      index={index}
      aria-invalid={invalid}
      className="size-11 text-lg"
    />
  );
}

/** The 6-digit emailed code, as two groups of three slots. */
export function CodeInput({
  id,
  name,
  ref,
  value,
  onChange,
  onBlur,
  invalid,
  autoFocus,
}: {
  id: string;
  name: string;
  ref?: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  invalid: boolean;
  autoFocus?: boolean;
}) {
  return (
    <InputOTP
      id={id}
      name={name}
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      maxLength={VERIFICATION_CODE_LENGTH}
      pattern={REGEXP_ONLY_DIGITS}
      autoComplete="one-time-code"
      autoFocus={autoFocus}
      containerClassName="justify-center gap-2"
    >
      <InputOTPGroup>
        <Slot index={0} invalid={invalid} />
        <Slot index={1} invalid={invalid} />
        <Slot index={2} invalid={invalid} />
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        <Slot index={3} invalid={invalid} />
        <Slot index={4} invalid={invalid} />
        <Slot index={5} invalid={invalid} />
      </InputOTPGroup>
    </InputOTP>
  );
}
