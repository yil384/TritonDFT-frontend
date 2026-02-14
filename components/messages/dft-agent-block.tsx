import { cn } from "@/lib/utils"
import {
  IconCheck,
  IconDatabase,
  IconLoader2,
  IconTerminal,
  IconCode,
  IconSparkles,
  IconChevronDown,
  IconChevronRight,
  IconArrowDown,
  IconBolt,
  IconCpu,
  IconFlask
} from "@tabler/icons-react"
import { useMemo, useState, useEffect, useRef } from "react"

// === Type Definitions ===
interface AgentStepData {
  type: "json" | "scripts"
  title: string
  content: any
}

interface MPFetchResult {
  material_ids: string[]
  initial_structures_count: number
  relaxed_structures_count: number
  min_ehull?: number
  best_material_id?: string
}

interface SubproblemResult {
  problem_id: number
  subproblem: string
  tool: string
  status: string
  result_json?: any
  result_judge?: string
  loop_iterations: number
}

interface AgentStep {
  id: number
  name: string
  tool: string
  status: "pending" | "running" | "completed"
  result?: string
  stepData: AgentStepData[]
  generatedScriptRaw?: string
  subproblemResult?: SubproblemResult
}

interface AgentState {
  materialQueryStatus: "pending" | "running" | "completed"
  planStatus: "pending" | "running" | "completed"
  totalSteps: number
  currentStepIndex: number
  steps: AgentStep[]
  mpFetchResult?: MPFetchResult
}

// === Helper Functions ===
const parseResultContent = (rawString: string) => {
  if (!rawString) return { desc: "" }
  try {
    return JSON.parse(rawString)
  } catch (e) {
    const jsonMatch = rawString.match(/```(?:json)?([\s\S]*?)```/)
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1].trim())
      } catch (e2) {}
    }
    return { desc: rawString }
  }
}

// === Main Component ===
export const DFTAgentBlock = ({ content }: { content: string }) => {
  const agentState = useMemo(() => {
    const state: AgentState = {
      materialQueryStatus: "pending",
      planStatus: "pending",
      totalSteps: 0,
      currentStepIndex: 0,
      steps: []
    }
    if (!content) return state

    const regex = /@@@([A-Z_]+)@@@([\s\S]*?)@@@/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const type = match[1]
      const rawPayload = match[2]
      let payload: any = {}
      try {
        payload = JSON.parse(rawPayload)
      } catch (e) {
        payload = rawPayload
      }

      switch (type) {
        case "START_PHASE":
          if (payload.phase === "Material Query")
            state.materialQueryStatus = "running"
          if (payload.phase === "Decomposition") state.planStatus = "running"
          break
        case "END_PHASE":
          if (payload.phase === "Material Query")
            state.materialQueryStatus = "completed"
          if (payload.phase === "Decomposition") state.planStatus = "completed"
          break
        case "MP_FETCH_RESULT":
          state.mpFetchResult = {
            material_ids: payload.material_ids || [],
            initial_structures_count: payload.initial_structures_count || 0,
            relaxed_structures_count: payload.relaxed_structures_count || 0,
            min_ehull: payload.min_ehull,
            best_material_id: payload.best_material_id
          }
          break
        case "PLAN_GENERATED":
          state.planStatus = "completed"
          const stepsData = Array.isArray(payload)
            ? payload
            : payload.steps || []
          state.steps = stepsData.map((p: any, idx: number) => ({
            id: idx + 1,
            name: p.problem || `Step ${idx + 1}`,
            tool: p.tool || "Unknown Tool",
            status: "pending",
            stepData: []
          }))
          state.totalSteps = state.steps.length
          break
        case "INIT_PROGRESS":
          state.totalSteps = payload.total_steps || 0
          break
        case "PROGRESS_UPDATE":
          state.currentStepIndex = payload.current
          break
        case "START_STEP":
          if (state.steps.length > 0 && payload.id <= state.steps.length) {
            state.steps[payload.id - 1].status = "running"
            state.currentStepIndex = payload.id
          }
          break
        case "GENERATED_SCRIPT_RAW":
          if (
            state.currentStepIndex > 0 &&
            state.steps[state.currentStepIndex - 1]
          ) {
            state.steps[state.currentStepIndex - 1].generatedScriptRaw =
              payload.raw_output
          }
          break
        case "STEP_COMPLETE":
          if (
            state.currentStepIndex > 0 &&
            state.steps[state.currentStepIndex - 1]
          ) {
            state.steps[state.currentStepIndex - 1].status = "completed"
            state.steps[state.currentStepIndex - 1].result =
              payload.summary || JSON.stringify(payload)
          }
          break
        case "SUBPROBLEM_RESULT":
          if (payload.problem_id && payload.problem_id <= state.steps.length) {
            state.steps[payload.problem_id - 1].subproblemResult = {
              problem_id: payload.problem_id,
              subproblem: payload.subproblem,
              tool: payload.tool,
              status: payload.status,
              result_json: payload.result_json,
              result_judge: payload.result_judge,
              loop_iterations: payload.loop_iterations || 0
            }
          }
          break
        case "STEP_DATA":
          if (state.currentStepIndex > 0) {
            const curStep = state.steps[state.currentStepIndex - 1]
            if (curStep) {
              if (!curStep.stepData) curStep.stepData = []
              const isDuplicate = curStep.stepData.some(
                d =>
                  d.type === payload.type &&
                  JSON.stringify(d.content) === JSON.stringify(payload.content)
              )
              if (!isDuplicate) curStep.stepData.push(payload)
            }
          }
          break
      }
    }
    return state
  }, [content])

  // Auto-scroll logic
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement
      const isBottom = scrollTop + clientHeight >= scrollHeight - 100
      setIsAtBottom(isBottom)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isAtBottom && bottomRef.current) {
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
      })
    }
  }, [content, agentState.currentStepIndex, isAtBottom])

  // Empty state
  if (
    agentState.materialQueryStatus === "pending" &&
    agentState.steps.length === 0
  ) {
    return null
  }

  const completedSteps = agentState.steps.filter(
    s => s.status === "completed"
  ).length
  const progressPercent =
    agentState.totalSteps > 0
      ? Math.round((completedSteps / agentState.totalSteps) * 100)
      : 0

  return (
    <div className="flex w-full select-none flex-col gap-5 font-sans">
      {/* Status Cards */}
      <div className="space-y-3">
        <PhaseCard
          title="Material Query"
          description="Fetching from Materials Project"
          icon={<IconDatabase size={16} />}
          status={agentState.materialQueryStatus}
          accentColor="cyan"
        />

        {agentState.mpFetchResult &&
          agentState.materialQueryStatus === "completed" && (
            <MPResultCard result={agentState.mpFetchResult} />
          )}

        {(agentState.materialQueryStatus === "completed" ||
          agentState.planStatus !== "pending") && (
          <PhaseCard
            title="Problem Decomposition"
            description="Breaking down into sub-tasks"
            icon={<IconCpu size={16} />}
            status={agentState.planStatus}
            accentColor="violet"
          />
        )}
      </div>

      {/* Progress Section */}
      {agentState.totalSteps > 0 && (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconBolt size={14} className="text-amber-400" />
              <span className="text-xs font-medium text-zinc-300">
                Execution Progress
              </span>
            </div>
            <span className="font-mono text-xs text-emerald-400">
              {completedSteps}/{agentState.totalSteps}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-zinc-700/50">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400/50 to-transparent blur-sm transition-all duration-700"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-2 text-center text-[10px] text-zinc-500">
            {progressPercent}% complete
          </div>
        </div>
      )}

      {/* Steps Timeline */}
      {agentState.steps.length > 0 && (
        <div className="relative mt-2 pl-4">
          {/* Timeline Line */}
          <div className="absolute inset-y-3 left-[7px] w-[2px] bg-gradient-to-b from-zinc-600 via-zinc-700 to-transparent" />

          <div className="space-y-6">
            {agentState.steps.map((step, idx) => (
              <StepCard
                key={step.id}
                step={step}
                isLast={idx === agentState.steps.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom Anchor */}
      <div ref={bottomRef} className="h-1" />

      {/* Scroll to Bottom Button */}
      {!isAtBottom && (
        <button
          onClick={() =>
            bottomRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className="fixed bottom-6 right-6 z-50 flex size-10 items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 text-zinc-300 shadow-xl transition-all hover:scale-105 hover:bg-zinc-700 active:scale-95"
        >
          <IconArrowDown size={18} />
        </button>
      )}
    </div>
  )
}

// === Sub Components ===

function PhaseCard({
  title,
  description,
  icon,
  status,
  accentColor
}: {
  title: string
  description: string
  icon: React.ReactNode
  status: string
  accentColor: "cyan" | "violet" | "amber"
}) {
  const isPending = status === "pending"
  const isRunning = status === "running"
  const isCompleted = status === "completed"

  if (isPending) return null

  const colors = {
    cyan: {
      bg: "from-cyan-500/10 to-cyan-600/5",
      border: "border-cyan-500/30",
      icon: "bg-cyan-500/20 text-cyan-400",
      glow: "shadow-cyan-500/10"
    },
    violet: {
      bg: "from-violet-500/10 to-violet-600/5",
      border: "border-violet-500/30",
      icon: "bg-violet-500/20 text-violet-400",
      glow: "shadow-violet-500/10"
    },
    amber: {
      bg: "from-amber-500/10 to-amber-600/5",
      border: "border-amber-500/30",
      icon: "bg-amber-500/20 text-amber-400",
      glow: "shadow-amber-500/10"
    }
  }

  const c = colors[accentColor]

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-3.5 transition-all duration-500",
        "bg-gradient-to-br backdrop-blur-sm",
        c.bg,
        isRunning ? c.border : "border-zinc-700/50",
        isRunning && `shadow-lg ${c.glow}`
      )}
    >
      {/* Running indicator */}
      {isRunning && (
        <div className="absolute inset-x-0 top-0 h-[2px] overflow-hidden">
          <div className="h-full w-1/3 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-current to-transparent text-cyan-400" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg p-2 transition-colors", c.icon)}>
          {isRunning ? (
            <IconLoader2 className="animate-spin" size={16} />
          ) : isCompleted ? (
            <IconCheck size={16} />
          ) : (
            icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-200">
              {title}
            </span>
            {isCompleted && (
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400">
                Done
              </span>
            )}
          </div>
          <p className="truncate text-[10px] text-zinc-500">{description}</p>
        </div>
      </div>
    </div>
  )
}

function MPResultCard({ result }: { result: MPFetchResult }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-sky-500/20 bg-gradient-to-br from-sky-500/10 to-blue-600/5">
      <div
        className="flex cursor-pointer items-center justify-between p-3.5 transition-colors hover:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/20">
            <IconFlask size={16} className="text-sky-400" />
          </div>
          <div>
            <span className="text-xs font-medium text-zinc-200">
              Materials Found
            </span>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-lg font-bold leading-none text-sky-400">
                {result.material_ids.length}
              </span>
              <span className="text-[10px] text-zinc-500">structures</span>
            </div>
          </div>
        </div>
        <div className="text-zinc-500">
          {expanded ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 border-t border-sky-500/10 px-3.5 pb-3.5 pt-0">
          {result.best_material_id && (
            <DataRow
              label="Best Material"
              value={result.best_material_id}
              mono
            />
          )}
          <DataRow
            label="Initial Structures"
            value={result.initial_structures_count}
          />
          <DataRow
            label="Relaxed Structures"
            value={result.relaxed_structures_count}
          />
          {result.min_ehull !== undefined && (
            <DataRow
              label="Min Ehull"
              value={`${result.min_ehull.toFixed(4)} eV/atom`}
            />
          )}
          {result.material_ids.length > 0 && (
            <div className="pt-2">
              <span className="mb-1.5 block text-[10px] text-zinc-500">
                Material IDs
              </span>
              <div className="flex flex-wrap gap-1">
                {result.material_ids.slice(0, 6).map((id, idx) => (
                  <span
                    key={idx}
                    className="rounded bg-zinc-700/50 px-1.5 py-0.5 font-mono text-[9px] text-zinc-400"
                  >
                    {id}
                  </span>
                ))}
                {result.material_ids.length > 6 && (
                  <span className="px-1.5 py-0.5 text-[9px] text-zinc-500">
                    +{result.material_ids.length - 6}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DataRow({
  label,
  value,
  mono
}: {
  label: string
  value: string | number
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span
        className={cn(
          "text-[11px] text-zinc-300",
          mono && "font-mono text-sky-300"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function StepCard({ step, isLast }: { step: AgentStep; isLast: boolean }) {
  const isPending = step.status === "pending"
  const isRunning = step.status === "running"
  const isCompleted = step.status === "completed"

  return (
    <div className="relative">
      {/* Timeline Dot */}
      <div
        className={cn(
          "absolute -left-4 top-1 flex size-4 items-center justify-center rounded-full transition-all duration-300",
          isCompleted
            ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
            : isRunning
              ? "bg-amber-500 shadow-lg shadow-amber-500/30"
              : "bg-zinc-700"
        )}
      >
        {isCompleted ? (
          <IconCheck size={10} className="text-white" />
        ) : isRunning ? (
          <div className="size-2 animate-pulse rounded-full bg-white" />
        ) : (
          <div className="size-1.5 rounded-full bg-zinc-500" />
        )}
      </div>

      {/* Step Content */}
      <div
        className={cn(
          "ml-4 rounded-xl border transition-all duration-300",
          isRunning
            ? "border-amber-500/30 bg-zinc-800/80 shadow-lg shadow-amber-500/5"
            : isCompleted
              ? "border-zinc-700/50 bg-zinc-800/50"
              : "border-zinc-800 bg-zinc-800/30 opacity-60"
        )}
      >
        {/* Step Header */}
        <div className="border-b border-zinc-700/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] font-medium text-zinc-500">
                  STEP {step.id}
                </span>
                {isRunning && (
                  <span className="animate-pulse rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] text-amber-400">
                    Running
                  </span>
                )}
              </div>
              <h3 className="text-sm font-medium leading-snug text-zinc-200">
                {step.name}
              </h3>
            </div>
            <span className="shrink-0 rounded-md bg-zinc-700/50 px-2 py-1 font-mono text-[9px] text-zinc-400">
              {step.tool}
            </span>
          </div>
        </div>

        {/* Step Body */}
        {(isRunning || isCompleted) && (
          <div className="space-y-2 p-3">
            {/* Sub-tasks */}
            <SubTask
              label="Parameter Guess"
              icon={<IconSparkles size={12} />}
              active={true}
              done={isCompleted}
            />

            {/* Generated Script */}
            {step.generatedScriptRaw && (
              <CodeBlock
                title="Generated Script"
                code={step.generatedScriptRaw}
              />
            )}

            {/* Scripts from stepData */}
            {step.stepData &&
              step.stepData.map((data, idx) =>
                data.type === "scripts" ? (
                  <ScriptsBlock key={idx} scripts={data.content} />
                ) : null
              )}

            {/* Fallback Generate Input indicator */}
            {step.status !== "pending" &&
              !step.generatedScriptRaw &&
              !step.stepData?.some(d => d.type === "scripts") && (
                <SubTask
                  label="Generate Input"
                  icon={<IconCode size={12} />}
                  active={true}
                  done={isCompleted}
                />
              )}

            <SubTask
              label="Run DFT Code"
              icon={<IconTerminal size={12} />}
              active={isRunning || isCompleted}
              done={isCompleted}
            />
          </div>
        )}

        {/* Result Section */}
        {step.subproblemResult && (
          <ResultSection result={step.subproblemResult} />
        )}
        {isCompleted && step.result && !step.subproblemResult && (
          <ConclusionSection rawResult={step.result} />
        )}
      </div>
    </div>
  )
}

function SubTask({
  label,
  icon,
  active,
  done
}: {
  label: string
  icon: React.ReactNode
  active: boolean
  done: boolean
}) {
  if (!active) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all",
        done ? "bg-emerald-500/10" : "bg-zinc-700/30"
      )}
    >
      <div
        className={cn("shrink-0", done ? "text-emerald-400" : "text-zinc-500")}
      >
        {icon}
      </div>
      <span
        className={cn(
          "text-[11px] font-medium",
          done ? "text-emerald-300" : "text-zinc-400"
        )}
      >
        {label}
      </span>
      {done && (
        <IconCheck size={12} className="ml-auto shrink-0 text-emerald-400" />
      )}
    </div>
  )
}

function CodeBlock({ title, code }: { title: string; code: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-lg border border-violet-500/20 bg-zinc-900/50">
      <div
        className="flex cursor-pointer items-center justify-between bg-violet-500/10 px-3 py-2 transition-colors hover:bg-violet-500/15"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <IconCode size={12} className="text-violet-400" />
          <span className="text-[11px] font-medium text-violet-300">
            {title}
          </span>
        </div>
        <div className="text-violet-400">
          {expanded ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </div>
      </div>
      {expanded && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap p-3 font-mono text-[10px] leading-relaxed text-zinc-400">
          {code}
        </pre>
      )}
    </div>
  )
}

function ScriptsBlock({ scripts }: { scripts: string[] }) {
  const [expanded, setExpanded] = useState(false)

  if (!scripts || scripts.length === 0) return null

  return (
    <div className="overflow-hidden rounded-lg border border-indigo-500/20 bg-zinc-900/50">
      <div
        className="flex cursor-pointer items-center justify-between bg-indigo-500/10 px-3 py-2 transition-colors hover:bg-indigo-500/15"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <IconCode size={12} className="text-indigo-400" />
          <span className="text-[11px] font-medium text-indigo-300">
            Input Files ({scripts.length})
          </span>
        </div>
        <div className="text-indigo-400">
          {expanded ? (
            <IconChevronDown size={14} />
          ) : (
            <IconChevronRight size={14} />
          )}
        </div>
      </div>
      {expanded && (
        <div className="divide-y divide-zinc-800">
          {scripts.map((script, idx) => (
            <pre
              key={idx}
              className="max-h-32 overflow-auto whitespace-pre-wrap p-3 font-mono text-[10px] leading-relaxed text-zinc-400"
            >
              {script}
            </pre>
          ))}
        </div>
      )}
    </div>
  )
}

function ResultSection({ result }: { result: SubproblemResult }) {
  const [expanded, setExpanded] = useState(false)
  const isSuccess = result.status === "success" || result.status === "completed"

  return (
    <div
      className={cn(
        "border-t",
        isSuccess ? "border-emerald-500/20" : "border-amber-500/20"
      )}
    >
      <div
        className={cn(
          "cursor-pointer p-3 transition-colors",
          isSuccess ? "hover:bg-emerald-500/5" : "hover:bg-amber-500/5"
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-5 items-center justify-center rounded-full",
                isSuccess ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}
            >
              {isSuccess ? (
                <IconCheck size={12} className="text-emerald-400" />
              ) : (
                <IconSparkles size={12} className="text-amber-400" />
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium",
                isSuccess ? "text-emerald-300" : "text-amber-300"
              )}
            >
              Result
            </span>
            <span className="text-[9px] text-zinc-500">
              {result.loop_iterations} iter
            </span>
          </div>
          <div className={isSuccess ? "text-emerald-500" : "text-amber-500"}>
            {expanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </div>
        </div>

        {result.result_judge && (
          <p
            className={cn(
              "mt-2 text-[11px] leading-relaxed",
              isSuccess ? "text-emerald-200/80" : "text-amber-200/80"
            )}
          >
            {result.result_judge}
          </p>
        )}
      </div>

      {expanded && result.result_json && (
        <div className="px-3 pb-3">
          <pre
            className={cn(
              "max-h-32 overflow-auto whitespace-pre-wrap rounded-lg p-2 font-mono text-[9px] leading-relaxed",
              isSuccess
                ? "bg-emerald-500/10 text-emerald-300/70"
                : "bg-amber-500/10 text-amber-300/70"
            )}
          >
            {typeof result.result_json === "string"
              ? result.result_json
              : JSON.stringify(result.result_json, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function ConclusionSection({ rawResult }: { rawResult: string }) {
  const data = useMemo(() => parseResultContent(rawResult), [rawResult])

  return (
    <div className="border-t border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <IconSparkles size={12} className="text-emerald-400" />
        </div>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-400">
            Conclusion
          </span>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-200/80">
            {data.desc || rawResult}
          </p>
        </div>
      </div>
    </div>
  )
}
