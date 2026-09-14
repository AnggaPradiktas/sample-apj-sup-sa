// Flow diagrams for the developer docs "Architecture" deep-dive subsections:
//   - AgentCoreFlow  : how the Bedrock AgentCore Gateway invocation works
//   - ConnectFlow    : the Amazon Connect chat / contact-flow routing
//   - IsolationFlow  : end-to-end tenant isolation (login -> database)
//
// Self-contained, responsive inline SVG (viewBox scales to container width),
// reusing the official AWS icons under /public/aws-icons. No dependencies.
import type { ReactNode } from "react";

const ICON: Record<string, string> = {
  user: "/aws-icons/user.svg",
  cognito: "/aws-icons/cognito.svg",
  spa: "/aws-icons/client.svg",
  apigw: "/aws-icons/apigateway.svg",
  lambda: "/aws-icons/lambda.svg",
  connect: "/aws-icons/connect.svg",
  amazonq: "/aws-icons/amazonq.svg",
  agentcore: "/aws-icons/agentcore.svg",
  opensearch: "/aws-icons/opensearch.svg",
  aurora: "/aws-icons/aurora.svg",
  attr: "/aws-icons/jsonscript.svg",
};

const GRAY = "#475569";
const GREEN = "#3f9142";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  icon?: keyof typeof ICON;
  title: string;
  sub?: string;
  tone?: "default" | "green" | "amber";
}

function center(b: Box) {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

// Intersection of the center->center segment with a box border.
function borderPoint(b: Box, tx: number, ty: number) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = b.w / 2 + 3;
  const hh = b.h / 2 + 3;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function Frame({
  vw,
  vh,
  aria,
  children,
}: {
  vw: number;
  vh: number;
  aria: string;
  children: ReactNode;
}) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-ink-200 bg-white p-3">
      <svg
        viewBox={`0 0 ${vw} ${vh}`}
        width="100%"
        role="img"
        aria-label={aria}
        style={{
          display: "block",
          minWidth: 640,
          height: "auto",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <defs>
          <marker id="fd-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GRAY} />
          </marker>
          <marker id="fd-green" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill={GREEN} />
          </marker>
        </defs>
        {children}
      </svg>
    </div>
  );
}

function BoxCard({ b }: { b: Box }) {
  const stroke = b.tone === "green" ? "#a9cfa6" : b.tone === "amber" ? "#e8c39b" : "#d7dee7";
  const fill = b.tone === "green" ? "#f4faf3" : b.tone === "amber" ? "#fdf7ef" : "#ffffff";
  const tile = 26;
  const hasIcon = !!b.icon;
  const tx = hasIcon ? b.x + 42 : b.x + 14;
  const midY = b.y + b.h / 2;
  return (
    <g>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="9" fill={fill} stroke={stroke} strokeWidth="1.2" />
      {hasIcon && (
        <image
          href={ICON[b.icon as keyof typeof ICON]}
          x={b.x + 10}
          y={midY - tile / 2}
          width={tile}
          height={tile}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
      <text x={tx} y={b.sub ? midY - 3 : midY + 4} fontSize="11.5" fontWeight={700} fill="#1f2937">
        {b.title}
      </text>
      {b.sub && (
        <text x={tx} y={midY + 11} fontSize="9" fill="#6b7280">
          {b.sub}
        </text>
      )}
    </g>
  );
}

interface EdgeSpec {
  a: Box;
  b: Box;
  label?: string;
  color?: string;
  dash?: string;
}

function edgePts(a: Box, b: Box) {
  const ca = center(a);
  const cb = center(b);
  return { p1: borderPoint(a, cb.x, cb.y), p2: borderPoint(b, ca.x, ca.y) };
}

function EdgeLine({ a, b, color = GRAY, dash }: EdgeSpec) {
  const { p1, p2 } = edgePts(a, b);
  return (
    <line
      x1={p1.x}
      y1={p1.y}
      x2={p2.x}
      y2={p2.y}
      stroke={color}
      strokeWidth="1.8"
      strokeDasharray={dash}
      markerEnd={color === GREEN ? "url(#fd-green)" : "url(#fd-gray)"}
    />
  );
}

function EdgeLabel({ a, b, label, color = GRAY }: EdgeSpec) {
  if (!label) return null;
  const { p1, p2 } = edgePts(a, b);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  return (
    <text
      x={mx}
      y={my - 4}
      fontSize="9"
      textAnchor="middle"
      fill={color}
      style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3.5, strokeLinejoin: "round" }}
    >
      {label}
    </text>
  );
}

function Edges({ edges }: { edges: EdgeSpec[] }) {
  return (
    <>
      {edges.map((e, i) => (
        <EdgeLine key={`l${i}`} {...e} />
      ))}
    </>
  );
}
function EdgeLabels({ edges }: { edges: EdgeSpec[] }) {
  return (
    <>
      {edges.map((e, i) => (
        <EdgeLabel key={`t${i}`} {...e} />
      ))}
    </>
  );
}

function Note({
  x,
  y,
  w,
  lines,
  tone = "green",
  heading = true,
}: {
  x: number;
  y: number;
  w: number;
  lines: string[];
  tone?: "green" | "amber" | "gray";
  heading?: boolean;
}) {
  const fill = tone === "green" ? "#eef7ee" : tone === "amber" ? "#fdf0e6" : "#f1f5f9";
  const stroke = tone === "green" ? "#a9cfa6" : tone === "amber" ? "#e8c39b" : "#cbd5e1";
  const h = 16 + lines.length * 15;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" fill={fill} stroke={stroke} strokeWidth="1" />
      {lines.map((ln, i) => (
        <text
          key={i}
          x={x + 12}
          y={y + 19 + i * 15}
          fontSize="10"
          fontWeight={heading && i === 0 ? 700 : 400}
          fill="#374151"
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function LaneLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} fontSize="11" fontWeight={700} fill="#64748b">
      {text}
    </text>
  );
}

// ============================================================================
// 1) AgentCore invocation flow
// ============================================================================
export function AgentCoreFlow() {
  const y = 40;
  const w = 152;
  const h = 62;
  const step = 168;
  const at = (i: number) => 12 + i * step;
  const b = {
    merchant: { x: at(0), y, w, h, icon: "user", title: "Merchant", sub: "asks in live chat" } as Box,
    connect: { x: at(1), y, w, h, icon: "connect", title: "Amazon Connect", sub: "chat flow · Lex" } as Box,
    qic: { x: at(2), y, w, h, icon: "amazonq", title: "Q in Connect", sub: "orchestrator agent" } as Box,
    gateway: { x: at(3), y, w, h, icon: "agentcore", title: "AgentCore GW", sub: "MCP · CUSTOM_JWT" } as Box,
    interceptor: { x: at(4), y, w, h, icon: "lambda", title: "Interceptor", sub: "tenant gate", tone: "green" } as Box,
    tool: { x: at(5), y, w, h, icon: "lambda", title: "Transaction tool", sub: "MCP target" } as Box,
    search: { x: at(6), y, w, h, icon: "opensearch", title: "OpenSearch", sub: "private collection" } as Box,
  };
  // Arrows only (green = tenant-enforcement hops); the sequence detail lives in
  // the Note + prose, which keeps this tight row free of overlapping labels.
  const edges: EdgeSpec[] = [
    { a: b.merchant, b: b.connect },
    { a: b.connect, b: b.qic },
    { a: b.qic, b: b.gateway },
    { a: b.gateway, b: b.interceptor, color: GREEN },
    { a: b.interceptor, b: b.tool, color: GREEN },
    { a: b.tool, b: b.search, color: GREEN },
  ];
  return (
    <Frame
      vw={1180}
      vh={250}
      aria="AgentCore invocation flow: merchant chat to Amazon Connect to Q in Connect orchestrator to the AgentCore Gateway, whose request interceptor injects the trusted tenant before the transaction tool queries OpenSearch."
    >
      <Edges edges={edges} />
      {Object.values(b).map((box, i) => (
        <BoxCard key={i} b={box} />
      ))}
      <EdgeLabels edges={edges} />
      <Note
        x={at(3)}
        y={148}
        w={656}
        lines={[
          "Request interceptor — runs on every tools/call (never trusts the model):",
          "1 · strips any model-supplied merchant_id / merchant / tenant keys",
          "2 · GetContactAttributes(contactId) → resolves the trusted merchant_id",
          "3 · injects __trusted_merchant_id — the only key the tool will read (else it fails closed)",
        ]}
      />
    </Frame>
  );
}

// ============================================================================
// 2) Amazon Connect chat / contact-flow routing
// ============================================================================
export function ConnectFlow() {
  const w = 158;
  const h = 60;
  // left spine
  const merchant = { x: 12, y: 150, w: 120, h, icon: "user", title: "Merchant", sub: "SPA live chat" } as Box;
  const chat = { x: 150, y: 150, w, h, icon: "lambda", title: "ChatApiFn", sub: "StartChatContact" } as Box;
  const flow = { x: 330, y: 150, w, h, icon: "connect", title: "Contact flow", sub: "anycompany-pay-chat-inbound" } as Box;
  // agentic branch (top)
  const lex = { x: 520, y: 44, w, h, title: "Amazon Lex", sub: "Get input · QinConnectIntent" } as Box;
  const qic = { x: 700, y: 44, w, h, icon: "amazonq", title: "Q in Connect", sub: "self-service orchestrator" } as Box;
  const reply = { x: 900, y: 44, w: 150, h, title: "Reply to merchant", sub: "multi-turn" } as Box;
  // human branch (bottom)
  const queue = { x: 520, y: 256, w, h, icon: "connect", title: "Queue + transfer", sub: "Update target → Transfer" } as Box;
  const routing = { x: 700, y: 256, w, h, icon: "connect", title: "Routing profile", sub: "anycompany-pay-chat (CHAT)" } as Box;
  const agent = { x: 900, y: 256, w: 150, h, icon: "user", title: "Human agent", sub: "CCP (Streams)" } as Box;

  // Labels only on the roomy diagonal branches + the loop; the spine/row hops
  // are left unlabeled to avoid colliding with box text in the tight gaps.
  const edges: EdgeSpec[] = [
    { a: merchant, b: chat },
    { a: chat, b: flow },
    { a: flow, b: lex, label: "self-service", color: GREEN },
    { a: flow, b: queue, label: "human / escalate" },
    { a: lex, b: qic },
    { a: qic, b: reply },
    { a: queue, b: routing },
    { a: routing, b: agent },
  ];
  const boxes = [merchant, chat, flow, lex, qic, reply, queue, routing, agent];
  return (
    <Frame
      vw={1070}
      vh={360}
      aria="Amazon Connect chat routing: ChatApiFn starts the contact with JWT-sourced attributes; the contact flow branches to the Q in Connect self-service orchestrator (via Lex) or transfers to a human agent through the support queue and routing profile."
    >
      <LaneLabel x={520} y={30} text="Agentic self-service (multi-turn)" />
      <LaneLabel x={520} y={242} text="Human handoff" />
      <Edges edges={edges} />
      {/* multi-turn loop: reply back to Lex */}
      <path
        d={`M ${reply.x + reply.w / 2} ${reply.y} C ${reply.x + reply.w / 2} 8, ${lex.x + lex.w / 2} 8, ${lex.x + lex.w / 2} ${lex.y}`}
        fill="none"
        stroke={GREEN}
        strokeWidth="1.6"
        strokeDasharray="5 4"
        markerEnd="url(#fd-green)"
      />
      <text x={(reply.x + lex.x) / 2 + 40} y="12" fontSize="9" textAnchor="middle" fill={GREEN}>
        continue conversation
      </text>
      {boxes.map((box, i) => (
        <BoxCard key={i} b={box} />
      ))}
      <EdgeLabels edges={edges} />
      <Note
        x={12}
        y={300}
        w={1046}
        tone="gray"
        heading={false}
        lines={[
          "Chats started from a case use ChatCaseFlow (stamps case_id after verifying tenant ownership); when the chat ends, the transcript is saved back to the case as a Connect Cases comment.",
        ]}
      />
    </Frame>
  );
}

// ============================================================================
// 3) End-to-end tenant isolation (login -> database)
// ============================================================================
export function IsolationFlow() {
  const h = 58;
  // Front spine (top): login -> token -> SPA -> API GW
  const merchant = { x: 16, y: 34, w: 150, h, icon: "user", title: "Merchant", sub: "signs in" } as Box;
  const cognito = { x: 198, y: 34, w: 168, h, icon: "cognito", title: "Amazon Cognito", sub: "ID token · merchant_id" } as Box;
  const spa = { x: 398, y: 34, w: 150, h, icon: "spa", title: "AnyCompanyPay SPA", sub: "Bearer ID token" } as Box;
  const apigw = { x: 580, y: 34, w: 168, h, icon: "apigw", title: "API Gateway", sub: "Cognito JWT authorizer" } as Box;

  // shared sink (tall, right)
  const search = { x: 1006, y: 150, w: 158, h: 210, icon: "opensearch", title: "OpenSearch", sub: "private · Pool model" } as Box;

  // Path A (direct search)
  const searchFn = { x: 580, y: 158, w: 200, h, icon: "lambda", title: "SearchApiFn", sub: "forces merchant_id", tone: "green" } as Box;

  // Path B (agentic) — 5 nodes
  const bw = 176;
  const bstep = 192;
  const bat = (i: number) => 16 + i * bstep;
  const by = 300;
  const chatFn = { x: bat(0), y: by, w: bw, h: 64, icon: "lambda", title: "ChatApiFn", sub: "stamp merchant_id attr" } as Box;
  const connect = { x: bat(1), y: by, w: bw, h: 64, icon: "connect", title: "Amazon Connect", sub: "contact attribute" } as Box;
  const qic = { x: bat(2), y: by, w: bw, h: 64, icon: "amazonq", title: "Q in Connect", sub: "[L1] refuses tenant", tone: "green" } as Box;
  const gateway = { x: bat(3), y: by, w: bw, h: 64, icon: "agentcore", title: "Gateway + interceptor", sub: "[L2] resolve + inject", tone: "green" } as Box;
  const tool = { x: bat(4), y: by, w: bw, h: 64, icon: "lambda", title: "Transaction tool", sub: "[L3] filter · fail closed", tone: "green" } as Box;

  // Labels only where arrows have clear room (the vertical/diagonal branches off
  // API Gateway and the long runs into the shared collection); the packed lane-B
  // hops stay unlabeled and rely on the box subtitles + prose.
  const front: EdgeSpec[] = [
    { a: merchant, b: cognito },
    { a: cognito, b: spa },
    { a: spa, b: apigw },
  ];
  const pathA: EdgeSpec[] = [
    { a: apigw, b: searchFn, label: "GET /transactions" },
    { a: searchFn, b: search, label: "forced filter", color: GREEN },
  ];
  const pathB: EdgeSpec[] = [
    { a: apigw, b: chatFn, label: "POST /chat/start" },
    { a: chatFn, b: connect, color: GREEN },
    { a: connect, b: qic },
    { a: qic, b: gateway },
    { a: gateway, b: tool, color: GREEN },
    { a: tool, b: search, label: "filter merchant_id", color: GREEN },
  ];
  const allEdges = [...front, ...pathA, ...pathB];
  const boxes = [merchant, cognito, spa, apigw, search, searchFn, chatFn, connect, qic, gateway, tool];
  return (
    <Frame
      vw={1180}
      vh={438}
      aria="End-to-end tenant isolation: Cognito issues an ID token carrying custom:merchant_id; the API Gateway JWT authorizer validates it; the direct search path forces the merchant_id filter from the claim, and the agentic path stamps the tenant onto the Connect contact, then the AgentCore Gateway interceptor injects the trusted merchant_id and the tool always filters by it, failing closed if absent. Both paths read the same private OpenSearch collection."
    >
      <LaneLabel x={16} y={148} text="A · Direct search (merchant app)" />
      <LaneLabel x={16} y={290} text="B · Agentic self-service (chat) — three enforcement layers L1·L2·L3" />
      <Edges edges={allEdges} />
      {boxes.map((box, i) => (
        <BoxCard key={i} b={box} />
      ))}
      <EdgeLabels edges={allEdges} />
      <Note
        x={16}
        y={392}
        w={1148}
        tone="green"
        heading={false}
        lines={[
          "merchant_id always comes from the validated JWT (or the Connect contact attribute derived from it) — never from the client or the model.",
          "Both read paths hit the same private OpenSearch collection (Pool model): one shared index where every document carries merchant_id.",
        ]}
      />
    </Frame>
  );
}
