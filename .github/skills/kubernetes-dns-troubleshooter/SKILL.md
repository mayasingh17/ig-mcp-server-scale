---
name: kubernetes-dns-troubleshooter
description: This skill helps you troubleshoot DNS issues in Kubernetes.
---

# Kubernetes DNS Troubleshooter

This skill helps you troubleshoot DNS issues in Kubernetes. DNS is a centerpiece of communication in Kubernetes, it allows pods to discover other applications and communicate with the outside world.

## DNS Request Flow

**Forward Path (Request):**
1. Application Pods → kube-dns Service (DNS request for service/external name)
2. kube-dns Service → CoreDNS Pod (forwarding by host iptables)
3. CoreDNS Pod → Upstream DNS (if external name)
4. Upstream DNS resolves and responds

**Return Path (Response):**
- Upstream DNS → CoreDNS Pod → kube-dns Service → Application Pods

## `gadget_trace_dns` Tool

Traces DNS requests and responses in real-time using eBPF. It captures:
- **Kubernetes context**: node, namespace, pod name, container name
- **DNS data**: query name, query type (A, AAAA, etc.), response code, resolved addresses
- **Performance**: latency_ns (response time in nanoseconds)
- **Network details**: source/destination endpoints, nameserver, packet type (HOST/OUTGOING)

**Key filtering options:**
- `operator.KubeManager.namespace` - filter by Kubernetes namespace
- `operator.KubeManager.podname` - filter by pod name
- `operator.filter.filter` - filter output fields (e.g., `latency_ns>1000000` for queries >1ms)

**Run modes:**
- Foreground (default): returns results after specified duration
- Background: continuous tracing (duration=0)

## Troubleshooting Process

1. Check CoreDNS pods are healthy: `kubectl get pods -n kube-system -l k8s-app=kube-dns`
2. Run `gadget_trace_dns` filtered by namespace/pod to capture DNS traffic
3. Analyze latency_ns, rcode (response codes), and addresses fields
4. Look for high latency, NXDOMAIN errors (rcode==NameError)
5. Verify DNS requests have corresponding DNS responses
6. If there are any observations, please rerun the tool with additional filtering options.
