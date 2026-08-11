"use client";

import {
  Children,
  isValidElement,
  type ReactNode,
  type ReactElement,
} from "react";
import SemiSelect from "@douyinfe/semi-ui/lib/es/select";

type SelectProps = {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

type SelectTriggerProps = {
  className?: string;
  size?: "sm" | "default";
  children?: ReactNode;
};

type SelectValueProps = {
  placeholder?: string;
};

type SelectContentProps = {
  className?: string;
  children?: ReactNode;
};

type SelectItemProps = {
  value: string;
  disabled?: boolean;
  children?: ReactNode;
};

type SelectGroupProps = { children?: ReactNode };
type SelectLabelProps = { children?: ReactNode };

const SelectValue = (_props: SelectValueProps) => null;
const SelectTrigger = (_props: SelectTriggerProps) => null;
const SelectContent = (_props: SelectContentProps) => null;
const SelectGroup = (_props: SelectGroupProps) => null;
const SelectLabel = (_props: SelectLabelProps) => null;
const SelectSeparator = () => null;
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

const SelectItem = (_props: SelectItemProps) => null;

const findChild = <T,>(children: ReactNode, component: (props: T) => null): ReactElement<T> | null => {
  let found: ReactElement<T> | null = null;
  Children.forEach(children, (child) => {
    if (!found && isValidElement(child) && child.type === component) {
      found = child as ReactElement<T>;
    }
  });
  return found;
};

const collectItems = (children: ReactNode, result: Array<{ value: string; label: ReactNode; disabled?: boolean }>) => {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === SelectItem) {
      const props = child.props as SelectItemProps;
      result.push({ value: props.value, label: props.children, disabled: props.disabled });
      return;
    }
    collectItems((child.props as { children?: ReactNode }).children, result);
  });
};

function Select({ value, defaultValue, onValueChange, disabled, className, children }: SelectProps) {
  const trigger = findChild<SelectTriggerProps>(children, SelectTrigger);
  const content = findChild<SelectContentProps>(children, SelectContent);
  const valueNode = trigger ? findChild<SelectValueProps>(trigger.props.children, SelectValue) : null;
  const options: Array<{ value: string; label: ReactNode; disabled?: boolean }> = [];
  collectItems(content?.props.children, options);

  return (
    <SemiSelect
      className={trigger?.props.className ?? className}
      defaultValue={defaultValue}
      disabled={disabled}
      optionList={options}
      placeholder={valueNode?.props.placeholder}
      value={value}
      onChange={(nextValue) => onValueChange?.(String(nextValue))}
    />
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
