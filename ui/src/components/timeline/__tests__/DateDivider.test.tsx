import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DateDivider } from "../DateDivider";

describe("DateDivider", () => {
  it("should display the date text", () => {
    render(<DateDivider date="오늘" />);
    expect(screen.getByText("오늘")).toBeInTheDocument();
  });

  it("should display a custom date string", () => {
    render(<DateDivider date="2026년 3월 28일" />);
    expect(screen.getByText("2026년 3월 28일")).toBeInTheDocument();
  });

  it("should have the date-divider test id", () => {
    render(<DateDivider date="어제" />);
    expect(screen.getByTestId("date-divider")).toBeInTheDocument();
  });
});
