// Solution architecture diagram for the developer docs.
//
// Self-contained, responsive inline SVG that mirrors the draw.io "AWS icons"
// architecture (docs/anycompany-pay-architecture-full-aws-icons.drawio): both use cases
// — (A) support cases and (B) live-chat agentic self-service — sharing Cognito,
// the API layer and one Amazon Connect instance, with the trusted-merchant_id
// tenant-isolation path highlighted. No dependencies, no interactivity, scales
// to the container width via viewBox.

type Kind =
  | "user"
  | "cognito"
  | "web"
  | "cloudfront"
  | "apigw"
  | "lambda"
  | "cases"
  | "connect"
  | "qic"
  | "agentcore"
  | "aurora"
  | "pipeline"
  | "opensearch"
  | "attr";

interface Node {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: Kind;
  label: string;
  sub?: string;
}

// Official AWS Architecture Icons (SVG), served from /public/aws-icons.
// Source: https://aws.amazon.com/architecture/icons/ (unmodified). Cases uses
// the Amazon Connect icon (Cases is a Connect capability); the SPA and contact
// attributes use the official General-Resource "Client" and "JSON Script" icons.
const ICON: Record<Kind, string> = {
  user: "/aws-icons/user.svg",
  cognito: "/aws-icons/cognito.svg",
  web: "/aws-icons/client.svg",
  cloudfront: "/aws-icons/cloudfront.svg",
  apigw: "/aws-icons/apigateway.svg",
  lambda: "/aws-icons/lambda.svg",
  cases: "/aws-icons/connect.svg",
  connect: "/aws-icons/connect.svg",
  qic: "/aws-icons/amazonq.svg",
  agentcore: "/aws-icons/agentcore.svg",
  aurora: "/aws-icons/aurora.svg",
  pipeline: "/aws-icons/opensearch-ingestion.svg",
  opensearch: "/aws-icons/opensearch.svg",
  attr: "/aws-icons/jsonscript.svg",
};

const NODES: Node[] = [
  // Band 1 — Client
  { id: "merchant", x: 34, y: 96, w: 168, h: 44, kind: "user", label: "Merchant" },
  { id: "admin", x: 34, y: 148, w: 168, h: 44, kind: "user", label: "Admin / Agent" },
  { id: "cognito", x: 34, y: 214, w: 168, h: 52, kind: "cognito", label: "Amazon Cognito", sub: "JWT: merchant_id" },
  { id: "spa", x: 34, y: 288, w: 168, h: 52, kind: "web", label: "AnyCompanyPay SPA", sub: "React app" },
  // Band 2 — Edge + API
  { id: "cloudfront", x: 258, y: 96, w: 168, h: 52, kind: "cloudfront", label: "CloudFront + ECS", sub: "serves the SPA" },
  { id: "apigw", x: 258, y: 214, w: 168, h: 58, kind: "apigw", label: "API Gateway", sub: "Cognito JWT authorizer" },
  // Band 3 — Lambdas
  { id: "casesFn", x: 482, y: 96, w: 168, h: 52, kind: "lambda", label: "CasesApiFn", sub: "cases CRUD" },
  { id: "chatFn", x: 482, y: 214, w: 168, h: 58, kind: "lambda", label: "ChatApiFn", sub: "/chat/start" },
  // Band 4 — Amazon Connect
  { id: "cases", x: 706, y: 92, w: 182, h: 58, kind: "cases", label: "Connect Cases", sub: "domain anycompany-pay-cases" },
  { id: "connect", x: 706, y: 190, w: 182, h: 52, kind: "connect", label: "Amazon Connect", sub: "chat flow · Lex" },
  { id: "attrs", x: 706, y: 276, w: 182, h: 48, kind: "attr", label: "Contact attributes", sub: "merchant_id · case_id" },
  // Band 5 — Q in Connect / AgentCore
  { id: "qic", x: 918, y: 190, w: 196, h: 52, kind: "qic", label: "Q in Connect", sub: "orchestrator agent" },
  { id: "gateway", x: 918, y: 276, w: 196, h: 58, kind: "agentcore", label: "AgentCore Gateway", sub: "MCP · interceptor" },
  // Data tier (bottom band): Aurora → zero-ETL → OpenSearch ← tool
  { id: "aurora", x: 56, y: 428, w: 196, h: 56, kind: "aurora", label: "Aurora PostgreSQL", sub: "system of record" },
  { id: "zeroetl", x: 300, y: 428, w: 180, h: 56, kind: "pipeline", label: "Zero-ETL (OSIS)", sub: "OpenSearch Ingestion" },
  { id: "opensearch", x: 528, y: 428, w: 210, h: 56, kind: "opensearch", label: "OpenSearch Serverless", sub: "index: transactions" },
  { id: "tool", x: 790, y: 428, w: 210, h: 56, kind: "lambda", label: "Transaction tool", sub: "trusts __trusted_merchant_id" },
];

const NODE = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<string, Node>;

type EdgeKind = "req" | "cases" | "tenant" | "data";
interface Edge {
  from: string;
  to: string;
  label?: string;
  kind: EdgeKind;
}

const EDGES: Edge[] = [
  { from: "cognito", to: "spa", label: "login", kind: "req" },
  { from: "cloudfront", to: "spa", label: "serves", kind: "req" },
  { from: "spa", to: "apigw", label: "REST (Bearer id token)", kind: "req" },
  // A — cases
  { from: "apigw", to: "casesFn", label: "cases", kind: "cases" },
  { from: "casesFn", to: "cases", label: "CRUD", kind: "cases" },
  // B — chat / agentic
  { from: "apigw", to: "chatFn", label: "chat/start", kind: "req" },
  { from: "chatFn", to: "connect", label: "StartChat", kind: "req" },
  { from: "chatFn", to: "attrs", label: "stamp merchant_id", kind: "tenant" },
  { from: "connect", to: "qic", label: "Lex → QIC", kind: "req" },
  { from: "qic", to: "gateway", label: "tools/call", kind: "req" },
  { from: "gateway", to: "attrs", label: "GetContactAttrs", kind: "tenant" },
  { from: "gateway", to: "tool", label: "inject __trusted_merchant_id", kind: "tenant" },
  { from: "tool", to: "opensearch", label: "filter merchant_id", kind: "tenant" },
  // Data plane — Aurora is the system of record; zero-ETL keeps OpenSearch in sync
  { from: "aurora", to: "zeroetl", label: "WAL + snapshot", kind: "data" },
  { from: "zeroetl", to: "opensearch", label: "index docs", kind: "data" },
];

const EDGE_STYLE: Record<EdgeKind, { stroke: string; dash?: string; marker: string }> = {
  req: { stroke: "#475569", marker: "url(#ah-req)" },
  cases: { stroke: "#2E73B8", marker: "url(#ah-cases)" },
  tenant: { stroke: "#3f9142", dash: "6 4", marker: "url(#ah-tenant)" },
  data: { stroke: "#8C4FFF", marker: "url(#ah-data)" },
};

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  fill: string;
  stroke: string;
}
const ZONES: Zone[] = [
  { x: 16, y: 66, w: 204, h: 292, label: "Client", fill: "#eef4fb", stroke: "#c3d4e8" },
  { x: 240, y: 66, w: 204, h: 292, label: "Edge + API", fill: "#fdf0e6", stroke: "#e8c39b" },
  { x: 464, y: 66, w: 204, h: 292, label: "Lambda (API)", fill: "#fdf0e6", stroke: "#e8c39b" },
  { x: 688, y: 66, w: 218, h: 292, label: "Amazon Connect", fill: "#fff7e0", stroke: "#e4cf8f" },
  { x: 910, y: 170, w: 212, h: 188, label: "Q in Connect · AgentCore", fill: "#efe9f6", stroke: "#c9b6e0" },
  { x: 40, y: 400, w: 976, h: 108, label: "Aurora VPC — private data plane", fill: "#e7f3e6", stroke: "#a9cfa6" },
];

// ---- geometry: intersection of the center→center segment with a node border
function borderPoint(r: Node, towardsX: number, towardsY: number) {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const dx = towardsX - cx;
  const dy = towardsY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = r.w / 2 + 3;
  const hh = r.h / 2 + 3;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

function NodeCard({ n }: { n: Node }) {
  const tile = 34;
  const ty = n.y + (n.h - tile) / 2;
  return (
    <g>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="9" fill="#ffffff" stroke="#d7dee7" strokeWidth="1.2" />
      <image
        href={ICON[n.kind]}
        x={n.x + 8}
        y={ty}
        width={tile}
        height={tile}
        preserveAspectRatio="xMidYMid meet"
      />
      <text x={n.x + 50} y={n.sub ? n.y + n.h / 2 - 3 : n.y + n.h / 2 + 4} fontSize="12.5" fontWeight={700} fill="#1f2937">
        {n.label}
      </text>
      {n.sub && (
        <text x={n.x + 50} y={n.y + n.h / 2 + 12} fontSize="9.5" fill="#6b7280">
          {n.sub}
        </text>
      )}
    </g>
  );
}

function edgeGeom(e: Edge) {
  const a = NODE[e.from];
  const b = NODE[e.to];
  const ac = { x: a.x + a.w / 2, y: a.y + a.h / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const p1 = borderPoint(a, bc.x, bc.y);
  const p2 = borderPoint(b, ac.x, ac.y);
  return { p1, p2, st: EDGE_STYLE[e.kind] };
}

function EdgeLine({ e }: { e: Edge }) {
  const { p1, p2, st } = edgeGeom(e);
  return (
    <line
      x1={p1.x}
      y1={p1.y}
      x2={p2.x}
      y2={p2.y}
      stroke={st.stroke}
      strokeWidth={e.kind === "tenant" ? 2.2 : 1.8}
      strokeDasharray={st.dash}
      markerEnd={st.marker}
    />
  );
}

// Labels are rendered in a separate pass ON TOP of the node cards (with a white
// halo) so they are never hidden behind a card when an edge midpoint lands over
// a node.
function EdgeLabel({ e }: { e: Edge }) {
  if (!e.label) return null;
  const { p1, p2, st } = edgeGeom(e);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2;
  return (
    <text
      x={mx}
      y={my - 3}
      fontSize="9"
      textAnchor="middle"
      fill={st.stroke}
      style={{ paintOrder: "stroke", stroke: "#ffffff", strokeWidth: 3.5, strokeLinejoin: "round" }}
    >
      {e.label}
    </text>
  );
}

const LEGEND: { label: string; kind: EdgeKind }[] = [
  { label: "Request / serve", kind: "req" },
  { label: "Support cases (Connect Cases)", kind: "cases" },
  { label: "Zero-ETL sync", kind: "data" },
  { label: "Trusted merchant_id — tenant isolation", kind: "tenant" },
];

export function ArchitectureDiagram() {
  const VW = 1140;
  const VH = 560;
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-ink-200 bg-white p-3">
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        width="100%"
        role="img"
        aria-label="AnyCompanyPay solution architecture: support cases and live-chat agentic self-service on Amazon Connect and Bedrock AgentCore, tenant-isolated by merchant_id."
        style={{ display: "block", minWidth: 720, height: "auto", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        <defs>
          {(["req", "cases", "tenant", "data"] as EdgeKind[]).map((k) => (
            <marker
              key={k}
              id={`ah-${k}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 0L10 5L0 10z" fill={EDGE_STYLE[k].stroke} />
            </marker>
          ))}
        </defs>

        {/* trust zones */}
        {ZONES.map((z) => (
          <g key={z.label}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="12" fill={z.fill} stroke={z.stroke} strokeWidth="1" />
            <text x={z.x + 12} y={z.y + 18} fontSize="11" fontWeight={700} fill="#64748b">
              {z.label}
            </text>
          </g>
        ))}

        {/* edge lines under nodes */}
        {EDGES.map((e, i) => (
          <EdgeLine key={i} e={e} />
        ))}

        {/* nodes */}
        {NODES.map((n) => (
          <NodeCard key={n.id} n={n} />
        ))}

        {/* edge labels on top of nodes so they are never clipped */}
        {EDGES.map((e, i) => (
          <EdgeLabel key={i} e={e} />
        ))}

        {/* legend */}
        <g transform={`translate(16, ${VH - 44})`}>
          <rect x="0" y="0" width="784" height="34" rx="8" fill="#ffffff" stroke="#e5e7eb" />
          {LEGEND.map((l, i) => {
            const x = 12 + i * 190;
            const st = EDGE_STYLE[l.kind];
            return (
              <g key={l.kind} transform={`translate(${x},17)`}>
                <line x1="0" y1="0" x2="22" y2="0" stroke={st.stroke} strokeWidth="2.4" strokeDasharray={st.dash} />
                <text x="28" y="3.5" fontSize="9.5" fill="#374151">
                  {l.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
