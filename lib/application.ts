export const STATUSES = ["准备投递", "已投递", "笔试", "面试", "等待结果", "获得Offer", "已拒绝", "已结束"] as const;
export const CATEGORIES = ["运营", "用户运营", "内容运营", "策略运营", "商业分析", "数据分析", "其他"] as const;

export type ApplicationRecord = {
  id: string; company: string; position: string; category: string; location: string;
  recruitmentType: string; description: string; requirements: string; jobUrl: string;
  source: string; appliedDate: string; deadline: string; channel: string; status: string;
  resumeVersion: string; notes: string; companyIntro: string; interviewExperience: string;
  writtenTestMaterials: string; commonQuestions: string; preparationNotes: string;
  createdAt: string; updatedAt: string;
};

export const emptyApplication = (): ApplicationRecord => ({
  id: "", company: "", position: "", category: "运营", location: "",
  recruitmentType: "校招", description: "", requirements: "", jobUrl: "", source: "",
  appliedDate: new Date().toISOString().slice(0, 10), deadline: "", channel: "",
  status: "准备投递", resumeVersion: "", notes: "", companyIntro: "",
  interviewExperience: "", writtenTestMaterials: "", commonQuestions: "",
  preparationNotes: "", createdAt: "", updatedAt: "",
});

export function calculateStats(items: ApplicationRecord[]) {
  const total = items.length;
  const replied = items.filter((x) => !["准备投递", "已投递"].includes(x.status)).length;
  const interviews = items.filter((x) => ["面试", "等待结果", "获得Offer"].includes(x.status)).length;
  const offers = items.filter((x) => x.status === "获得Offer").length;
  return { total, replied, interviews, offers, replyRate: total ? Math.round(replied / total * 100) : 0, interviewRate: total ? Math.round(interviews / total * 100) : 0 };
}
