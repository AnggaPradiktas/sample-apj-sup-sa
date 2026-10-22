# AWS Connect AI Contact Center Readiness Lens

AI agents in an AWS Connect Customer contact center answer customer questions and suggest responses to human agents, using the content in your knowledge bases. The quality of those answers depends on that content and on the controls around it. When articles are disorganized or stale, AI agents give wrong answers. When guardrails and escalation paths are missing, AI agents can expose sensitive data and leave customers without a way to reach a person. Either way, the human agents they assist stop trusting them.

This sample provides two custom [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) lenses that assess whether your content, knowledge bases, AI guardrails, security controls, and operations are ready for AI agents. You import a lens into the [AWS Well-Architected Tool](https://aws.amazon.com/well-architected-tool/), answer its questions for your AWS Connect workload, and get a risk rating and an improvement plan for each question. Run it before launch, and again as your deployment grows.

The following diagram shows the path the lenses assess, from the knowledge articles you write to the answers customers and human agents get. Each number marks one pillar of the full readiness lens. The Startup Essentials lens covers the same six areas with fewer questions.

![Diagram of the six areas that the lens assesses. Knowledge articles in AWS S3, Salesforce, ServiceNow, Zendesk, SharePoint Online, and websites (pillar 1, content strategy) flow into knowledge bases (pillar 2, knowledge base architecture). AI agents in AWS Connect Customer, with models and guardrails from AWS Bedrock (pillar 3, AI configuration and guardrails), answer customers on voice and chat and assist human agents. Feedback flows back to the articles (pillar 4, content lifecycle and governance). Security and compliance (pillar 5) and operational excellence with AWS CloudWatch (pillar 6) apply to every step.](images/lens-coverage.png)

> **Note:** These are custom lenses written by AWS Solutions Architects. They aren't part of the AWS Well-Architected Lens Catalog. They complement the [AWS Connect Well-Architected lenses](https://github.com/aws-samples/amazon-connect-well-architected-lenses), which cover general AWS Connect operations.

## What's in this folder

The folder contains two lens files, this guide, and its diagram.

| File | Description |
| --- | --- |
| [`ai-contact-center-readiness-startup-essentials-lens.json`](./ai-contact-center-readiness-startup-essentials-lens.json) | **Startup Essentials lens.** 21 questions and 62 best practices across six pillars. Covers the minimum foundations for a first launch of AI agents. |
| [`ai-contact-center-readiness-lens.json`](./ai-contact-center-readiness-lens.json) | **Full readiness lens.** 60 questions and 253 best practices across six pillars. For teams that run AI agents across several lines of business, channels, or languages, or that handle regulated data. |
| `README.md` | This guide. |
| [`images/`](./images/) | The diagram used in this guide. |

## Choose a lens

Both lenses follow the same path from content to operations, at different depths. Start with the Startup Essentials lens for a first deployment, and move to the full lens as your scope grows.

| | Startup Essentials lens | Full readiness lens |
| --- | --- | --- |
| Questions | 21 | 60 |
| Best practices | 62 | 253 |
| Use it when | You are preparing a first launch with a small team | You are adding lines of business, channels, or languages, or you handle payment, health, or other regulated data |
| Review time | About 45 minutes with the right people in the room | Plan a longer session, or split the pillars across the teams that own them |

## Prerequisites

You need the following before you import a lens:

- An AWS account with permission to use the AWS Well-Architected Tool, such as the [WellArchitectedConsoleFullAccess](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/WellArchitectedConsoleFullAccess.html) AWS managed policy or an equivalent least-privilege policy.
- The AWS Region where you review your AWS Connect workloads. Custom lenses are Regional, and each account can have up to 15 custom lenses per Region.

There is no additional charge for the [AWS Well-Architected Tool](https://aws.amazon.com/well-architected-tool/pricing/).

## Import a lens

A new custom lens starts in **DRAFT** status, and you must publish it before you can apply it to a workload. You can import and publish with the console or the AWS CLI.

### Import with the console

1. Download the lens file from this folder. On GitHub, open the file and choose **Download raw file**.
2. Open the [AWS Well-Architected Tool console](https://console.aws.amazon.com/wellarchitected/) in your Region, and choose **Custom lenses** in the navigation pane.
3. Choose **Create custom lens**, choose **Choose file**, and select the lens file.
4. Choose **Submit**. To page through the questions first, choose **Submit & Preview**.
5. Select the new lens, choose **Publish lens**, enter a **Version name** such as `1.0`, and choose **Publish custom lens**.

### Import with the AWS CLI

The following commands import the Startup Essentials lens and publish it as version `1.0`. Run them from this folder, and change the file name to import the full lens.

```bash
LENS_ARN=$(aws wellarchitected import-lens \
  --json-string file://ai-contact-center-readiness-startup-essentials-lens.json \
  --query LensArn --output text)

aws wellarchitected create-lens-version --lens-alias "$LENS_ARN" --lens-version 1.0
```

## Run a review

Answer the lens questions with the people who own each area, so that the answers reflect how the workload runs today.

1. Open the workload that represents your AWS Connect Customer instance, or define a new one, and [add the published lens to the workload](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-add.html).
2. Bring together the people who own knowledge content, contact flows and AI agent configuration, security, and operations.
3. Answer each question for the current state of the workload, not the planned state. If a question doesn't apply, mark it as not applicable.
4. Review the improvement plan. Fix high-risk items first, starting with safety and guardrails, and then plan the medium-risk items.
5. Save a milestone. Repeat the review before each significant launch and at a regular interval, such as quarterly.

Keep customer personal data out of your review notes.

## How risk is scored

Each question has three risk rules, and the WA Tool applies the first rule that matches your selected choices. The rules look for specific core best practices rather than a count, so which choices you select matters more than how many.

| Risk level | When it applies | Suggested action |
| --- | --- | --- |
| No risk | You selected every best practice in the question's no-risk rule | Maintain, and reassess after significant changes |
| Medium risk | You selected the core best practices in the question's medium-risk rule | Plan improvements within 30 to 60 days |
| High risk | Any other combination, including **None of these** | Remediate before launch |

## Lens contents

Each lens has six pillars. The following sections list the pillars and questions in each lens.

### Startup Essentials lens

The Startup Essentials lens covers the minimum each area needs before AI agents talk to customers.

| Pillar | Questions | Best practices | What it covers |
| --- | --- | --- | --- |
| Content Foundations | 3 | 8 | Content organized for retrieval, accurate and owned, and fit for voice and chat |
| Knowledge Base Setup | 4 | 11 | Ingestion and retrieval quality, freshness, fallback when there's no answer, and capacity |
| Safety & Guardrails | 4 | 13 | Harmful-content guardrails, sensitive data protection, grounding, and escalation to human agents |
| Security Basics | 3 | 9 | Access to knowledge bases and AI configuration, data privacy, and adversarial input |
| Launch Readiness | 4 | 12 | Success metrics, feedback loops, launch scope, and team preparation |
| Operations Basics | 3 | 9 | Monitoring, updates without downtime, and cost predictability |

Expand a pillar to see its questions.

<details>
<summary>Content Foundations</summary>

1. Do you have a structured content organization that AI can reliably retrieve from?
1. Is your content accurate, current, and maintained by someone accountable?
1. Can your content support the channels you plan to use (voice, chat, or both)?

</details>

<details>
<summary>Knowledge Base Setup</summary>

1. Have you configured your knowledge base ingestion for good retrieval quality?
1. How will you keep your knowledge base content up to date?
1. What happens when the AI cannot find an answer or the knowledge base is unavailable?
1. Is your knowledge base sized and configured to handle your expected query volume?

</details>

<details>
<summary>Safety & Guardrails</summary>

1. Have you configured guardrails to prevent harmful or inappropriate AI responses?
1. How do you prevent sensitive customer data from leaking through AI responses?
1. Is your AI grounded in your knowledge base content rather than making things up?
1. Have you designed clear escalation from AI to human agents?

</details>

<details>
<summary>Security Basics</summary>

1. Is access to your knowledge base and AI configuration properly secured?
1. Have you considered data privacy requirements for your AI content system?
1. Are you prepared for basic adversarial attempts against your AI system?

</details>

<details>
<summary>Launch Readiness</summary>

1. Have you defined what success looks like and how you will measure it?
1. Do you have a plan to collect feedback and iterate quickly after launch?
1. Are you launching with appropriate scope and a plan to expand?
1. Have you prepared your team (agents, supervisors) for AI-assisted operations?

</details>

<details>
<summary>Operations Basics</summary>

1. Do you have visibility into whether your AI content system is working?
1. Can you update content and configuration without downtime?
1. Do you understand your cost structure and can you predict monthly spend?

</details>

### Full readiness lens

The full readiness lens goes deeper in each area and adds governance, compliance, and continuous-improvement practices.

| Pillar | Questions | Best practices | What it covers |
| --- | --- | --- | --- |
| Content Strategy & Organization | 10 | 42 | Taxonomy, channel consistency, line of business segmentation, coverage gaps, authoring for AI, localization, personalization, and deduplication |
| Knowledge Base Architecture | 10 | 43 | Chunking, metadata, retrieval testing, data sources, freshness, search configuration, access scoping, resilience, and scale |
| AI Configuration & Guardrails | 10 | 43 | AI prompts, grounding, content filters, denied topics, sensitive data, escalation, conversation context, and model evaluation |
| Content Lifecycle & Governance | 10 | 41 | Authoring, review, staged deployment, ownership, agent and customer feedback, versioning, retirement, and usage analytics |
| Security & Compliance | 10 | 42 | Access control, role-based scoping, data residency, PCI DSS, HIPAA, prompt injection, audit trails, retention, and incident response |
| Operational Excellence & Continuous Improvement | 10 | 42 | Quality and performance monitoring, business impact, roles, runbooks, capacity, service updates, training, and experimentation |

Expand a pillar to see its questions.

<details>
<summary>Content Strategy & Organization</summary>

1. How do you define and manage content taxonomy and categorization standards?
1. How do you ensure content consistency across voice, chat, and self-service channels?
1. How do you segment and manage content across multiple lines of business or product domains?
1. How do you identify and address content coverage gaps against customer intents?
1. How do you author content optimized for AI retrieval and response generation?
1. How do you manage multilingual content and localization for AI-powered experiences?
1. How do you enable content personalization and contextual relevance in AI responses?
1. How do you manage knowledge article interconnection and cross-referencing?
1. How do you prioritize content creation and improvement based on business impact?
1. How do you manage content deduplication and resolve conflicting information?

</details>

<details>
<summary>Knowledge Base Architecture</summary>

1. How do you design chunking strategies appropriate for each content type?
1. How do you design and implement metadata enrichment and tagging for your knowledge base?
1. How do you measure and test retrieval quality (precision and recall)?
1. How do you integrate multiple data sources into your knowledge base architecture?
1. How do you ensure content freshness and timely synchronization?
1. How do you select and manage vector stores and embedding models?
1. How do you implement multi-tenant and access-scoped knowledge base architectures?
1. How do you design knowledge base high availability and disaster recovery?
1. How do you optimize search with hybrid retrieval, reranking, and filtering?
1. How do you ensure knowledge base performance and scalability?

</details>

<details>
<summary>AI Configuration & Guardrails</summary>

1. How do you engineer and manage system prompts for AI interactions?
1. How do you ensure AI responses are grounded in source content and prevent hallucination?
1. How do you configure content filters to block harmful or inappropriate content?
1. How do you configure denied topics to prevent AI from engaging on restricted subjects?
1. How do you detect and redact personally identifiable information (PII) in AI interactions?
1. How do you implement and tune contextual grounding checks?
1. How do you design AI self-service to human agent escalation paths?
1. How do you manage multi-turn conversation context for coherent AI interactions?
1. How do you use relevance signals and thresholds to decide when to trust AI responses?
1. How do you approach AI model selection and A/B testing for optimization?

</details>

<details>
<summary>Content Lifecycle & Governance</summary>

1. How do you define and enforce content authoring standards and templates?
1. How do you implement content review and approval workflows?
1. How do you implement staged content deployment and testing before production?
1. How do you establish and maintain content ownership and accountability?
1. How do you integrate agent feedback into content improvement processes?
1. How do you correlate customer feedback and satisfaction with content quality?
1. How do you implement content versioning and rollback capabilities?
1. How do you manage content retirement and archival?
1. How do you maintain a continuous content improvement cadence?
1. How do you track content analytics and usage to inform governance decisions?

</details>

<details>
<summary>Security & Compliance</summary>

1. How do you implement content access control and data classification for AI content?
1. How do you implement role-based content scoping for different user types?
1. How do you manage data residency and sovereignty requirements for AI content?
1. How do you ensure PCI DSS compliance for AI interactions involving payment content?
1. How do you ensure HIPAA compliance for AI interactions involving health information?
1. How do you protect against prompt injection and adversarial attacks on AI systems?
1. How do you maintain audit trails and logging for AI content interactions?
1. How do you manage data retention and purging policies for AI content systems?
1. How do you secure third-party content sources integrated into your knowledge base?
1. How do you prepare for and respond to AI content system security incidents and failures?

</details>

<details>
<summary>Operational Excellence & Continuous Improvement</summary>

1. How do you define and monitor quality metrics for AI content experiences?
1. How do you monitor technical performance (latency, errors, availability)?
1. How do you measure business impact of AI content experiences (AHT, FCR, CSAT, cost)?
1. How do you structure teams and define roles for AI content operations?
1. How do you maintain runbooks and standard operating procedures for AI content operations?
1. How do you approach capacity planning and scaling for AI content systems?
1. How do you manage AI model and service updates from AWS?
1. How do you train and enable content teams for AI-powered content operations?
1. How do you manage vendor and service dependencies for AI content systems?
1. How do you drive continuous experimentation and optimization of AI content experiences?

</details>

## Suggested launch metrics

Several questions ask you to define success metrics and measure them against a baseline from before AI agents. The following starting targets are suggestions from field experience, not AWS benchmarks. Set your own targets from your baseline.

| Metric | Starting target | How to measure |
| --- | --- | --- |
| AI response accuracy | Above 90% | QA sampling of AI responses against the source content |
| Agent acceptance of AI suggestions | Above 60%, or above 50% in the first week | The AI Agent Response Helpful and AI Agent Response Not Helpful metrics |
| Knowledge base coverage | Above 85% of top contact reasons | Gap analysis against contact reasons from conversational analytics |
| Content freshness | Average article age under 90 days | A metadata audit of your knowledge base content |
| AI agent latency | Under 3 seconds at P95 | The Average AI Agent Invocation Latency metric for trends, and end-to-end tests for percentiles |
| Ungrounded responses | Under 5% | The Faithfulness Score metric for orchestration AI agents, contextual grounding blocks for other AI agents, and QA sampling |
| First contact resolution | 5% improvement | A before-and-after comparison, plus the Goal Success Rate metric for self-service |
| Average handle time | 10% reduction | A before-and-after comparison against your baseline |

The Connect Customer metrics in this table are listed in [AI agent metrics](https://docs.aws.amazon.com/connect/latest/adminguide/ai-agent-metrics.html), and you can view them in the AI agent performance dashboard.

## Maturity model

Use these levels to describe where your AI content practice is today and where the lens results point next.

| Level | Name | Characteristics |
| --- | --- | --- |
| 1 | Initial | Ad hoc content, no optimization for AI retrieval, no governance, reactive fixes only |
| 2 | Developing | A basic knowledge base, minimal guardrails, reactive content updates, and limited metrics |
| 3 | Defined | A structured taxonomy, configured guardrails, authoring standards, and captured feedback |
| 4 | Managed | Metrics-driven decisions, active feedback loops, staged deployments, hardened security, and defined roles |
| 5 | Optimizing | Continuous improvement, canary testing, predictive gap analysis, automation, and regular experimentation |

## Implementation roadmap

This roadmap sequences common improvements over the first quarter. Adjust the timing to your team size and launch date.

### Phase 1: Foundation (weeks 1 to 4)

- [ ] Run the lens to set a baseline risk profile
- [ ] Define a content taxonomy and classification scheme
- [ ] Audit existing content for structure, freshness, and accuracy
- [ ] Set up Connect Customer AI agents with an initial knowledge base
- [ ] Configure baseline AI guardrails for harmful content and sensitive information
- [ ] Record baseline quality metrics
- [ ] Assign an owner to each content area

### Phase 2: Governance (weeks 5 to 8)

- [ ] Introduce authoring templates and review workflows
- [ ] Monitor content freshness and set review or expiry dates
- [ ] Classify content and scope access by role
- [ ] Give agents a way to rate and flag AI suggestions
- [ ] Document runbooks for common operations
- [ ] Set up a staged path for content and configuration changes
- [ ] Configure denied topics and contextual grounding checks

### Phase 3: Optimization (weeks 9 to 12)

- [ ] Measure retrieval quality with a precision and recall test set
- [ ] Evaluate hybrid search and tag-based filtering
- [ ] Build dashboards for average handle time, first contact resolution, and customer satisfaction
- [ ] Run a first red-team exercise against prompt injection and other adversarial input
- [ ] Hold regular improvement retrospectives
- [ ] Define escalation triggers and quality thresholds
- [ ] Track how often each article is retrieved and used

### Phase 4: Scale (week 13 onward)

- [ ] Onboard more lines of business and content domains
- [ ] Roll out content changes to a small share of traffic first
- [ ] Automate content quality scoring and gap detection
- [ ] Add languages and localized content
- [ ] Plan for model and service version changes
- [ ] Build the ability to A/B test prompts and content
- [ ] Review with the lens quarterly, and run a second full assessment to measure progress

## Customize the lens

The lens files follow the [lens format specification](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-format-specification.html). You can copy a lens and add questions specific to your organization, or remove questions that don't apply. Check the following rules before you import an edited file:

- Use `&&`, `||`, and `!` in risk-rule conditions. The importer rejects `AND` and `OR`.
- List risk rules from `NO_RISK` to `MEDIUM_RISK`, and put the `default` rule last. The WA Tool applies the first rule that matches, so a leading `default` rule imports without error but rates every answer as high risk.
- Give **None of these** choices (IDs that end in `_no`) a helpful resource only. The importer rejects an improvement plan on them.
- Keep question and choice titles to 128 characters or fewer, each question to 15 choices or fewer, and the file under 500 KB.
- Use only letters, numbers, spaces, and the characters `- _ . , : / ( ) @ ! & # + ' ?` in titles and descriptions. The importer rejects other characters, such as semicolons.
- Keep existing question and choice IDs unchanged when you edit text. The WA Tool identifies questions and choices by ID, so a changed ID appears as a deleted question and a new one.

To publish an edited file as a new version of a lens that you already imported, import it with the lens ARN and publish a new version:

```bash
aws wellarchitected import-lens --lens-alias "$LENS_ARN" \
  --json-string file://ai-contact-center-readiness-startup-essentials-lens.json

aws wellarchitected create-lens-version --lens-alias "$LENS_ARN" --lens-version 1.1
```

Add `--is-major-version` for changes that alter the meaning of the lens. The WA Tool applies minor versions to workloads automatically and notifies workload owners of major versions. For details, see [Publishing an update to a custom lens in AWS WA Tool](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-publish-update.html).

## Related resources

These pages cover the services and practices that the lenses assess.

**AWS Connect Customer**

- [Use AI agents for real-time assistance](https://docs.aws.amazon.com/connect/latest/adminguide/connect-ai-agent.html)
- [Initial set-up for AI agents](https://docs.aws.amazon.com/connect/latest/adminguide/ai-agent-initial-setup.html)
- [Use agentic self-service](https://docs.aws.amazon.com/connect/latest/adminguide/agentic-self-service.html)
- [Connect Customer conversational analytics](https://docs.aws.amazon.com/connect/latest/adminguide/contact-lens.html)
- [Optimizing your knowledge base for Amazon Q in Connect](https://aws.amazon.com/blogs/contact-center/optimizing-knowledge-base-amazon-q-in-connect/) (Amazon Q in Connect is the former name of Connect Customer AI agents)
- [Tailored support at scale: Turning a unified Salesforce KB into LOB-focused AI agents](https://aws.amazon.com/blogs/contact-center/tailored-support-at-scale-turning-a-unified-salesforce-kb-into-lob-focused-ai-agents/)
- [AWS Connect Well-Architected lenses](https://github.com/aws-samples/amazon-connect-well-architected-lenses)

**AWS Bedrock**

- [How content chunking works for knowledge bases](https://docs.aws.amazon.com/bedrock/latest/userguide/kb-chunking.html)
- [Detect and filter harmful content by using AWS Bedrock Guardrails](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html)
- [Use contextual grounding check to filter hallucinations in responses](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)
- [Contextual retrieval in Anthropic using AWS Bedrock Knowledge Bases](https://aws.amazon.com/blogs/machine-learning/contextual-retrieval-in-anthropic-using-amazon-bedrock-knowledge-bases/)

**AWS Well-Architected**

- [Lens format specification in AWS WA Tool](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-format-specification.html)
- [Creating a custom lens for a workload in AWS WA Tool](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-create.html)
- [Publishing an update to a custom lens in AWS WA Tool](https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-publish-update.html)
- [Custom lens templates (custom-lens-wa-hub)](https://github.com/aws-samples/custom-lens-wa-hub)

## Version history

| Version | Date | Changes |
| --- | --- | --- |
| 1.0 | 2026-10-22 | Initial public release of the Startup Essentials lens and the full readiness lens |

## Security

See [CONTRIBUTING](../../CONTRIBUTING.md#security-issue-notifications) for more information.

## Important notes

This lens is sample content for reference. Completing it doesn't certify or guarantee compliance with PCI DSS, HIPAA, GDPR, or any other framework. You should work with your security and legal teams to meet your organizational security, regulatory, and compliance requirements. Improvement plans point to AWS features that can incur costs, so review their pricing before you turn them on.

---

*Part of the [AWS APJ Startup Samples](../../README.md) repository. Provided for reference under the repository's MIT-0 license.*
