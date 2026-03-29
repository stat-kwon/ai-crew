import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TimelineFilter } from "../TimelineFilter";

describe("TimelineFilter", () => {
  const defaultProps = {
    statusFilter: "all" as const,
    searchQuery: "",
    onStatusFilterChange: vi.fn(),
    onSearchQueryChange: vi.fn(),
  };

  it("should render search input with correct placeholder", () => {
    render(<TimelineFilter {...defaultProps} />);
    expect(screen.getByPlaceholderText("런 검색...")).toBeInTheDocument();
  });

  it("should render status filter dropdown", () => {
    render(<TimelineFilter {...defaultProps} />);
    expect(screen.getByLabelText("상태 필터")).toBeInTheDocument();
  });

  it("should call onSearchQueryChange when typing in search", () => {
    const onSearchQueryChange = vi.fn();
    render(
      <TimelineFilter
        {...defaultProps}
        onSearchQueryChange={onSearchQueryChange}
      />
    );

    const searchInput = screen.getByLabelText("런 검색");
    fireEvent.change(searchInput, { target: { value: "test" } });

    expect(onSearchQueryChange).toHaveBeenCalledWith("test");
  });

  it("should call onStatusFilterChange when selecting a filter", () => {
    const onStatusFilterChange = vi.fn();
    render(
      <TimelineFilter
        {...defaultProps}
        onStatusFilterChange={onStatusFilterChange}
      />
    );

    const select = screen.getByLabelText("상태 필터");
    fireEvent.change(select, { target: { value: "completed" } });

    expect(onStatusFilterChange).toHaveBeenCalledWith("completed");
  });

  it("should display all filter options", () => {
    render(<TimelineFilter {...defaultProps} />);
    const select = screen.getByLabelText("상태 필터");
    const options = select.querySelectorAll("option");

    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("전체");
    expect(options[1]).toHaveTextContent("진행 중");
    expect(options[2]).toHaveTextContent("완료");
    expect(options[3]).toHaveTextContent("실패");
  });
});
