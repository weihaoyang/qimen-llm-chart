import type { ChangeEvent, ChangeEventHandler, ComponentType, InputHTMLAttributes } from "react";
import SemiInput from "@douyinfe/semi-ui/lib/es/input";

const SemiInputCompat = SemiInput as unknown as ComponentType<Record<string, unknown>>;

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> & {
  onChange?: ChangeEventHandler<HTMLInputElement>;
  size?: "small" | "default" | "large";
};

function Input({ className, onChange, ...props }: InputProps) {
  return (
    <SemiInputCompat
      className={className}
      onChange={(_value: string, event: ChangeEvent<HTMLInputElement>) => onChange?.(event)}
      {...props}
    />
  );
}

export { Input };
