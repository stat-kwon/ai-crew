export interface DocFile {
  name: string;
  path: string;
  stage?: string;
}

export interface DocGroupFile {
  name: string;
  label: string;
  path: string;
}

export interface DocGroup {
  folder: string;
  label: string;
  sortOrder: number;
  files: DocGroupFile[];
}

interface FolderMapping {
  folder: string;
  groupLabel: string;
  sortOrder: number;
}

export const FOLDER_MAPPINGS: FolderMapping[] = [
  {
    folder: "inception/requirements",
    groupLabel: "요구사항 분석",
    sortOrder: 1,
  },
  {
    folder: "inception/user-stories",
    groupLabel: "사용자 시나리오",
    sortOrder: 2,
  },
  { folder: "inception/plans", groupLabel: "작업 계획", sortOrder: 3 },
  {
    folder: "inception/application-design",
    groupLabel: "애플리케이션 설계",
    sortOrder: 4,
  },
];

export const FILE_LABEL_MAP: Record<string, string> = {
  "requirements.md": "요구사항 문서",
  "user-stories.md": "사용자 스토리",
  "workflow-plan.md": "워크플로우 계획",
  "unit-of-work.md": "유닛 정의",
  "unit-of-work-dependency.md": "유닛 의존성 매트릭스",
  "aidlc-state.md": "AI-DLC 상태 추적",
  "audit.md": "감사 로그",
};

export function getFileLabel(fileName: string): string {
  return (
    FILE_LABEL_MAP[fileName] ||
    fileName.replace(/\.md$/, "").replace(/[-_]/g, " ")
  );
}

export function groupDocsByFolder(docs: DocFile[]): DocGroup[] {
  if (docs.length === 0) return [];

  const groupMap = new Map<string, DocGroup>();

  for (const doc of docs) {
    // Extract folder path (everything except the filename)
    const parts = doc.path.split("/");
    if (parts.length < 2) continue;

    const folder = parts.slice(0, -1).join("/");
    const fileName = parts[parts.length - 1];

    if (!groupMap.has(folder)) {
      const mapping = FOLDER_MAPPINGS.find((m) => m.folder === folder);
      groupMap.set(folder, {
        folder,
        label: mapping?.groupLabel || folder.split("/").pop() || folder,
        sortOrder: mapping?.sortOrder || 100,
        files: [],
      });
    }

    groupMap.get(folder)!.files.push({
      name: fileName,
      label: getFileLabel(fileName),
      path: doc.path,
    });
  }

  return Array.from(groupMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}
