import { describe, it, expect } from "vitest";
import { groupDocsByFolder, getFileLabel } from "../docs/helpers";

describe("getFileLabel", () => {
  it("알려진 파일명은 한글 레이블을 반환한다", () => {
    expect(getFileLabel("requirements.md")).toBe("요구사항 문서");
    expect(getFileLabel("unit-of-work.md")).toBe("유닛 정의");
    expect(getFileLabel("audit.md")).toBe("감사 로그");
  });

  it("알려지지 않은 파일명은 확장자를 제거하고 하이픈을 공백으로 변환한다", () => {
    expect(getFileLabel("some-unknown-file.md")).toBe("some unknown file");
  });

  it("언더스코어도 공백으로 변환한다", () => {
    expect(getFileLabel("my_custom_doc.md")).toBe("my custom doc");
  });
});

describe("groupDocsByFolder", () => {
  it("inception 폴더의 문서를 올바른 그룹으로 매핑한다", () => {
    const docs = [
      {
        name: "requirements.md",
        path: "inception/requirements/requirements.md",
        stage: "inception",
      },
      {
        name: "unit-of-work.md",
        path: "inception/application-design/unit-of-work.md",
        stage: "inception",
      },
    ];

    const groups = groupDocsByFolder(docs);

    const reqGroup = groups.find(
      (g) => g.folder === "inception/requirements",
    );
    expect(reqGroup).toBeDefined();
    expect(reqGroup!.label).toBe("요구사항 분석");
    expect(reqGroup!.files).toHaveLength(1);
    expect(reqGroup!.files[0].label).toBe("요구사항 문서");

    const designGroup = groups.find(
      (g) => g.folder === "inception/application-design",
    );
    expect(designGroup).toBeDefined();
    expect(designGroup!.label).toBe("애플리케이션 설계");
  });

  it("빈 docs 배열은 빈 groups를 반환한다", () => {
    const groups = groupDocsByFolder([]);
    expect(groups).toHaveLength(0);
  });

  it("그룹은 sortOrder 기준으로 정렬된다", () => {
    const docs = [
      {
        name: "unit-of-work.md",
        path: "inception/application-design/unit-of-work.md",
        stage: "inception",
      },
      {
        name: "requirements.md",
        path: "inception/requirements/requirements.md",
        stage: "inception",
      },
    ];

    const groups = groupDocsByFolder(docs);
    expect(groups[0].folder).toBe("inception/requirements"); // sortOrder 1
    expect(groups[1].folder).toBe("inception/application-design"); // sortOrder 4
  });

  it("매핑에 없는 폴더는 폴더명을 label로 사용한다", () => {
    const docs = [
      {
        name: "notes.md",
        path: "custom/subfolder/notes.md",
        stage: "custom",
      },
    ];

    const groups = groupDocsByFolder(docs);
    expect(groups).toHaveLength(1);
    expect(groups[0].folder).toBe("custom/subfolder");
    expect(groups[0].label).toBe("subfolder");
    expect(groups[0].sortOrder).toBe(100);
  });
});
