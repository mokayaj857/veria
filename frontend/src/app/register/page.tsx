"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "@/components/ConnectWallet";
import { formatEther, parseEther, keccak256, toBytes } from "viem";
import { useCreateRegistrationSignature, useMinStake, useRegisterAgent } from "@/hooks/useAgentRegistry";
import { AGENT_REGISTRY_ADDRESS } from "@/lib/contract";
import {
  AlertCircle,
  CheckCircle,
  Coins,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Signature,
  Sparkles,
  UserPlus,
} from "lucide-react";

const AI_MODELS = [
  "gpt-4-turbo",
  "gpt-4o",
  "claude-3-opus",
  "claude-3-sonnet",
  "llama-3-70b",
  "mistral-large",
  "gemini-pro",
  "custom",
];

const REGISTRATION_STEPS = [
  {
    icon: Sparkles,
    title: "Define the agent",
    desc: "Set a clear identity, model, and public-facing description so others can understand what this agent is built for.",
  },
  {
    icon: Signature,
    title: "Sign the claim",
    desc: "Your wallet signs the registration payload to prove ownership over the agent identity being submitted.",
  },
  {
    icon: Coins,
    title: "Stake tokens",
    desc: "Collateral gives the agent economic accountability so VERIA can treat identity as bonded, not claimed.",
  },
  {
    icon: ShieldCheck,
    title: "Enter the trust layer",
    desc: "Once confirmed, VERIA can record actions, Omega can remember them, and MeTTa can reason before the next decision.",
  },
];

export default function RegisterPage() {
  const { isConnected, address } = useAccount();
  const { register, hash, isPending, isConfirming, isSuccess, error, reset, retryStatus } =
    useRegisterAgent();
  const { createSignature } = useCreateRegistrationSignature();
  const { data: minStakeWei } = useMinStake();
  const minStakePas = minStakeWei ? formatEther(minStakeWei) : "0.01";
  const minStakeUsd = "0.001";

  const [form, setForm] = useState({
    name: "",
    modelSpec: "",
    customModel: "",
    description: "",
    capabilities: "",
    stakeAmount: "0.01",
  });

  const [step, setStep] = useState<"form" | "signing" | "submitting">("form");
  const [signError, setSignError] = useState<string | null>(null);

  useEffect(() => {
    if (!minStakeWei) return;
    setForm((prev) => {
      if (prev.stakeAmount === "0.01" || Number(prev.stakeAmount) < Number(minStakePas)) {
        return { ...prev, stakeAmount: minStakePas };
      }
      return prev;
    });
  }, [minStakeWei, minStakePas]);

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const modelSpec = form.modelSpec === "custom" ? form.customModel : form.modelSpec;
  const capabilityList = form.capabilities
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSignError(null);
    reset();

    if (!address || !form.name || !modelSpec) return;
    if (!minStakeWei || parseEther(form.stakeAmount) < minStakeWei) {
      setSignError(`Stake must be at least ${minStakePas} PAS ($${minStakeUsd} USD) from AgentRegistry.`);
      return;
    }

    try {
      setStep("signing");

      const publicKey = keccak256(toBytes(`aegent:${address}:${form.name}:${modelSpec}`));
      const signature = await createSignature(form.name, modelSpec, publicKey);

      setStep("submitting");

      const metadata = JSON.stringify({
        description: form.description,
        capabilities: capabilityList,
        registeredVia: "aegent-dashboard",
        version: "1.0.0",
      });

      await register(form.name, modelSpec, metadata, publicKey, signature, form.stakeAmount);
    } catch (err: any) {
      setSignError(err?.shortMessage || err?.message || "Transaction failed");
      setStep("form");
    }
  }

  if (!isConnected) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <section className="surface p-8 text-center">
          <div className="photo-frame relative mx-auto h-20 w-20">
            <Image src="/veria-logo.jpg" alt="VERIA" fill sizes="80px" className="object-cover" />
          </div>
          <h1 className="display mt-6 text-3xl text-aegent-ink">
            Connect your wallet to register on VERIA
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-aegent-muted">
            Registration ties the agent to the wallet that owns it, signs the identity claim, and
            provides the stake used for accountability on-chain.
          </p>
          <div className="mt-8 flex justify-center">
            <ConnectWalletButton />
          </div>
        </section>
      </div>
    );
  }

  if (hash) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="surface p-8 text-center">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-aegent-accent" />
          <h2 className="display mb-2 text-2xl text-aegent-ink">
            Agent registered successfully
          </h2>
          <p className="mb-4 text-aegent-muted">
            Your agent identity has been submitted to Polkadot Hub.
            {isConfirming && " Confirming on-chain..."}
            {isSuccess && " Confirmed."}
          </p>
          <a
            href={`https://blockscout-testnet.polkadot.io/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-aegent-accent hover:underline"
          >
            View on Blockscout <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8">
      <section className="surface p-6 lg:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-end">
          <div className="max-w-3xl">
            <p className="kicker">Register</p>
            <h1 className="display mt-4 text-4xl text-aegent-ink sm:text-5xl">
              Register your <span className="italic text-aegent-accent">VERIA identity</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-aegent-muted sm:text-base">
              Bind an agent to a wallet, stake at least ${minStakeUsd} USD ({minStakePas} PAS from AgentRegistry), and start the trail MeTTa and Omega will use for every later trust decision.
            </p>
            <a
              href={`https://blockscout-testnet.polkadot.io/address/${AGENT_REGISTRY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 font-mono text-[11px] text-aegent-accent hover:underline"
            >
              Registry {AGENT_REGISTRY_ADDRESS.slice(0, 6)}...{AGENT_REGISTRY_ADDRESS.slice(-4)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-dim">
                Minimum stake
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-aegent-text">${minStakeUsd} USD</p>
              <p className="mt-1 font-mono text-[11px] text-aegent-dim">{minStakePas} PAS on-chain</p>
            </div>
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-dim">
                Starting reputation
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-aegent-text">500</p>
            </div>
            <div className="border border-aegent-border bg-aegent-surface px-5 py-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-aegent-dim">
                Wallet actions
              </p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-aegent-accent">2</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="space-y-6">
          <div className="surface p-6 lg:p-8">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-aegent-dim">
              Registration flow
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-aegent-text">
              What happens during registration
            </h2>
            <div className="mt-6 space-y-4">
              {REGISTRATION_STEPS.map(({ icon: Icon, title, desc }, index) => (
                <div
                  key={title}
                  className="border border-aegent-border bg-aegent-surface p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 flex-none items-center justify-center border border-aegent-border bg-aegent-card">
                      <Icon className="h-5 w-5 text-aegent-accent" />
                    </div>
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-aegent-dim">
                        Step {index + 1}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-aegent-text">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-aegent-muted">{desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface p-6">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-aegent-dim">
              Live summary
            </p>
            <h2 className="mt-3 text-xl font-semibold text-aegent-text">
              How this agent will appear
            </h2>
            <div className="mt-5 border border-aegent-border bg-aegent-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center bg-aegent-ink">
                    <UserPlus className="h-5 w-5 text-amber-200" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-aegent-text">
                      {form.name || "Unnamed agent"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-aegent-dim">
                      {modelSpec || "Select a model"}
                    </p>
                  </div>
                </div>
                <span className="border border-aegent-accent/30 bg-orange-50 px-3 py-1 text-xs font-medium text-aegent-accent">
                  Starts verified
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-aegent-dim">
                    Agent description
                  </p>
                  <p className="mt-2 min-h-[72px] text-sm leading-7 text-aegent-muted">
                    {form.description || "Add a concise public description so users know what this agent is built to do."}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-aegent-dim">
                    Capabilities
                  </p>
                  <div className="mt-3 flex min-h-[38px] flex-wrap gap-2">
                    {capabilityList.length > 0 ? (
                      capabilityList.slice(0, 4).map((capability) => (
                        <span
                          key={capability}
                          className="border border-aegent-border bg-aegent-card px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-aegent-dim"
                        >
                          {capability}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-aegent-dim">
                        Add comma-separated capabilities to make discovery easier.
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="border border-aegent-border bg-aegent-card p-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-aegent-dim">
                      Starting score
                    </p>
                    <p className="mt-2 text-lg font-semibold text-aegent-text">500 / 1000</p>
                  </div>
                  <div className="border border-aegent-border bg-aegent-card p-4">
                    <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-aegent-dim">
                      Staked PAS
                    </p>
                    <p className="mt-2 text-lg font-semibold text-aegent-text">
                      {form.stakeAmount || minStakePas} PAS
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="surface p-6 lg:p-8">
            <p className="text-xs font-mono uppercase tracking-[0.24em] text-aegent-dim">
              Agent details
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-aegent-text">
              Fill the registration dossier
            </h2>
            <p className="mt-3 text-sm leading-6 text-aegent-muted">
              Keep the profile specific and scannable. People should understand what this agent is
              for in a few seconds.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="surface p-6 lg:p-8">
              <div className="grid gap-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-aegent-text">Agent name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="e.g. TradingBot-Alpha"
                    maxLength={64}
                    required
                    className="field"
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-aegent-text">AI model *</label>
                    <select
                      value={form.modelSpec}
                      onChange={(e) => updateForm("modelSpec", e.target.value)}
                      required
                      className="field"
                    >
                      <option value="">Select model...</option>
                      {AI_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    {form.modelSpec === "custom" ? (
                      <input
                        type="text"
                        value={form.customModel}
                        onChange={(e) => updateForm("customModel", e.target.value)}
                        placeholder="Enter custom model name"
                        required
                        className="field mt-2"
                      />
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-aegent-text">
                      Stake amount *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={form.stakeAmount}
                        onChange={(e) => updateForm("stakeAmount", e.target.value)}
                        min={minStakePas}
                        step="0.001"
                        required
                        className="field"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-aegent-dim">
                        PAS
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-aegent-dim">
                      Minimum ${minStakeUsd} USD ({minStakePas} PAS), read from AgentRegistry.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-aegent-text">
                    Agent description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Describe what this agent does, who it is for, and what kind of output people should expect."
                    rows={5}
                    className="field resize-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-aegent-text">Capabilities</label>
                  <input
                    type="text"
                    value={form.capabilities}
                    onChange={(e) => updateForm("capabilities", e.target.value)}
                    placeholder="e.g. trading, analysis, monitoring"
                    className="field"
                  />
                  <p className="mt-1.5 text-xs text-aegent-dim">
                    Separate capabilities with commas so they can be shown as tags in the explorer.
                  </p>
                </div>
              </div>
            </div>

            {(error || signError) ? (
              <div className="flex items-start gap-3 border border-rose-200 bg-rose-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-800" />
                <div className="text-sm text-rose-900">
                  {signError || (error as Error)?.message || "Transaction failed"}
                </div>
              </div>
            ) : null}

            <div className="surface p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-aegent-text">Two wallet confirmations required</p>
                  <p className="mt-1 text-sm text-aegent-muted">
                    First sign the registration claim, then approve the on-chain staking transaction.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isPending || isConfirming || !form.name || !modelSpec || step !== "form"}
                  className="btn-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending || isConfirming || step !== "form" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {step === "signing"
                        ? "Sign in wallet..."
                        : retryStatus
                          ? retryStatus
                          : isConfirming
                            ? "Confirming on-chain..."
                            : "Submitting..."}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Register Agent
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
