"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ChevronRight, X } from "lucide-react";

interface DocFile {
  name: string;
  path: string;
  stage?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface DocumentListProps {
  stage?: string;
}

export function DocumentList({ stage }: DocumentListProps) {
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const { data: docsData } = useSWR<{ docs: DocFile[] }>(
    "/api/aidlc/docs",
    fetcher
  );
  const { data: docContent } = useSWR<{ path: string; content: string }>(
    selectedDoc ? `/api/aidlc/docs?file=${encodeURIComponent(selectedDoc)}` : null,
    fetcher
  );

  const filteredDocs = stage
    ? docsData?.docs.filter((d) => d.stage === stage || d.name.toLowerCase().includes(stage.toLowerCase()))
    : docsData?.docs;

  if (selectedDoc && docContent) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{selectedDoc}</CardTitle>
            <CardDescription>Document content</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDoc(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 text-sm">
              {docContent.content}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Documents</CardTitle>
        <CardDescription>
          {stage ? `Documents for ${stage}` : "All generated documents"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!filteredDocs || filteredDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents found.</p>
        ) : (
          <ul className="space-y-2">
            {filteredDocs.map((doc) => (
              <li key={doc.path}>
                <button
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                  onClick={() => setSelectedDoc(doc.path)}
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{doc.name}</div>
                      {doc.stage && (
                        <div className="text-xs text-muted-foreground">
                          {doc.stage}
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
