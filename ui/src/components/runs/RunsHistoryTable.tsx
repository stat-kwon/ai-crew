"use client";

import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Box from "@cloudscape-design/components/box";
import Pagination from "@cloudscape-design/components/pagination";
import TextFilter from "@cloudscape-design/components/text-filter";
import { useState } from "react";

interface RunEntry {
  id: string;
  intent: string;
  status: string;
  startedAt: string;
  completedAt?: string;
}

interface RunsHistoryTableProps {
  runs: RunEntry[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function formatDuration(startedAt: string, completedAt?: string): string {
  if (!completedAt) return "진행 중...";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const duration = Math.round((end - start) / 1000);

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

export function RunsHistoryTable({ runs }: RunsHistoryTableProps) {
  const [filterText, setFilterText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredRuns = runs.filter(
    (run) =>
      run.id.toLowerCase().includes(filterText.toLowerCase()) ||
      run.intent.toLowerCase().includes(filterText.toLowerCase())
  );

  const paginatedRuns = filteredRuns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPages = Math.ceil(filteredRuns.length / pageSize);

  return (
    <Table
      header={
        <Header
          counter={`(${runs.length})`}
          description="과거 실행 기록"
        >
          실행 기록
        </Header>
      }
      columnDefinitions={[
        {
          id: "id",
          header: "실행 ID",
          cell: (item) => (
            <Box fontWeight="bold">{item.id}</Box>
          ),
          sortingField: "id",
        },
        {
          id: "intent",
          header: "의도",
          cell: (item) => item.intent || "-",
          sortingField: "intent",
        },
        {
          id: "status",
          header: "상태",
          cell: (item) => (
            <StatusIndicator
              type={
                item.status === "completed"
                  ? "success"
                  : item.status === "running"
                    ? "in-progress"
                    : item.status === "failed"
                      ? "error"
                      : "pending"
              }
            >
              {item.status}
            </StatusIndicator>
          ),
          sortingField: "status",
        },
        {
          id: "startedAt",
          header: "시작 시간",
          cell: (item) => formatDate(item.startedAt),
          sortingField: "startedAt",
        },
        {
          id: "duration",
          header: "소요 시간",
          cell: (item) => formatDuration(item.startedAt, item.completedAt),
        },
      ]}
      items={paginatedRuns}
      filter={
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder="실행 검색"
          filteringAriaLabel="실행 필터"
          onChange={({ detail }) => setFilterText(detail.filteringText)}
        />
      }
      pagination={
        totalPages > 1 ? (
          <Pagination
            currentPageIndex={currentPage}
            pagesCount={totalPages}
            onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
          />
        ) : undefined
      }
      empty={
        <Box textAlign="center" color="inherit" padding="l">
          <SpaceBetween size="m">
            <Box variant="strong">실행 기록 없음</Box>
            <Box variant="p" color="inherit">
              아직 실행 기록이 없습니다.
            </Box>
          </SpaceBetween>
        </Box>
      }
    />
  );
}
