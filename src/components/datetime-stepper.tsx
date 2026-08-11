"use client";

type DateTimeStepperProps = {
  onShift: (hours: number) => void;
};

export function DateTimeStepper({ onShift }: DateTimeStepperProps) {
  return (
    <div className="datetime-stepper" role="group" aria-label="快速调整排盘时间">
      <button type="button" onClick={() => onShift(-2)}>− 时辰</button>
      <button type="button" onClick={() => onShift(2)}>+ 时辰</button>
      <button type="button" onClick={() => onShift(-24)}>− 1天</button>
      <button type="button" onClick={() => onShift(24)}>+ 1天</button>
    </div>
  );
}
