export type ResumeOption = {
  id: string;
  type: "base" | "version";
  label: string;
  detail: string;
  updatedAt: string;
};

export type ResumeSelection = {
  resumeVersion: string;
  resumeVersionId?: string;
  resumeSourceType?: "base" | "version" | "";
};

export function resumeSelectionValue(selection: ResumeSelection, options: ResumeOption[]) {
  const inferredType = selection.resumeSourceType || options.find((option) => option.id === selection.resumeVersionId)?.type || "";
  if (selection.resumeVersionId && inferredType) return `${inferredType}:${selection.resumeVersionId}`;
  return selection.resumeVersion ? "__legacy" : "__none";
}

export function applyResumeSelection<T extends ResumeSelection>(record: T, value: string, options: ResumeOption[]): T {
  if (value === "__none") return { ...record, resumeVersion: "", resumeVersionId: "", resumeSourceType: "" };
  if (value === "__legacy") return record;
  const separator = value.indexOf(":");
  const type = value.slice(0, separator), id = value.slice(separator + 1);
  if ((type !== "base" && type !== "version") || !id) return record;
  const option = options.find((item) => item.id === id && item.type === type);
  return option ? { ...record, resumeVersion: option.label, resumeVersionId: option.id, resumeSourceType: option.type } : record;
}
