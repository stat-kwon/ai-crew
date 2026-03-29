"use client";

import useSWR from "swr";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigData {
  bundle?: string;
  defaults?: {
    locale?: string;
    model?: string;
    provider?: string;
  };
  graph?: {
    parallel?: number;
  };
  [key: string]: unknown;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function ConfigSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const { data: config } = useSWR<ConfigData>(
    isOpen ? "/api/config" : null,
    fetcher
  );

  if (!isOpen) return null;

  const bundleName = config?.bundle || "미설정";
  const locale = config?.defaults?.locale || "ko";
  const model = config?.defaults?.model || "미설정";
  const provider = config?.defaults?.provider || "미설정";
  const parallel = config?.graph?.parallel?.toString() || "2";

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onKeyDown={handleKeyDown}>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/20 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 z-50 flex h-full w-80 flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="설정"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 font-[var(--font-headline)]">
            설정
          </h2>
          <button
            onClick={onClose}
            className="flex items-center rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="설정 닫기"
            data-testid="settings-close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <ConfigSection title="프로젝트">
            <ConfigRow label="팀 템플릿" value={bundleName} />
          </ConfigSection>

          <ConfigSection title="기본 설정">
            <ConfigRow label="언어" value={locale} />
            <ConfigRow label="모델" value={model} />
            <ConfigRow label="프로바이더" value={provider} />
          </ConfigSection>

          <ConfigSection title="실행">
            <ConfigRow label="병렬 실행 수" value={parallel} />
          </ConfigSection>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5">
            <span className="material-symbols-outlined text-sm text-slate-400">
              info
            </span>
            <p className="text-xs text-slate-500">
              설정값은 CLI에서 수정하세요.
              <br />
              <code className="text-[11px] font-medium text-primary">
                .ai-crew/config.yaml
              </code>
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
