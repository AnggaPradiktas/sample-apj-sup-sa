// Amazon Connect flow-language builders for the routing module.
//
// Flow-language constraints honoured here (Connect admin/dev guide):
//   - UpdateContactRoutingBehavior.QueuePriority must be STATIC, so tier priority
//     is a Compare -> one "Change routing priority" block per tier.
//   - UpdateContactRoutingCriteria is set DYNAMICALLY from the contact-context Lambda
//     (External namespace, response validation JSON) and only takes effect on
//     TransferContactToQueue into a STANDARD queue.
//   - Set priority BEFORE Transfer to queue (changes on a queued contact take
//     >= 60 s).

/* eslint-disable @typescript-eslint/no-explicit-any */
type Action = Record<string, any>;

const id = (n: number) => `c0a10000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function lambda(identifier: string, arn: string, next: string, onError: string, attrs?: Record<string, string>): Action {
  return {
    Identifier: identifier,
    Type: "InvokeLambdaFunction",
    Parameters: {
      LambdaFunctionARN: arn,
      InvocationTimeLimitSeconds: "8",
      ResponseValidation: { ResponseType: "JSON" },
      ...(attrs ? { LambdaInvocationAttributes: attrs } : {}),
    },
    Transitions: { NextAction: next, Errors: [{ NextAction: onError, ErrorType: "NoMatchingError" }] },
  };
}

function compare(identifier: string, value: string, cases: [string, string][], otherwise: string): Action {
  return {
    Identifier: identifier,
    Type: "Compare",
    Parameters: { ComparisonValue: value },
    Transitions: {
      NextAction: otherwise,
      Conditions: cases.map(([operand, next]) => ({
        NextAction: next,
        Condition: { Operator: "Equals", Operands: [operand] },
      })),
      Errors: [{ NextAction: otherwise, ErrorType: "NoMatchingCondition" }],
    },
  };
}

function checkHours(identifier: string, hoursArn: string, open: string, closed: string): Action {
  return {
    Identifier: identifier,
    Type: "CheckHoursOfOperation",
    Parameters: { HoursOfOperationId: hoursArn },
    Transitions: {
      NextAction: open,
      Conditions: [
        { NextAction: open, Condition: { Operator: "Equals", Operands: ["True"] } },
        { NextAction: closed, Condition: { Operator: "Equals", Operands: ["False"] } },
      ],
      Errors: [{ NextAction: open, ErrorType: "NoMatchingError" }],
    },
  };
}

const message = (identifier: string, text: string, next: string): Action => ({
  Identifier: identifier,
  Type: "MessageParticipant",
  Parameters: { Text: text },
  Transitions: { NextAction: next, Errors: [{ NextAction: next, ErrorType: "NoMatchingError" }], Conditions: [] },
});

const priority = (identifier: string, p: string, next: string): Action => ({
  Identifier: identifier,
  Type: "UpdateContactRoutingBehavior",
  Parameters: { QueuePriority: p },
  Transitions: { NextAction: next },
});

const setQueue = (identifier: string, queue: string, next: string, onError: string): Action => ({
  Identifier: identifier,
  Type: "UpdateContactTargetQueue",
  Parameters: { QueueId: queue },
  Transitions: { NextAction: next, Errors: [{ NextAction: onError, ErrorType: "NoMatchingError" }] },
});

const transfer = (identifier: string, end: string): Action => ({
  Identifier: identifier,
  Type: "TransferContactToQueue",
  Parameters: {},
  Transitions: {
    NextAction: end,
    Errors: [
      { NextAction: end, ErrorType: "QueueAtCapacity" },
      { NextAction: end, ErrorType: "NoMatchingError" },
    ],
  },
});

const disconnect = (identifier: string): Action => ({
  Identifier: identifier,
  Type: "DisconnectParticipant",
  Parameters: {},
  Transitions: {},
});

const logging = (identifier: string, next: string): Action => ({
  Identifier: identifier,
  Type: "UpdateFlowLoggingBehavior",
  Parameters: { FlowLoggingBehavior: "Enabled" },
  Transitions: { NextAction: next },
});

function layout(actions: Action[]) {
  // Simple left-to-right grid so the flow opens readably in the flow designer.
  return Object.fromEntries(
    actions.map((a, i) => [a.Identifier, { Position: { x: 160 + (i % 6) * 220, y: 40 + Math.floor(i / 6) * 200 } }])
  );
}

function flow(actions: Action[]) {
  return {
    Version: "2019-10-30",
    StartAction: actions[0].Identifier,
    Metadata: { EntryPointPosition: { x: 20, y: 20 }, ActionMetadata: layout(actions) },
    Actions: actions,
  };
}

/**
 * Routed inbound chat flow (Patterns A + B).
 *
 *   log -> contact-context Lambda -> Check hours
 *     closed -> OOH scheduler (case + scheduled task) -> acknowledge -> end
 *     open   -> case chat?  yes -> greet -> owner routable? -> Set routing criteria (owner, expiry)
 *                           no  -> [optional agentic Lex/Q in Connect; Escalate continues]
 *            -> priority (1 active-case reply | tier 1/2/5) -> tier queue -> Transfer to queue
 */
export function routedInboundFlow(p: {
  contextFnArn: string;
  oohFnArn: string;
  checkHoursArn: string;
  fallbackQueueArn: string;
  agentic?: { botAliasArn: string; assistantArn: string };
}) {
  const [LOG, CTX, HRS, OOH, OOH_ACK, OOH_ERR, CASE, CGREET, OWNER, CRIT, PRI, P1, P2, P5, SETQ, SETQ_FB, XFER, END] =
    Array.from({ length: 18 }, (_, i) => id(i + 1));
  const [WIS, WATT, LEX, LCMP] = [id(31), id(32), id(33), id(34)];
  const standardEntry = p.agentic ? WIS : PRI;

  const actions: Action[] = [
    logging(LOG, CTX),
    // On Lambda failure, External is empty: every Compare below falls through to
    // standard routing at default priority into the fallback queue.
    lambda(CTX, p.contextFnArn, HRS, HRS),
    checkHours(HRS, p.checkHoursArn, CASE, OOH),

    // ---- Pattern B: out of hours ----
    lambda(OOH, p.oohFnArn, OOH_ACK, OOH_ERR, { action: "intake" }),
    message(
      OOH_ACK,
      "Thanks for contacting AnyCompanyPay. We're currently closed. Your request is logged on case $.External.caseRef " +
        "and our team will follow up when we open ($.External.nextOpenLocal).",
      END
    ),
    message(OOH_ERR, "Thanks for contacting AnyCompanyPay. We're currently closed. Please reach out again during business hours.", END),

    // ---- In hours ----
    compare(CASE, "$.External.isCaseChat", [["true", CGREET]], standardEntry),
    message(CGREET, "Thanks — this chat is linked to your support case. Connecting you to your case team…", OWNER),
    // ---- Pattern A: offer the reply to the case owner first ----
    compare(OWNER, "$.External.routeToOwner", [["true", CRIT]], PRI),
    {
      Identifier: CRIT,
      // Flow-language type is UpdateContactRoutingCriteria (the dev guide page is
      // titled "UpdateRoutingCriteria", which Connect rejects as an action type).
      Type: "UpdateContactRoutingCriteria",
      Parameters: { RoutingCriteria: "$.External.RoutingCriteria" },
      Transitions: { NextAction: PRI, Errors: [{ NextAction: PRI, ErrorType: "NoMatchingError" }] },
    },
    compare(PRI, "$.External.routingPriority", [["1", P1], ["2", P2]], P5),
    priority(P1, "1", SETQ),
    priority(P2, "2", SETQ),
    priority(P5, "5", SETQ),
    setQueue(SETQ, "$.External.tierQueueArn", XFER, SETQ_FB),
    setQueue(SETQ_FB, p.fallbackQueueArn, XFER, END),
    transfer(XFER, END),
    disconnect(END),
  ];

  if (p.agentic) {
    // Same agentic self-service path as the existing inbound flow; an Escalate
    // now lands in the merchant's tier queue with tier priority.
    actions.push(
      {
        Identifier: WIS,
        Type: "CreateWisdomSession",
        Parameters: { WisdomAssistantArn: p.agentic.assistantArn },
        Transitions: { NextAction: WATT, Errors: [{ NextAction: WATT, ErrorType: "NoMatchingError" }] },
      },
      {
        Identifier: WATT,
        Type: "UpdateContactAttributes",
        Parameters: { Attributes: { "x-amz-lex:q-in-connect:session-arn": "$.Wisdom.SessionArn" } },
        Transitions: { NextAction: LEX, Errors: [{ NextAction: LEX, ErrorType: "NoMatchingError" }] },
      },
      {
        Identifier: LEX,
        Type: "ConnectParticipantWithLexBot",
        Parameters: {
          Text: "Hi, I'm the AnyCompanyPay assistant. How can I help with your account or transactions today?",
          LexV2Bot: { AliasArn: p.agentic.botAliasArn },
          LexSessionAttributes: { "x-amz-lex:q-in-connect:session-arn": "$.Wisdom.SessionArn" },
        },
        Transitions: {
          NextAction: LCMP,
          Errors: [
            { NextAction: END, ErrorType: "NoMatchingError" },
            { NextAction: LCMP, ErrorType: "NoMatchingCondition" },
          ],
          Conditions: [],
        },
      },
      compare(LCMP, "$.Lex.SessionAttributes.Tool", [["Escalate", PRI], ["Complete", END]], END)
    );
  }
  return flow(actions);
}

/**
 * OOH task flow — runs when the scheduled task starts (design §5.2).
 *   Check hours (on the block: no queue is set on the task yet)
 *     open   -> priority from $.Attributes.tierPriority -> ooh-followup queue -> Transfer
 *     closed -> closure longer than the 6-day limit: re-schedule Lambda -> end this task
 */
export function oohTaskFlow(p: { oohFnArn: string; checkHoursArn: string; oohQueueArn: string }) {
  const [LOG, HRS, PRI, P1, P2, P5, SETQ, XFER, RES, END] = Array.from({ length: 10 }, (_, i) => id(101 + i));
  return flow([
    logging(LOG, HRS),
    checkHours(HRS, p.checkHoursArn, PRI, RES),
    compare(PRI, "$.Attributes.tierPriority", [["1", P1], ["2", P2]], P5),
    priority(P1, "1", SETQ),
    priority(P2, "2", SETQ),
    priority(P5, "5", SETQ),
    setQueue(SETQ, p.oohQueueArn, XFER, END),
    transfer(XFER, END),
    // If re-scheduling fails, route the task now rather than lose it.
    lambda(RES, p.oohFnArn, END, PRI, { action: "reschedule" }),
    disconnect(END),
  ]);
}
