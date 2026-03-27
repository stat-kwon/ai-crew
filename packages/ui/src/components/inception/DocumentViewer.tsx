"use client";

import { useState } from "react";
import useSWR from "swr";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Tabs from "@cloudscape-design/components/tabs";
import Spinner from "@cloudscape-design/components/spinner";
import Table from "@cloudscape-design/components/table";
import Link from "@cloudscape-design/components/link";
import Badge from "@cloudscape-design/components/badge";
import TextFilter from "@cloudscape-design/components/text-filter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DocFile {
  name: string;
  path: string;
  stage?: string;
}

interface DocContent {
  path: string;
  content: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DocumentViewerProps {
  selectedStage?: string;
}

export function DocumentViewer({ selectedStage }: DocumentViewerProps) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");

  const { data: docsData, isLoading: docsLoading } = useSWR<{ docs: DocFile[] }>(
    "/api/aidlc/docs",
    fetcher
  );

  const { data: docContent, isLoading: contentLoading } = useSWR<DocContent>(
    selectedDoc
      ? `/api/aidlc/docs?file=${encodeURIComponent(selectedDoc)}`
      : null,
    fetcher
  );

  const allDocs = docsData?.docs || [];

  // Group docs by stage
  const docsByStage = allDocs.reduce(
    (acc, doc) => {
      const stage = doc.stage || "Other";
      if (!acc[stage]) acc[stage] = [];
      acc[stage].push(doc);
      return acc;
    },
    {} as Record<string, DocFile[]>
  );

  const stages = Object.keys(docsByStage).sort();

  const filteredDocs = selectedStage
    ? docsByStage[selectedStage] || []
    : allDocs;

  const searchFilteredDocs = filteredDocs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (doc.stage?.toLowerCase() || "").includes(filterText.toLowerCase())
  );

  if (selectedDoc && docContent) {
    return (
      <Container
        header={
          <Header
            variant="h2"
            actions={
              <Button onClick={() => setSelectedDoc(null)}>Back to List</Button>
            }
          >
            {selectedDoc.split("/").pop()}
          </Header>
        }
      >
        {contentLoading ? (
          <Box textAlign="center" padding="l">
            <Spinner size="large" />
          </Box>
        ) : (
          <Box padding="m">
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {docContent.content}
              </ReactMarkdown>
            </div>
          </Box>
        )}
      </Container>
    );
  }

  if (docsLoading) {
    return (
      <Container header={<Header variant="h2">Documents</Header>}>
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
        </Box>
      </Container>
    );
  }

  // Use tabs if we have stages, otherwise just show a list
  if (stages.length > 1 && !selectedStage) {
    return (
      <Tabs
        tabs={[
          {
            id: "all",
            label: "All Documents",
            content: (
              <DocumentTable
                docs={allDocs}
                filterText={filterText}
                onFilterChange={setFilterText}
                onSelectDoc={setSelectedDoc}
              />
            ),
          },
          ...stages.map((stage) => ({
            id: stage,
            label: stage,
            content: (
              <DocumentTable
                docs={docsByStage[stage]}
                filterText={filterText}
                onFilterChange={setFilterText}
                onSelectDoc={setSelectedDoc}
              />
            ),
          })),
        ]}
      />
    );
  }

  return (
    <Container
      header={
        <Header
          variant="h2"
          counter={`(${searchFilteredDocs.length})`}
          description={
            selectedStage
              ? `Documents for ${selectedStage} stage`
              : "All generated documents"
          }
        >
          Documents
        </Header>
      }
    >
      <DocumentTable
        docs={searchFilteredDocs}
        filterText={filterText}
        onFilterChange={setFilterText}
        onSelectDoc={setSelectedDoc}
      />
    </Container>
  );
}

interface DocumentTableProps {
  docs: DocFile[];
  filterText: string;
  onFilterChange: (text: string) => void;
  onSelectDoc: (path: string) => void;
}

function DocumentTable({
  docs,
  filterText,
  onFilterChange,
  onSelectDoc,
}: DocumentTableProps) {
  const filteredDocs = docs.filter(
    (doc) =>
      doc.name.toLowerCase().includes(filterText.toLowerCase()) ||
      (doc.stage?.toLowerCase() || "").includes(filterText.toLowerCase())
  );

  return (
    <Table
      columnDefinitions={[
        {
          id: "name",
          header: "Name",
          cell: (item) => (
            <Link
              href="#"
              onFollow={(e) => {
                e.preventDefault();
                onSelectDoc(item.path);
              }}
            >
              {item.name}
            </Link>
          ),
          sortingField: "name",
        },
        {
          id: "stage",
          header: "Stage",
          cell: (item) =>
            item.stage ? <Badge>{item.stage}</Badge> : <Box color="text-status-inactive">-</Box>,
          sortingField: "stage",
        },
        {
          id: "path",
          header: "Path",
          cell: (item) => (
            <Box fontSize="body-s" color="text-status-inactive">
              {item.path}
            </Box>
          ),
        },
      ]}
      items={filteredDocs}
      filter={
        <TextFilter
          filteringText={filterText}
          filteringPlaceholder="Find documents"
          filteringAriaLabel="Filter documents"
          onChange={({ detail }) => onFilterChange(detail.filteringText)}
        />
      }
      empty={
        <Box textAlign="center" color="inherit" padding="l">
          <SpaceBetween size="m">
            <Box variant="strong">No documents</Box>
            <Box variant="p" color="inherit">
              No AI-DLC documents found. Run the inception workflow to generate documents.
            </Box>
          </SpaceBetween>
        </Box>
      }
    />
  );
}
