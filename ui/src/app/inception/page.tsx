"use client";

import { useState } from "react";
import useSWR from "swr";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Tabs from "@cloudscape-design/components/tabs";
import Box from "@cloudscape-design/components/box";
import Spinner from "@cloudscape-design/components/spinner";
import { StageFlow } from "@/components/inception/StageFlow";
import { DocumentViewer } from "@/components/inception/DocumentViewer";

interface Task {
  text: string;
  done: boolean;
}

interface Stage {
  name: string;
  status: "pending" | "active" | "complete";
  tasks: Task[];
}

interface AidlcState {
  stages: Stage[];
  raw: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InceptionPage() {
  const [selectedStage, setSelectedStage] = useState<string | undefined>();
  const { data, error, isLoading } = useSWR<AidlcState>(
    "/api/aidlc/state",
    fetcher,
    { refreshInterval: 5000 }
  );

  if (error) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="AI-DLC stage visualization and document browser"
          >
            Inception
          </Header>
        }
      >
        <Box textAlign="center" color="text-status-inactive" padding="l">
          Failed to load AI-DLC state. Make sure the project is properly configured.
        </Box>
      </ContentLayout>
    );
  }

  if (isLoading) {
    return (
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="AI-DLC stage visualization and document browser"
          >
            Inception
          </Header>
        }
      >
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  const stages = data?.stages || [];

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="AI-DLC stage visualization and document browser"
        >
          Inception
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Pipeline Visualization */}
        <Container header={<Header variant="h2">Pipeline</Header>}>
          <StageFlow
            stages={stages}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
          />
        </Container>

        {/* Document Browser */}
        <DocumentViewer selectedStage={selectedStage} />
      </SpaceBetween>
    </ContentLayout>
  );
}
