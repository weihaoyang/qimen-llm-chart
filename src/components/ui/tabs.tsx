"use client";

import { Children, isValidElement, type ReactNode, type ReactElement } from "react";
import SemiTabs from "@douyinfe/semi-ui/lib/es/tabs";

type TabsProps = {
  className?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children?: ReactNode;
};

type TabsListProps = { className?: string; variant?: "default" | "line"; children?: ReactNode };
type TabsTriggerProps = { value: string; children?: ReactNode };
type TabsContentProps = { value: string; className?: string; children?: ReactNode };

const TabsList = (_props: TabsListProps) => null;
const TabsTrigger = (_props: TabsTriggerProps) => null;
const TabsContent = (_props: TabsContentProps) => null;

const findChild = <T,>(children: ReactNode, component: (props: T) => null): ReactElement<T> | null => {
  let found: ReactElement<T> | null = null;
  Children.forEach(children, (child) => {
    if (!found && isValidElement(child) && child.type === component) found = child as ReactElement<T>;
  });
  return found;
};

function Tabs({ className, defaultValue, value, onValueChange, children }: TabsProps) {
  const list = findChild<TabsListProps>(children, TabsList);
  const triggers: TabsTriggerProps[] = [];
  const collectTriggers = (nodes: ReactNode) => {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;

      if (child.type === TabsTrigger) {
        triggers.push(child.props as TabsTriggerProps);
        return;
      }

      // Conditional trigger groups are usually wrapped in a Fragment. Flatten
      // them here so every declared entry reaches the Semi tab bar.
      const nestedChildren = (child.props as { children?: ReactNode } | null)?.children;
      if (nestedChildren !== undefined) collectTriggers(nestedChildren);
    });
  };
  collectTriggers(list?.props.children);

  const contents = new Map<string, ReactNode>();
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === TabsContentMarker) {
      const props = child.props as TabsContentProps;
      contents.set(props.value, props.children);
    }
  });

  const activeKeyProps = value === undefined ? {} : { activeKey: value };

  return (
    <SemiTabs
      {...activeKeyProps}
      className={className}
      defaultActiveKey={defaultValue}
      onChange={(nextValue) => onValueChange?.(String(nextValue))}
      type="line"
    >
      {triggers.map((trigger) => (
        <SemiTabs.TabPane itemKey={trigger.value} key={trigger.value} tab={trigger.children}>
          <div className="inspector-tabs__content">{contents.get(trigger.value)}</div>
        </SemiTabs.TabPane>
      ))}
    </SemiTabs>
  );
}

function TabsContentMarker(props: TabsContentProps) { return <TabsContent {...props} />; }

export { Tabs, TabsList, TabsTrigger, TabsContentMarker as TabsContent };
