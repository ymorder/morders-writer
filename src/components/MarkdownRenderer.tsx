import React from "react";

interface MarkdownRendererProps {
  content: string;
  isRtl?: boolean;
}

export function MarkdownRenderer({ content, isRtl }: MarkdownRendererProps) {
  if (!content) return null;

  // Detect Hebrew or Arabic characters automatically if isRtl is not explicitly passed
  const autoRtl = isRtl ?? /[\u0590-\u05FF\u0600-\u06FF]/.test(content.slice(0, 400));

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (keyPrefix: number) => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const body = tableRows.slice(1).filter((r) => !r.every((cell) => /^[-:\s]+$/.test(cell)));
    elements.push(
      <div key={`table-${keyPrefix}`} className="my-6 overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/50">
        <table className="w-full text-sm text-left rtl:text-right border-collapse">
          <thead className="bg-slate-800/70 text-slate-200 uppercase text-xs">
            <tr>
              {header.map((h, i) => (
                <th key={i} className="px-4 py-3 border-b border-slate-700/70 font-semibold">
                  {formatInline(h.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {body.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-3 text-slate-300">
                    {formatInline(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  function formatInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      tableRows.push(cells);
      return;
    } else if (inTable) {
      flushTable(index);
    }

    if (!trimmed) {
      elements.push(<div key={index} className="h-3" />);
      return;
    }

    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={index} className="text-2xl md:text-3xl font-bold text-white mt-4 mb-4 leading-tight">
          {formatInline(trimmed.slice(2))}
        </h1>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={index}
          className="text-xl md:text-2xl font-bold text-indigo-200 mt-8 mb-3 pb-2 border-b border-slate-800/80"
        >
          {formatInline(trimmed.slice(3))}
        </h2>
      );
    } else if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={index} className="text-lg font-semibold text-emerald-300 mt-6 mb-2">
          {formatInline(trimmed.slice(4))}
        </h3>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <li key={index} className="ml-5 rtl:mr-5 rtl:ml-0 list-disc text-slate-300 leading-relaxed my-1">
          {formatInline(trimmed.slice(2))}
        </li>
      );
    } else if (/^\d+\.\s/.test(trimmed)) {
      const contentAfterNum = trimmed.replace(/^\d+\.\s/, "");
      elements.push(
        <li key={index} className="ml-5 rtl:mr-5 rtl:ml-0 list-decimal text-slate-300 leading-relaxed my-1">
          {formatInline(contentAfterNum)}
        </li>
      );
    } else {
      elements.push(
        <p key={index} className="text-slate-200/90 leading-relaxed my-2 text-[15px]">
          {formatInline(trimmed)}
        </p>
      );
    }
  });

  if (inTable) {
    flushTable(lines.length);
  }

  return (
    <div dir={autoRtl ? "rtl" : "ltr"} className={autoRtl ? "text-right font-sans" : "text-left font-sans"}>
      {elements}
    </div>
  );
}
