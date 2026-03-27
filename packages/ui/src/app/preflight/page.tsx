"use client";

import { useState } from "react";
import useSWR from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Alert from "@cloudscape-design/components/alert";
import Spinner from "@cloudscape-design/components/spinner";
import ProgressBar from "@cloudscape-design/components/progress-bar";
import Table from "@cloudscape-design/components/table";

interface CheckResult {
  id: string;
  name: string;
  description: string;
  status: "pass" | "fail" | "warning" | "pending";
  details?: string;
}

interface PreflightData {
  checks: CheckResult[];
  summary: {
    total: number;
    pass: number;
    fail: number;
    warning: number;
    ready: boolean;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PreflightPage() {
  const { data, error, isLoading, mutate } = useSWR<PreflightData>(
    "/api/preflight",
    fetcher
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await mutate();
    setRefreshing(false);
  };

  const getStatusType = (
    status: string
  ): "success" | "error" | "warning" | "pending" | "in-progress" => {
    switch (status) {
      case "pass":
        return "success";
      case "fail":
        return "error";
      case "warning":
        return "warning";
      default:
        return "pending";
    }
  };

  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Pre-run checks and validation"
            actions={
              <Button onClick={handleRefresh} loading={refreshing}>
                Refresh
              </Button>
            }
          >
            Preflight Check
          </Header>
        }
      >
        <Alert type="error" header="Failed to load preflight checks">
          Could not connect to the preflight API. Make sure the server is running.
        </Alert>
      </ContentLayout>
    );
  }

  if (isLoading) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="Pre-run checks and validation">
            Preflight Check
          </Header>
        }
      >
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
          <Box padding="s">Running preflight checks...</Box>
        </Box>
      </ContentLayout>
    );
  }

  const checks = data?.checks || [];
  const summary = data?.summary || {
    total: 0,
    pass: 0,
    fail: 0,
    warning: 0,
    ready: false,
  };

  const passPercentage =
    summary.total > 0 ? Math.round((summary.pass / summary.total) * 100) : 0;

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Pre-run checks and validation"
          actions={
            <Button
              variant="primary"
              onClick={handleRefresh}
              loading={refreshing}
              iconName="refresh"
            >
              Re-run Checks
            </Button>
          }
        >
          Preflight Check
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Summary */}
        <Container header={<Header variant="h2">Summary</Header>}>
          <SpaceBetween size="l">
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Total Checks</Box>
                <Box variant="awsui-value-large">{summary.total}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Passed</Box>
                <Box variant="awsui-value-large">
                  <StatusIndicator type="success">{summary.pass}</StatusIndicator>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Warnings</Box>
                <Box variant="awsui-value-large">
                  <StatusIndicator type="warning">{summary.warning}</StatusIndicator>
                </Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Failed</Box>
                <Box variant="awsui-value-large">
                  <StatusIndicator type="error">{summary.fail}</StatusIndicator>
                </Box>
              </div>
            </ColumnLayout>

            <ProgressBar
              value={passPercentage}
              additionalInfo={`${summary.pass} of ${summary.total} checks passed`}
              status={
                summary.ready
                  ? "success"
                  : summary.fail > 0
                    ? "error"
                    : "in-progress"
              }
              resultText={
                summary.ready
                  ? "Ready to run"
                  : `${summary.fail} issue${summary.fail !== 1 ? "s" : ""} to resolve`
              }
            />

            {summary.ready ? (
              <Alert type="success" header="All checks passed">
                Your project is ready to run. You can proceed with execution.
              </Alert>
            ) : summary.fail > 0 ? (
              <Alert type="error" header="Issues detected">
                Please resolve the failed checks before running.
              </Alert>
            ) : summary.warning > 0 ? (
              <Alert type="warning" header="Warnings detected">
                You can proceed, but consider addressing the warnings.
              </Alert>
            ) : null}
          </SpaceBetween>
        </Container>

        {/* Detailed Checks */}
        <Table
          header={<Header variant="h2">Detailed Checks</Header>}
          columnDefinitions={[
            {
              id: "status",
              header: "Status",
              cell: (item) => (
                <StatusIndicator type={getStatusType(item.status)}>
                  {item.status.toUpperCase()}
                </StatusIndicator>
              ),
              width: 120,
            },
            {
              id: "name",
              header: "Check",
              cell: (item) => <Box fontWeight="bold">{item.name}</Box>,
              width: 200,
            },
            {
              id: "description",
              header: "Description",
              cell: (item) => item.description,
            },
            {
              id: "details",
              header: "Details",
              cell: (item) => (
                <Box
                  color={
                    item.status === "fail"
                      ? "text-status-error"
                      : item.status === "warning"
                        ? "text-status-warning"
                        : "text-status-success"
                  }
                >
                  {item.details || "-"}
                </Box>
              ),
            },
          ]}
          items={checks}
          variant="container"
          empty={
            <Box textAlign="center" color="inherit" padding="l">
              <SpaceBetween size="m">
                <Box variant="strong">No checks available</Box>
                <Box variant="p" color="inherit">
                  Click refresh to run preflight checks.
                </Box>
              </SpaceBetween>
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
