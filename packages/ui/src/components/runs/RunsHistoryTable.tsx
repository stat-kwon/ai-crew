"use client";

import { useRouter } from "next/navigation";
import Table from "@cloudscape-design/components/table";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Link from "@cloudscape-design/components/link";
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
  if (!completedAt) return "In progress...";
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const duration = Math.round((end - start) / 1000);

  if (duration < 60) return `${duration}s`;
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
}

export function RunsHistoryTable({ runs }: RunsHistoryTableProps) {
  const router = useRouter();
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
          description="Past execution runs"
        >
          Run History
        </Header>
      }
      columnDefinitions={[
        {
          id: "id",
          header: "Run ID",
          cell: (item) => (
            <Link
              href={`/runs/${item.id}`}
              onFollow={(e) => {
                e.preventDefault();
                router.push(`/runs/${item.id}`);
              }}
            >
              {item.id}
            </Link>
          ),
          sortingField: "id",
        },
        {
          id: "intent",
          header: "Intent",
          cell: (item) => item.intent || "-",
          sortingField: "intent",
        },
        {
          id: "status",
          header: "Status",
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
          header: "Started",
          cell: (item) => formatDate(item.startedAt),
          sortingField: "startedAt",
        },
        {
          id: "duration",
          header: "Duration",
          cell: (item) => formatDuration(item.startedAt, item.completedAt),
        },
      ]}
      items={paginatedRuns}
      filter={
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder="Find runs"
          filteringAriaLabel="Filter runs"
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
            <Box variant="strong">No runs</Box>
            <Box variant="p" color="inherit">
              No execution history available yet.
            </Box>
          </SpaceBetween>
        </Box>
      }
    />
  );
}
