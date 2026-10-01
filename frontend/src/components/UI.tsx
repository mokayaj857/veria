"use client";

import { Shield, Clock, AlertTriangle, Slash, ArrowUpRight } from "lucide-react";

const STATUS_CONFIG = {
  0: { label: "Pending", color: "text-amber-800 bg-amber-100 border-amber-300", icon: Clock },
  1: { label: "Verified", color: "text-[#1f3dff] bg-[#e8ebff] border-[#1f3dff]", icon: Shield },
  2: { label: "Suspended", color: "text-orange-800 bg-orange-100 border-orange-300", icon: AlertTriangle },
  3: { label: "Slashed", color: "text-[#e23c2f] bg-red-50 border-[#e23c2f]", icon: Slash },
} as const;

export function StatusBadge({ status }: { status: number }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG[0];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-bold ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export function ReputationBar({ score, max = 1000 }: { score: number; max?: number }) {
  const percentage = Math.min((score / max) * 100, 100);
  const getColor = () => {
    if (percentage >= 70) return "bg-[#1f3dff]";
    if (percentage >= 40) return "bg-[#c45c12]";
    return "bg-[#e23c2f]";
  };

  return (
    <div className="flex items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden border border-[#111217] bg-[#f2efe8]">
        <div className={`h-full transition-all duration-500 ${getColor()}`} style={{ width: `${percentage}%` }} />
      </div>
      <span className="min-w-[3.5rem] text-right font-mono text-sm font-bold">
        {score}/{max}
      </span>
    </div>
  );
}

export function AgentVitalStats({
  stakePas,
  completed,
  failed,
}: {
  stakePas: string;
  completed: number;
  failed: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="border-2 border-[#111217] bg-[#fff] px-2 py-3 sm:px-3">
        <p className="text-[13px] font-black leading-tight text-[#111217]">My Stake</p>
        <p className="mt-2 text-lg font-black text-[#1f3dff]">{stakePas} PAS</p>
      </div>
      <div className="border-2 border-[#111217] bg-[#fff] px-2 py-3 sm:px-3">
        <p className="text-[13px] font-black leading-tight text-[#111217]">Tasks Completed</p>
        <p className="mt-2 text-lg font-black text-[#111217]">{completed}</p>
      </div>
      <div className="border-2 border-[#111217] bg-[#fff] px-2 py-3 sm:px-3">
        <p className="text-[13px] font-black leading-tight text-[#111217]">Tasks Failed</p>
        <p className="mt-2 text-lg font-black text-[#e23c2f]">{failed}</p>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <div className={`p-5 ${accent ? "bg-[#1f3dff] text-white shadow-[8px_8px_0_#111217]" : "surface"}`}>
      <div className="mb-5 flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center border-2 ${accent ? "border-white/40" : "border-[#111217]"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 opacity-50" />
      </div>
      <span className={`block text-sm font-black uppercase tracking-wide ${accent ? "text-white" : "text-[#111217]"}`}>
        {label}
      </span>
      <p className={`mt-2 text-3xl font-black tracking-tight ${accent ? "text-white" : "text-[#111217]"}`}>{value}</p>
    </div>
  );
}
