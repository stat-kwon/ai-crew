"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Header from "@cloudscape-design/components/header";
import Spinner from "@cloudscape-design/components/spinner";
import Tabs from "@cloudscape-design/components/tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ScratchpadData {
  content: string;
  files?: Array<{ name: string; content: string }>;
}

interface ScratchpadModalProps {
  nodeId: string;
  onClose: () => void;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ScratchpadModal({ nodeId, onClose }: ScratchpadModalProps) {
  const { data, error, isLoading } = useSWR<ScratchpadData>(
    `/api/scratchpad/${nodeId}`,
    fetcher
  );

  return (
    <Modal
      visible
      onDismiss={onClose}
      size="large"
      header={
        <Header variant="h2" description="노드 실행 산출물">
          작업 메모: {nodeId}
        </Header>
      }
    >
      {isLoading ? (
        <Box textAlign="center" padding="l">
          <Spinner size="large" />
        </Box>
      ) : error ? (
        <Box color="text-status-error" padding="l">
          작업 메모를 불러올 수 없습니다.
        </Box>
      ) : data?.files && data.files.length > 0 ? (
        <Tabs
          tabs={data.files.map((file, index) => ({
            id: `file-${index}`,
            label: file.name,
            content: (
              <Box padding="m">
                <div className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {file.content}
                  </ReactMarkdown>
                </div>
              </Box>
            ),
          }))}
        />
      ) : data?.content ? (
        <Box padding="m">
          <div className="markdown-body">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {data.content}
            </ReactMarkdown>
          </div>
        </Box>
      ) : (
        <Box textAlign="center" color="text-status-inactive" padding="l">
          작업 메모 내용이 없습니다.
        </Box>
      )}
    </Modal>
  );
}
