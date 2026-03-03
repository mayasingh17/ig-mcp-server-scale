---
deck:
  title: "Ask and You Shall Debug: Conversational Troubleshooting for Kubernetes"
  subtitle: "Inspektor Gadget MCP Server (SCaLE)"
  event: "SCaLE 23x"
  branding:
    organization: "Inspektor Gadget"
    primary_color: "#000000"   # true black background
    accent_color: "#FF2D7E"    # Inspektor Gadget pink
    font: "Calibri"
    text_color: "#FFFFFF"      # white text
    logo:
      path: "docs\media\ig-logo-compact.svg"
      placement: "top-right"
  output:
    filename: "Ask_and_You_Shall_Debug_SCaLE.pptx"
  layout_defaults:
    slide_size: "16:9"
    background_color: "#000000"   # black background
    title_font_pt: 40
    body_font_pt: 24
    footer_font_pt: 12
    text_color: "#FFFFFF"         # white text
    footer_text: "Inspektor Gadget MCP Server • https://github.com/inspektor-gadget/ig-mcp-server"
  build_guidelines:
    - "No speaker notes."
    - "No cheesy AI generated images." 
    - "Prefer 3–5 bullets per slide; avoid dense text."
    - "Use consistent footer on all non-title slides."
    - "When referencing gadgets, use correct names (e.g., trace_dns, tcpdump, top_process, profile_blockio, top_blockio)."
    - "Screenshots are optional. Use placeholders if assets are missing."
    - "AI/slide generator is encouraged to choose the most effective layout and design for each slide based on the content provided."

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
title: "Ask and You Shall Debug:"
subtitle: "Conversational Troubleshooting for Kubernetes"
meta:
  bottom_right_corner:
    - "SCaLE 23x"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 2
id: about-me
title: "About Me"
bio: |
  Maya Singh is a Product Manager at Microsoft working on AKS observability, security, and developer experience. She is a maintainer of the Inspektor Gadget project and and has spoken at KubeCon, SCaLE, and other industry events.
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 3
id: why-and-setup
title: "Why conversational troubleshooting?"
content:
  - "Incidents are time-sensitive and cognitively expensive"
  - "Troubleshooting often requires many tools + exact commands"
  - "Goal: make real-time observability accessible via natural language to decrease mean time to resolution and get workloads back to green"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 4
id: agenda
title: "Agenda"
content:
  - "Demo 1: It's always DNS!"
  - "Zoom out: Inspektor Gadget + gadgets + eBPF"
  - "Why MCP server (and how it fits)"
  - "Mini-demos: disk pressure, CPU saturation, networking misconfig"
  - "Wrap-up + resources"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 5
id: scenario-1-dns-symptoms
title: "It's Always DNS"
narrative: "You're on-call. It's Sunday afternoon. A Slack message appears: 'Hey, something seems slow... some requests are timing out but not all of them. Feels intermittent?' You've seen this before. You take a breath. You open your laptop."
content:
  - "Symptom: intermittent timeouts — but only for *some* requests"
  - "Some lookups resolve fine. Others hang for 5+ seconds then fail."
  - "Is it the app? The network? DNS? A flaky upstream service?"
  - "Hypothesis space is large — and the clock is ticking"
callouts:
  - "Where do you even start?"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 6
id: scenario-1-dns-trace
title: "Let's Ask Copilot"
narrative: "[LIVE DEMO] Ask: 'I'm seeing intermittent DNS timeouts in my cluster. Can you help me figure out what's going on?' — watch the MCP server pick trace_dns, run it, and surface the answer."
content:
  - "The cluster has a pod making two DNS queries in a loop:"
  - "  ✅  example.com → cluster nameserver → resolves fast"
  - "  ❌  socallinuxexpo.org → 1.2.3.4 → unreachable, times out every time"
  - "trace_dns captures every request/response pair with latency"
  - "The AI reads the output and pinpoints the bad nameserver (1.2.3.4)"
callouts:
  - "A 5-second timeout is obvious in the data. The hard part was knowing where to look."
images:
  - path: "docs/media/placeholder_trace_dns.png"
    caption: "TODO: screenshot of trace_dns output showing failed requests for socallinuxexpo.org via 1.2.3.4"
    optional: true
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 7
id: zoom-out-what-is-ig
title: "What is Inspektor Gadget?"
bullets:
  - "A systems inspection + data collection framework powered by eBPF"
  - "Provides observability in Kubernetes and Linux contexts"
  - 'Ships a wide selection of "gadgets" for debugging and monitoring'
  - "Designed to make low-level visibility easy within familiar workflows"
images:
  - path: "docs/media/inspektor-gadget-logo.png"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 8
id: what-is-a-gadget
title: 'What is a "gadget"?'
bullets:
  - "A purpose-built eBPF powered observability tool (trace / snapshot / top / profile)"
  - "Examples we'll use today:"
  - "• trace_dns (DNS requests/responses + latency)"
  - "• profile_blockio + top_blockio (disk pressure / block I/O)"
  - "• top_process (CPU-heavy processes)"
  - "• tcpdump (packet capture with filters in container context)"
callouts:
  - "Library of gadgets can be found on artifact hub"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 9
id: what-is-ebpf
title: "What is eBPF?"
content:
  - "eBPF lets you run sandboxed programs inside the Linux kernel — safely, without kernel modules"
  - "Programs are triggered by events: syscalls, network packets, function calls, and more"
  - "Zero code changes to the app or the kernel required"
  - "Used by observability, security, and networking tools across the industry"
callouts:
  - "Think of it as a superpower for seeing exactly what's happening inside your system."
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 10
id: why-mcp
title: "Problem: many gadgets → hard to choose"
bullets:
  - "Inspektor Gadget has a large library of powerful gadgets"
  - "In an incident, we found picking the *right* gadget quickly is the hard part"
  - "Teams end up memorizing commands, or reaching for familiar tools first"
  - 'We wanted: "describe the symptom → get the right tool + next step"'
callouts:
  - "This is where we discovered MCP."
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 11
id: what-is-mcp
title: "What is MCP (Model Context Protocol)?"
bullets:
  - "A standard way for an LLM to call external tools in a structured, safe way"
  - "Tools are exposed with names + schemas (inputs/outputs are predictable)"
  - "Lets the model choose actions (run tools) and then explain results"
  - "In our case: the tools are Inspektor Gadget gadgets via ig-mcp-server"
callouts:
  - 'MCP turns "chat" into "chat + actions" (tool calls).'
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 12
id: architecture-high-level
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
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 13
id: agent-skills
title: "Agent Skills: The AI's Playbook"
content:
  - "Agent skills are structured instruction sets that guide the AI during troubleshooting"
  - "Each skill defines: what symptoms to look for, which gadgets to run, and how to interpret results"
  - "Think of them as runbooks — but the AI reads and executes them in real time"
  - "Skills make AI-assisted troubleshooting repeatable, auditable, and domain-aware"
  - "Teams can author custom skills for their own infrastructure and failure patterns"
callouts:
  - "The AI isn't guessing — it's following your team's best practices, at machine speed."
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 14
id: human-vs-ai
title: "Human vs. AI troubleshooting"
bullets:
  - "Humans: hypothesis-driven, sequential, bias-prone under pressure"
  - "LLM + real-time tools: broader search, more consistent method"
  - "Best results come from collaboration (human judgment + machine speed)"
  - "Guardrail: confirm findings with observable evidence"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 15
id: scenario-2-disk-pressure
title: "Scenario 2: Disk pressure"
bullets:
  - "Symptom: disk pressure alerts, slow writes, cascading failures"
  - "Identify which workloads drive I/O and what patterns are present"
  - "Gadgets:"
  - "• profile_blockio (profiling block I/O behavior)"
  - "• top_blockio (top block I/O contributors)"
  - "• top_file (top file reads/writes)"
images:
  - path: "docs/media/placeholder_blockio.png"
    caption: "TODO: screenshot of profile_blockio/top_blockio output"
    optional: true
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 16
id: scenario-3-cpu
title: "Scenario 3: CPU Utilization"
bullets:
  - "Symptom: high latency + throttling + noisy neighbor suspicion"
  - "Goal: identify CPU-heavy processes in the relevant workload context"
  - "Gadget: top_process"
  - "Optional deeper profiling exists: profile_cpu"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 17
id: scenario-4-networking
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
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 18
id: holmesgpt
title: "The Ecosystem is Growing: HolmesGPT"
content:
  - "HolmesGPT is an open source AI-powered on-call assistant for Kubernetes"
  - "Integrates natively with Inspektor Gadget's toolset as a data source"
  - "Investigates alerts automatically: reads metrics, logs, and IG gadget output"
  - "Gives plain-language root cause analysis — not just raw data"
  - "Complements the MCP server approach: same IG primitives, different interface"
callouts:
  - "IG gadgets are becoming a building block for the next generation of AI ops tooling."
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 19
id: operations-safety
title: "Operations & safety"
bullets:
  - "Run MCP server in read-only mode when appropriate"
  - "Use restricted permissions via dedicated service account"
  - "Reduce scope to avoid overload (namespace, limits, timeouts)"
  - "Treat AI recommendations as hypotheses until validated"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true

# Slide 20
id: wrap-up
title: "Wrap-up"
bullets:
  - "Inspektor Gadget: real-time observability powered by eBPF"
  - "MCP server: makes gadgets accessible through an AI interface"
  - "Scenarios: DNS latency, disk pressure, CPU saturation, networking"
  - "Resources:"
  - "• IG MCP Server: https://github.com/inspektor-gadget/ig-mcp-server"
  - "• Inspektor Gadget: https://github.com/inspektor-gadget/inspektor-gadget"
  - "• Website: https://www.inspektor-gadget.io/"
images:
  - path: "docs\media\ig-logo-compact.svg"
    placement: "top-right"
    fit: "contain"
    optional: true
