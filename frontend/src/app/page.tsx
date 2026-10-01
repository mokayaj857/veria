"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVeriaWallet } from "@/lib/walletSession";
import { formatEther } from "viem";
import { useRegistryStats } from "@/hooks/useAgentRegistry";
import { TrustDesk } from "@/components/TrustDesk";
import { AGENT_STILLS, VERIA_SLOGAN } from "@/lib/veriaMedia";
import { useLiveRegistryAgents } from "@/hooks/useLiveAgents";
import { ArrowRight, ChevronDown } from "lucide-react";

const FEATURE_CARDS = [
  {
    index: "01",
    image: "/veria-bot-identity.jpg",
    title: "Identity + wallet",
    desc: "An agent first registers who it is and which blockchain wallet it owns, so every later action has a traceable subject.",
    tone: "bento-a bg-[#111217] text-white",
  },
  {
    index: "02",
    image: "/veria-bot-stake.jpg",
    title: "Stake as accountability",
    desc: "Tokens are locked as collateral. Trust is not a claim — it is bonded, slashable, and expensive to fake.",
    tone: "bento-b bg-[#1f3dff] text-white",
  },
  {
    index: "03",
    image: "/veria-bot-metta.jpg",
    title: "MeTTa reasons",
    desc: "When an action is requested, MeTTa reasons over identity, stake, reputation, history, and evidence — then returns a decision.",
    tone: "bento-c bg-white",
  },
  {
    index: "04",
    image: "/veria-bot-omega.jpg",
    title: "Omega remembers",
    desc: "Omega keeps the agent’s past behavior: successes, failures, violations, and interactions, so trust can update as evidence accumulates.",
    tone: "bento-d bg-[#e23c2f] text-white",
    tags: ["Approve", "Reject", "Limit"],
  },
];

const FOOTER_COLUMNS = [
  { title: "Protocol", links: ["Explorer", "Staking", "MeTTa", "Omega"] },
  { title: "Resources", links: ["Documentation", "Agent SDK", "Brand Assets", "Status"] },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Register identity", desc: "The agent records who it is and binds a blockchain wallet so VERIA always knows the subject of a request." },
  { step: "02", title: "Stake tokens", desc: "Collateral is locked as accountability. Misbehavior has economic weight, not just a reputation ding." },
  { step: "03", title: "Record the trail", desc: "VERIA logs actions, successes, failures, violations, and interactions as the agent works." },
  { step: "04", title: "Decide, and show why", desc: "MeTTa reasons. Omega remembers. VERIA approves, rejects, or limits — with the evidence in the open." },
];

const FAQ_ITEMS = [
  {
    question: "How does agent registration work in VERIA?",
    answer:
      "An operator connects a wallet, submits the agent identity, adds model and metadata details, provides public credentials, and stakes tokens to create an on-chain record VERIA can check later.",
  },
  {
    question: "What information is stored for each agent?",
    answer:
      "Each profile includes the owner wallet, agent name, model details, metadata, public key, stake, registration timestamp, status, and the reputation and behavioral history Omega uses as memory.",
  },
  {
    question: "Why does an agent need to stake tokens?",
    answer:
      "Stake is accountability. It gives each identity economic weight, supports slashing, and makes it costly to register disposable or abusive agents.",
  },
  {
    question: "How is reputation built over time?",
    answer:
      "VERIA records task outcomes, violations, and interactions. Reputation moves with that evidence so trust is earned in public, not granted once at signup.",
  },
  {
    question: "What do MeTTa and Omega do?",
    answer:
      "When an agent wants to act, VERIA checks identity, stake, reputation, history, and evidence. MeTTa reasons over that bundle. Omega remembers past behavior. The result is approve, reject, or limit — plus the exact why.",
  },
  {
    question: "How do reputation points work in practice?",
    answer:
      "Agents start at 500 out of 1000. Successful task outcomes add 10 points, failed outcomes subtract 20 points, and peer reviews adjust the score based on the reviewer's own reputation weight.",
  },
  {
    question: "What can I do after an agent is registered?",
    answer:
      "Monitor it in the dashboard, inspect it in the explorer, compare it on the leaderboard, run trust decisions as new evidence arrives, and later request stake withdrawal through the registry flow.",
  },
  {
    question: "Why can’t every wallet submit peer reviews immediately?",
    answer:
      "Peer review is gated to reduce spam and sybil behavior. A wallet must first register a verified agent, build enough reputation, wait past the minimum account age, and it can only review a given agent once.",
  },
];

function AnimatedStatValue({
  value,
  format = "integer",
  suffix = "",
  durationMs = 1400,
}: {
  value: number;
  format?: "integer" | "decimal2" | "decimal3";
  suffix?: string;
  durationMs?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    setDisplayValue(0);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs]);

  const formatted =
    format === "decimal3"
      ? displayValue.toFixed(3)
      : format === "decimal2"
        ? displayValue.toFixed(2)
        : Math.round(displayValue).toString().padStart(2, "0");

  return (
    <>
      {formatted}
      {suffix}
    </>
  );
}

export default function LandingPage() {
  const { isConnected } = useVeriaWallet();
  const { data: stats, isLoading: statsLoading } = useRegistryStats();
  const { agents } = useLiveRegistryAgents(8);
  const visas = agents.slice(0, 3);
  const [activeAgent, setActiveAgent] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [flowStep, setFlowStep] = useState(0);
  const [userHeld, setUserHeld] = useState(false);

  useEffect(() => {
    if (userHeld || visas.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveAgent((current) => (current + 1) % visas.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, [userHeld, visas.length]);

  const orderedAgents = visas.map((agent, index) => ({
    ...agent,
    serial: agent.address.slice(2, 8).toUpperCase(),
    progress: `${Math.min(100, Math.round(agent.reputation / 10))}%`,
    position: (index - activeAgent + visas.length) % visas.length,
  })).sort((a, b) => a.position - b.position);

  const statValues = useMemo(
    () => ({
      registered: stats ? Number(stats[0]) : 0,
      verified: stats ? Number(stats[1]) : 0,
      staked: stats ? Number(formatEther(stats[2])) : 0,
      reputation: stats ? Number(stats[3]) : 0,
    }),
    [stats]
  );

  const landingStats = [
    { value: statsLoading ? "00" : <AnimatedStatValue value={statValues.registered} />, label: "Registered agents", desc: "Total agent profiles created in the registry." },
    { value: statsLoading ? "00" : <AnimatedStatValue value={statValues.verified} />, label: "Verified agents", desc: "Agents currently active and verified on-chain." },
    { value: statsLoading ? "0.000 PAS" : <AnimatedStatValue value={statValues.staked} format="decimal3" suffix=" PAS" />, label: "Total staked", desc: "Combined PAS collateral securing agent accountability." },
    { value: statsLoading ? "000/1000" : <AnimatedStatValue value={statValues.reputation} suffix="/1000" />, label: "Average reputation", desc: "Current network-wide trust score across all agents." },
  ];

  return (
    <div className="overflow-hidden pb-10">
      <section className="border-b-2 border-[#111217] bg-[#111217] text-white">
        <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-8 lg:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[#8ea0ff]">How it works</p>
          <h2 className="display mt-3 max-w-3xl text-4xl sm:text-5xl">Register. Stake. Remember. Decide.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65">
            VERIA is the trust layer for AI agents: prove who they are, learn from experience, reason about trust, and stay accountable on-chain.
          </p>
        </div>
        <div className="step-rail border-t-2 border-white/10">
          {HOW_IT_WORKS.map(({ step, title, desc }, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setFlowStep(index)}
              className={`border-white/10 p-6 text-left md:border-r-2 last:border-r-0 ${flowStep === index ? "bg-[#1f3dff]" : "hover:bg-white/5"}`}
            >
              <p className={`display text-5xl ${flowStep === index ? "text-white" : "text-[#1f3dff]"}`}>{step}</p>
              <h3 className="mt-4 text-xl font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/65">{desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-8 lg:px-12">
        <div className="geo-blob right-[-80px] top-10 hidden h-64 w-64 rounded-full lg:block" />
        <div className="geo-blob bottom-8 left-[-60px] hidden h-40 w-40 rotate-12 lg:block" style={{ borderColor: "#e23c2f" }} />

        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex max-w-full items-center gap-2 border-2 border-[#111217] bg-white px-3 py-1.5">
              <span className="h-2.5 w-2.5 flex-none bg-[#e23c2f]" />
              <span className="kicker truncate">{VERIA_SLOGAN}</span>
            </div>
            <h1 className="display mt-6 text-[3.4rem] leading-[0.88] sm:text-7xl lg:text-[6.4rem]">
              Prove
              <br />
              who they
              <br />
              <span className="text-[#1f3dff]">are.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-aegent-muted">
              Agents register identity and wallet, stake for accountability, and build a living record of what they did.
              MeTTa reasons. Omega remembers. VERIA then approves, rejects, or limits — and shows exactly why.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row">
              <Link href={isConnected ? "/register" : "/dashboard"} className="btn-ink">
                Enter VERIA
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/explorer" className="btn-paper">
                Open registry
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="photo-frame relative h-64 w-full sm:h-80 lg:h-[22rem]">
              <Image
                src="/veria-agi-hero.jpg"
                alt="Illustration of an artificial general intelligence being"
                fill
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover object-center"
                priority
              />
            </div>
            <div className="seal absolute right-2 top-2 z-40 sm:right-4">
              On-chain
              <br />
              Accountable
            </div>
            <div className="relative z-20 -mt-24 flex min-h-[260px] items-end justify-center pb-2 sm:-mt-28 sm:min-h-[280px]">
              <div className="relative h-[260px] w-full max-w-[360px] sm:h-[280px]">
                {visas.length === 0 ? (
                  <div className="visa visa-pick absolute left-1/2 top-1/2 w-[250px] -translate-x-1/2 -translate-y-1/2 p-5">
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[#1f3dff]">REGISTRY</p>
                    <p className="display mt-4 text-2xl">No agents on-chain yet</p>
                    <p className="mt-3 text-sm leading-6 text-aegent-muted">Register an agent to populate this visa and the MeTTa desk.</p>
                  </div>
                ) : (
                  orderedAgents.map((agent) => {
                    const originalIndex = visas.findIndex((item) => item.address === agent.address);
                    const cardClass =
                      agent.position === 0 ? "hero-card-active z-30" : agent.position === 1 ? "hero-card-next z-20" : "hero-card-back z-10";
                    return (
                      <button
                        key={agent.address}
                        type="button"
                        onClick={() => {
                          setActiveAgent(originalIndex);
                          setUserHeld(true);
                        }}
                        className={`hero-agent-card visa visa-pick absolute left-1/2 top-1/2 w-[220px] -translate-x-1/2 -translate-y-1/2 text-left sm:w-[250px] ${cardClass}`}
                      >
                        <div className="visa-band" />
                        <div className="p-4 sm:p-5">
                          <div className="flex items-center justify-between font-mono text-[10px] tracking-[0.16em]">
                            <span className="text-[#1f3dff]">VERIA VISA</span>
                            <span>{agent.serial}</span>
                          </div>
                          <div className="mt-4 flex items-center gap-3">
                            <div className="relative h-12 w-12 overflow-hidden border border-[#111217]">
                              <Image src={agent.still} alt={agent.name} fill sizes="48px" className="object-cover" />
                            </div>
                            <div>
                              <p className="display text-xl leading-none">{agent.name}</p>
                              <p className="mt-1 font-mono text-[10px] uppercase text-aegent-dim">{agent.model}</p>
                            </div>
                          </div>
                          <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#e23c2f]">
                            Reputation {agent.reputation}
                          </p>
                          <div className="mt-2 h-2 border border-[#111217] bg-[#f2efe8]">
                            <div className="h-full bg-[#1f3dff]" style={{ width: agent.progress }} />
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <p className="relative z-20 mt-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-aegent-dim">
              Click a visa to hold it in the trust desk
            </p>
          </div>
        </div>
      </section>

      <TrustDesk
        selectedAddress={userHeld ? visas[activeAgent]?.address : undefined}
        onPickAgent={(address) => {
          const index = visas.findIndex((item) => item.address.toLowerCase() === address.toLowerCase());
          if (index >= 0) {
            setActiveAgent(index);
            setUserHeld(true);
          }
        }}
      />

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:px-12">
        <p className="kicker">VERIA stack</p>
        <h2 className="display mt-3 max-w-3xl text-4xl sm:text-6xl">Identity, stake, memory, and reason</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-aegent-muted">
          VERIA checks who the agent is, what it posted as stake, what it has done, and what evidence exists — then MeTTa and Omega turn that into a trust decision you can inspect.
        </p>
        <div className="bento mt-10">
          {FEATURE_CARDS.map((feature) => (
            <article key={feature.title} className={`tile-lift overflow-hidden border-2 border-[#111217] shadow-[8px_8px_0_#111217] ${feature.tone}`}>
              <div className="relative h-48 w-full sm:h-56">
                <Image src={feature.image} alt={`${feature.title} AGI illustration`} fill sizes="(max-width: 1024px) 100vw, 40vw" className="object-cover object-top" />
              </div>
              <div className="p-6 sm:p-7">
                <p className="display text-5xl opacity-80">{feature.index}</p>
                <h2 className="display mt-6 text-3xl">{feature.title}</h2>
                <p className="mt-4 text-base leading-7 opacity-80">{feature.desc}</p>
                {feature.tags ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {feature.tags.map((tag) => (
                      <span key={tag} className="border border-white/40 px-3 py-1 font-mono text-[11px] uppercase">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-4 my-10 border-2 border-[#111217] bg-[#1f3dff] text-white shadow-[10px_10px_0_#111217] sm:mx-8 lg:mx-12">
        <div className="px-6 py-8 sm:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/70">Network Overview</p>
          <h2 className="display mt-3 text-4xl sm:text-5xl">Live snapshot of the VERIA registry</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
            Registered identities, verified agents, bonded stake, and network reputation — the evidence layer MeTTa and Omega read from.
          </p>
        </div>
        <div className="grid border-t-2 border-white/20 sm:grid-cols-2 lg:grid-cols-4">
          {landingStats.map(({ value, label, desc }) => (
            <div key={label} className="border-white/20 p-6 sm:border-r-2 last:border-r-0">
              <p className="display text-5xl">{value}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em]">{label}</p>
              <p className="mt-2 text-sm leading-6 text-white/70">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-10 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="kicker">FAQ</p>
            <h2 className="display mt-3 text-4xl sm:text-5xl">Questions people usually ask first</h2>
            <p className="mt-4 text-base leading-8 text-aegent-muted">
              Identity, stake, MeTTa, Omega, and the on-chain trail — the questions people ask before they trust an agent.
            </p>
            <div className="seal mt-8">Ask first</div>
          </div>
          <div className="border-2 border-[#111217] bg-white shadow-[8px_8px_0_#e23c2f]">
            {FAQ_ITEMS.map(({ question, answer }, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={question} className="border-b-2 border-[#111217] last:border-b-0">
                  <button type="button" onClick={() => setOpenFaq(isOpen ? null : index)} className="flex w-full items-start justify-between gap-6 px-5 py-5 text-left">
                    <h3 className="text-lg font-bold">{question}</h3>
                    <span className={`mt-1 inline-flex h-8 w-8 flex-none items-center justify-center border-2 border-[#111217] ${isOpen ? "bg-[#1f3dff] text-white" : ""}`}>
                      <ChevronDown className={`h-4 w-4 ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  {isOpen ? <p className="px-5 pb-5 text-base leading-8 text-aegent-muted">{answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-4 mb-10 border-2 border-[#111217] bg-[#e23c2f] px-6 py-14 text-center text-white shadow-[10px_10px_0_#111217] sm:mx-8 sm:px-12 lg:mx-12">
        <h2 className="display mx-auto max-w-3xl text-4xl sm:text-6xl">Put an agent on the trust layer</h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-white/85">
          Register identity, stake tokens, and let VERIA record what happens next — so every future action can be approved, rejected, or limited with a reason.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href={isConnected ? "/register" : "/dashboard"} className="inline-flex items-center bg-white px-6 py-3.5 text-sm font-bold text-[#111217] shadow-[5px_5px_0_#111217]">
            Register Your Agent
          </Link>
          <Link href="/leaderboard" className="inline-flex items-center border-2 border-white px-6 py-3.5 text-sm font-bold">
            View Leaderboard
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-[1440px] px-4 pt-8 sm:px-8 lg:px-12">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 overflow-hidden border-2 border-[#111217]">
                <Image src="/veria-logo.jpg" alt="VERIA" fill sizes="48px" className="object-cover" />
              </div>
              <p className="display text-5xl">VERIA</p>
            </div>
            <p className="mt-5 max-w-md text-base leading-8 text-aegent-muted">
              {VERIA_SLOGAN} Prove who agents are, learn from experience, reason about trust, and remain accountable on-chain.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {AGENT_STILLS.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => {
                    if (visas[index]) {
                      setActiveAgent(index);
                      setUserHeld(true);
                    }
                  }}
                  className="photo-frame h-16 w-full"
                >
                  <Image src={src} alt={visas[index]?.name || "VERIA agent"} fill sizes="120px" className="object-cover" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-2">
            {FOOTER_COLUMNS.map(({ title, links }) => (
              <div key={title}>
                <p className="font-bold">{title}</p>
                <div className="mt-5 space-y-3">
                  {links.map((link) => (
                    <p key={link} className="text-sm text-aegent-muted">{link}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t-2 border-[#111217] py-6 text-xs text-aegent-dim sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 VERIA. Trust infrastructure for AI agents.</p>
          <div className="flex gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Status</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
