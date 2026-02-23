---
deck:
  title: "Ask and You Shall Debug: Conversational Troubleshooting for Kubernetes"
  subtitle: "Inspektor Gadget MCP Server (SCaLE)"
  event: "SCaLE"
  branding:
    organization: "Inspektor Gadget"
    primary_color: "#111827"   # near-black
    accent_color: "#2563EB"    # blue
    font: "Calibri"
    logo:
      path: "docs/media/inspektor-gadget-logo.png" # TODO: add file (or remove if not used)
      placement: "top-right"
  output:
    filename: "Ask_and_You_Shall_Debug_SCaLE.pptx"
  layout_defaults:
    slide_size: "16:9"
    title_font_pt: 40
    body_font_pt: 24
    footer_font_pt: 12
    footer_text: "Inspektor Gadget MCP Server • https://github.com/inspektor-gadget/ig-mcp-server"
  build_rules:
    - "No speaker notes."
    - "Prefer 3–5 bullets per slide; avoid dense text."
    - "Use consistent footer on all non-title slides."
    - "When referencing gadgets, use correct names (e.g., trace_dns, tcpdump, top_process, profile_blockio, top_blockio)."
    - "Screenshots are optional. Use placeholders if assets are missing."

repo_sources:
  - name: "SCaLE materials"
    repo: "mayasingh17/IG-MCP-Server-SCaLE"
    ref: "8e2ff3917b97a214e076247600ec4f042d806fc7"
    url: "https://github.com/mayasingh17/IG-MCP-Server-SCaLE"
  - name: "IG MCP Server"
    repo: "inspektor-gadget/ig-mcp-server"
    url: "https://github.com/inspektor-gadget/ig-mcp-server"
  - name: "Inspektor Gadget"
    repo: "inspektor-gadget/inspektor-gadget"
    url: "https://github.com/inspektor-gadget/inspektor-gadget"
  - name: "IG website"
    repo: "inspektor-gadget/website"
    url: "https://github.com/inspektor-gadget/website"
---

# Slide 1
id: title
layout: title
title: "Ask and You Shall Debug:"
subtitle: "Conversational Troubleshooting for Kubernetes"
meta:
  right_corner:
    - "SCaLE"
images:
  - path: "docs/media/inspektor-gadget-logo.png"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 2
id: why-and-setup
layout: title_and_bullets
title: "Why conversational troubleshooting?"
bullets:
  - "Incidents are time-sensitive and cognitively expensive"
  - "Troubleshooting often requires many tools + exact commands"
  - "Goal: make real-time observability accessible via natural language"
  - "We'll follow an on-call story and resolve multiple scenarios"

# Slide 3
id: agenda
layout: title_and_bullets
title: "Agenda"
bullets:
  - "Demo 1: DNS latency (trace_dns)"
  - "Zoom out: Inspektor Gadget + gadgets"
  - "Why MCP server (and how it fits)"
  - "Mini-demos: disk pressure, CPU saturation, networking misconfig"
  - "Wrap-up + resources"

# Slide 4
id: scenario-1-dns-symptoms
layout: title_and_bullets
title: "Scenario 1: Slow requests → DNS latency"
bullets:
  - "Symptom: intermittent slowness / timeouts"
  - "Hypothesis space is large (DNS, network, app, load, etc.)"
  - "We start by validating whether DNS resolution is slow"
  - "Tool we'll use: trace_dns"
callouts:
  - "Key idea: measure, don't guess."

# Slide 5
id: scenario-1-dns-trace
layout: title_and_bullets
title: "Using trace_dns to observe DNS in real time"
bullets:
  - "trace_dns traces DNS requests and responses"
  - "It captures request/response pairs and computes latency"
  - "Use it to identify slow lookups and affected workloads"
  - "Outcome: narrow the problem quickly and objectively"
images:
  - path: "docs/media/placeholder_trace_dns.png"
    caption: "TODO: screenshot of trace_dns output / table"
    optional: true

# Slide 6
id: zoom-out-what-is-ig
layout: title_and_bullets
title: "What is Inspektor Gadget?"
bullets:
  - "A systems inspection + data collection framework powered by eBPF"
  - "Provides observability in Kubernetes and Linux contexts"
  - "Ships a wide selection of "gadgets" for debugging and monitoring"
  - "Designed to make low-level visibility usable in familiar workflows"
images:
  - path: "docs/media/inspektor-gadget-logo.png"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 7
id: what-is-a-gadget
layout: title_and_bullets
title: "What is a "gadget"?"
bullets:
  - "A purpose-built observability tool (trace / snapshot / top / profile)"
  - "Examples we'll use today:"
  - "• trace_dns (DNS requests/responses + latency)"
  - "• profile_blockio + top_blockio (disk pressure / block I/O)"
  - "• top_process (CPU-heavy processes)"
  - "• tcpdump (packet capture with filters in container context)"

# Slide 8
id: why-mcp
layout: title_and_bullets
title: "Problem: many gadgets → hard to choose"
bullets:
  - "Inspektor Gadget has a large library of powerful gadgets"
  - "In an incident, picking the *right* gadget quickly is the hard part"
  - "Teams end up memorizing commands, or reaching for familiar tools first"
  - "We wanted: "describe the symptom → get the right tool + next step""
callouts:
  - "This is where we discovered MCP."

# Slide 9
id: what-is-mcp
layout: title_and_bullets
title: "What is MCP (Model Context Protocol)?"
bullets:
  - "A standard way for an LLM to call external tools in a structured, safe way"
  - "Tools are exposed with names + schemas (inputs/outputs are predictable)"
  - "Lets the model choose actions (run tools) and then explain results"
  - "In our case: the tools are Inspektor Gadget gadgets via ig-mcp-server"
callouts:
  - "MCP turns "chat" into "chat + actions" (tool calls)."

# Slide 10
id: architecture-high-level
layout: title_and_bullets
title: "High-level architecture"
bullets:
  - "Copilot/LLM ↔ MCP protocol ↔ ig-mcp-server ↔ Inspektor Gadget gadgets"
  - "Gadgets provide real-time signals; LLM turns signals into next steps"
  - "MCP server transports: stdio / sse / streamable-http"
  - "Gadget discovery: Artifact Hub or explicit gadget images"
images:
  - path: "docs/media/placeholder_architecture.png"
    caption: "TODO: diagram (LLM → MCP → IG MCP server → IG gadgets)"
    optional: true

# Slide 11
id: human-vs-ai
layout: title_and_bullets
title: "Human vs. AI troubleshooting"
bullets:
  - "Humans: hypothesis-driven, sequential, bias-prone under pressure"
  - "LLM + real-time tools: broader search, more consistent method"
  - "Best results come from collaboration (human judgment + machine speed)"
  - "Guardrail: confirm findings with observable evidence"

# Slide 12
id: scenario-2-disk-pressure
layout: title_and_bullets
title: "Scenario 2: Disk pressure"
bullets:
  - "Symptom: disk pressure alerts, slow writes, cascading failures"
  - "Identify which workloads drive I/O and what patterns are present"
  - "Gadgets:"
  - "• profile_blockio (profiling block I/O behavior)"
  - "• top_blockio (top block I/O contributors)"
images:
  - path: "docs/media/placeholder_blockio.png"
    caption: "TODO: screenshot of profile_blockio/top_blockio output"
    optional: true

# Slide 13
id: scenario-3-cpu
layout: title_and_bullets
title: "Scenario 3: CPU saturation"
bullets:
  - "Symptom: high latency + throttling + noisy neighbor suspicion"
  - "Goal: identify CPU-heavy processes in the relevant workload context"
  - "Gadget: top_process"
  - "Optional deeper profiling exists: profile_cpu"

# Slide 14
id: scenario-4-networking
layout: title_and_bullets
title: "Scenario 4: Networking config/port mismatch"
bullets:
  - "Symptom: app can't connect / sporadic failures"
  - "Validate assumptions by observing real packets"
  - "Gadget: tcpdump (packet capture with pcap-compatible filters)"
  - "Outcome: confirm mismatch between expected vs actual traffic patterns"
images:
  - path: "docs/media/placeholder_tcpdump.png"
    caption: "TODO: screenshot of tcpdump gadget output"
    optional: true

# Slide 15
id: operations-safety
layout: title_and_bullets
title: "Operations & safety"
bullets:
  - "Run MCP server in read-only mode when appropriate"
  - "Use restricted permissions via dedicated service account"
  - "Reduce scope to avoid overload (namespace, limits, timeouts)"
  - "Treat AI recommendations as hypotheses until validated"

# Slide 16
id: wrap-up
layout: title_and_bullets
title: "Wrap-up"
bullets:
  - "Inspektor Gadget: real-time observability powered by eBPF"
  - "MCP server: makes gadgets accessible through an AI interface"
  - "Scenarios: DNS latency, disk pressure, CPU saturation, networking"
  - "Resources:"
  - "• IG MCP Server: https://github.com/inspektor-gadget/ig-mcp-server"
  - "• Inspektor Gadget: https://github.com/inspektor-gadget/inspektor-gadget"
  - "• Website: https://www.inspektor-gadget.io/"
