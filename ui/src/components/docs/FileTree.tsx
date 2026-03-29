"use client";

import { useState } from "react";
import type { FileTreeNode } from "@/types";
import { ChevronDown, ChevronRight, File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  onSelectFile: (path: string) => void;
}

function TreeNode({ node, selectedPath, onSelectFile, depth = 0 }: { node: FileTreeNode; selectedPath: string | null; onSelectFile: (path: string) => void; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isSelected = node.path === selectedPath;

  if (node.type === "directory") {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium tracking-tight text-foreground transition-colors hover:bg-muted/45"
          style={{ paddingLeft: `${depth * 14 + 12}px` }}
        >
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="space-y-1">
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} selectedPath={selectedPath} onSelectFile={onSelectFile} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelectFile(node.path)}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors",
        isSelected ? "border-primary/20 bg-primary text-primary-foreground" : "border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/35 hover:text-foreground"
      )}
      style={{ paddingLeft: `${depth * 14 + 12}px` }}
    >
      <div className="w-3" />
      <File className="h-4 w-4" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export function FileTree({ nodes, selectedPath, onSelectFile }: FileTreeProps) {
  if (nodes.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground">파일이 없습니다.</p>;
  }

  return (
    <div className="space-y-1 p-3">
      {nodes.map((node) => (
        <TreeNode key={node.path} node={node} selectedPath={selectedPath} onSelectFile={onSelectFile} />
      ))}
    </div>
  );
}
