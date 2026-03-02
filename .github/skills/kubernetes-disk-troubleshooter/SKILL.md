---
name: kubernetes-disk-troubleshooter
description: Troubleshoot disk and block I/O issues in Kubernetes that manifest as high latency on file operations or in database workloads.
---

# Kubernetes Disk Troubleshooter

This skill helps you troubleshoot disk and block I/O issues in Kubernetes. Symptoms include slow file operations, database query latency, pods that are I/O-bound, or applications reporting high storage latency. The workflow moves from a cluster-wide latency profile, to identifying the noisiest pod, to pinpointing the exact file responsible.


## `gadget_profile_blockio` Tool

Use this tool **first** to build a latency histogram of block I/O activity across the cluster (or a specific namespace/pod). It traces every block device request and buckets completion times so you can immediately see whether latency is in the microsecond, millisecond, or second range before drilling deeper.

**Key fields returned:**
- `dev` – block device identifier (e.g. `sda`, `nvme0n1`)
- `cmd_flags` – the type of operation (read/write/flush/discard)
- `latency` – histogram of I/O completion latencies bucketed by duration

**Recommended usage:**
- Run for a short foreground window (10–30 seconds) to capture a representative sample while the workload is under load.
- Scope to a specific namespace with `operator.KubeManager.namespace` to reduce noise when you already have a suspect workload.
- If the histogram shows a significant tail (p99 >> p50), there is a real I/O latency problem worth investigating further with `gadget_top_blockio`.

**Example parameters:**
```json
{
  "duration": 15,
  "params": {
    "operator.KubeManager.namespace": "default"
  }
}
```


## `gadget_top_blockio` Tool

Use this tool **second**, after `gadget_profile_blockio` confirms elevated latency, to rank pods and processes by their block I/O activity. It periodically samples I/O throughput so you can quickly identify which pod or container is the heaviest consumer of block device bandwidth or is issuing the most I/O operations (which can saturate the device even at low individual latencies).

**Key fields returned:**
- `k8s.namespace`, `k8s.podName`, `k8s.containerName` – Kubernetes context of the process
- `proc.comm`, `proc.pid`, `proc.tid` – process and thread performing the I/O
- `rw` – direction: `read` or `write`
- `bytes` – total bytes transferred in the sampling interval
- `us` – time spent waiting for I/O in microseconds (high values indicate I/O pressure)
- `io` – number of I/O operations issued
- `major` / `minor` – block device numbers

**Key filtering and sorting options:**
- `operator.KubeManager.namespace` – restrict to one namespace
- `operator.KubeManager.podname` – restrict to a specific pod
- `operator.KubeManager.selector` – filter by pod label selector (e.g. `app=postgres`)
- `operator.KubeManager.all-namespaces` – scan all namespaces
- `operator.sort.sort` – sort results; use `-bytes` or `-us` to surface the highest-impact entries first
- `operator.filter.filter` – apply field-level filters, e.g. `rw==write` to focus on write traffic
- `operator.limiter.max-entries` – cap the number of rows returned per interval

**Run modes:**
- **Foreground (default):** Pass a `duration` in seconds. The tool blocks and returns aggregated results when the window closes. Good for a quick snapshot.
- **Background:** Pass `duration: 0`. The gadget runs continuously; retrieve results later with `ig_gadgets`. Use this when you need to correlate I/O spikes with application events over a longer window.

**Example parameters (foreground, sorted by bytes descending):**
```json
{
  "duration": 10,
  "params": {
    "operator.KubeManager.all-namespaces": "true",
    "operator.sort.sort": "-bytes"
  }
}
```


## `gadget_top_file` Tool

Use this tool **third**, once you have identified the offending pod or container from `gadget_top_blockio`, to rank individual files by their read/write activity inside that workload. This maps raw block device I/O back to the filesystem, telling you exactly which file, database data file, WAL segment, or log is responsible for the pressure.

**Key fields returned:**
- `file` – absolute path of the file being accessed
- `t` – file type: `R` (regular file), `S` (socket), `O` (other including pipes). Regular files are shown by default.
- `proc.comm`, `proc.pid`, `proc.tid` – process performing the I/O
- `k8s.namespace`, `k8s.podName`, `k8s.containerName` – Kubernetes context
- `reads` / `writes` – count of read/write operations in the interval
- `rbytes_raw` / `wbytes_raw` – bytes read/written (use `rbytes` / `wbytes` for human-readable)
- `inode` / `dev` – inode and device, useful for cross-referencing with filesystem tools

**Key filtering options:**
- `operator.KubeManager.containername` – narrow to the specific container identified in the previous step
- `operator.KubeManager.podname` – narrow to the specific pod
- `operator.KubeManager.namespace` – restrict to one namespace
- `operator.oci.ebpf.all-files` – set to `"true"` to also trace sockets and pipes (useful for database processes that use Unix sockets)
- `operator.oci.ebpf.pid` – trace only a specific process PID (use the `proc.pid` value from `gadget_top_blockio`)
- `operator.sort.sort` – sort by `-wbytes_raw` to surface the most-written file, or `-rbytes_raw` for the most-read file
- `operator.filter.filter` – e.g. `t==R` to restrict to regular files only

**Run modes:**
- **Foreground (default):** Pass a `duration` in seconds for a bounded snapshot. Suitable for interactive investigation.
- **Background:** Pass `duration: 0` to trace continuously. Useful when the I/O issue is intermittent and you need to wait for it to recur.

**Example parameters (foreground, scoped to a pod, sorted by write bytes):**
```json
{
  "duration": 10,
  "params": {
    "operator.KubeManager.namespace": "default",
    "operator.KubeManager.podname": "postgres-0",
    "operator.sort.sort": "-wbytes_raw"
  }
}
```


## Troubleshooting Process

Follow these steps in order to methodically root-cause disk / block I/O latency in a Kubernetes cluster.

### Step 1 – Profile block I/O latency cluster-wide

Run `gadget_profile_blockio` for 15–30 seconds to capture a latency histogram.

- If the histogram is clean (all operations complete in < 1 ms), block I/O is not the bottleneck — look elsewhere (network, CPU, application logic).
- If you see a heavy tail or operations in the tens-of-milliseconds range, proceed to Step 2.
- Note the `dev` value(s) with high latency — this tells you which physical or virtual disk is under pressure.

### Step 2 – Identify the noisiest pod with `gadget_top_blockio`

Run `gadget_top_blockio` scoped to the relevant namespace (or all namespaces) sorted by `-bytes` or `-us`.

- The top entries reveal which `k8s.podName` and `k8s.containerName` are consuming the most I/O bandwidth or spending the most time waiting on the block device.
- Note both the pod name and `proc.pid` of the top offending process — you will need these in Step 3.
- Check the `rw` field: sustained **write** pressure often points to log spam, checkpoint storms (databases), or runaway writes; sustained **read** pressure can indicate missing caches or repeated cold reads.
- If the culprit pod is a database (Postgres, MySQL, etcd), pay special attention to `us` — even moderate `bytes` with very high `us` indicates severe I/O queue depth or slow disk.

### Step 3 – Pinpoint the file with `gadget_top_file`

Run `gadget_top_file` scoped to the offending pod (and optionally filtered by the `proc.pid` from Step 2), sorted by `-wbytes_raw` or `-rbytes_raw` depending on whether writes or reads dominated in Step 2.

- The `file` field will show the absolute path inside the container, e.g.:
  - `/var/lib/postgresql/data/base/16384/1259` → a Postgres data file or system catalog
  - `/var/lib/postgresql/data/pg_wal/000000010000000000000001` → WAL segment (heavy writes here = checkpoint pressure)
  - `/var/log/app/access.log` → log file (runaway logging)
  - `/tmp/sort_temp_001` → temporary sort spill (query needs more `work_mem`)
- Use the file path to guide the remediation: tune database configuration, reduce log verbosity, add indexes to eliminate large sequential scans, or move the workload to a faster storage class.
- If no files appear or paths look like `/proc` entries, enable `operator.oci.ebpf.all-files=true` to capture non-regular-file I/O.
