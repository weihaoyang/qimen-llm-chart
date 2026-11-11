/** Keep a failed optional calculation from breaking other workbench modes. */
export function captureCalculation<T>(calculate: () => T): { value: T | null; error: string | null } {
  try {
    return { value: calculate(), error: null };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "计算失败，请检查输入后重试。" };
  }
}
