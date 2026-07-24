# Remote Sync Lessons

This page captures operational lessons for the remote magazine translation job on `root@8.219.229.52`.

## Dependency Installs

The remote server has shown memory pressure during repeated `npm ci` runs. The cron wrapper should keep `MAGAZINE_INSTALL_DEPS=auto` as the default so ordinary scheduled runs skip dependency installation unless `node_modules` is missing or `package-lock.json` has changed.

Use `MAGAZINE_INSTALL_DEPS=always` only for explicit recovery after dependency corruption or lockfile changes. Use `npm ci --no-audit --no-fund` on the remote to avoid avoidable audit metadata work.

## SSH And Memory Symptoms

When SSH becomes reachable at TCP level but does not return a banner during a sync run, check remote memory pressure before assuming a network or `sshd_config` issue. A previous failed run died during `npm ci` with `SIGHUP`; previous-boot logs showed memory pressure, DNS lookup failures from SSH sessions, and OOM activity.

Useful checks:

```bash
journalctl -b -1
free -h
ps -eo pid,ppid,stat,etime,cmd | grep -E '[c]odex|[n]ode scripts/sync|[n]pm run|[r]un-daily'
tail -n 120 /root/aicode/runs/multi_language/logs/*.log
```

## Spark Usage Limits

Codex Spark quota can stop a partially translated issue. On 2026-07-24, the remote job completed Atlantic `2026-07-02` but stopped during Wired `2026-07-02` after translating 49 of 57 articles. The Codex error reported:

```text
You've hit your usage limit for GPT-5.3-Codex-Spark. Switch to another model now, or try again at Jul 29th, 2026 10:40 AM.
```

The message did not specify a timezone. Until the quota resets or another translation backend is configured, do not overwrite the remote partial `texts/` worktree. Let a later recovery run resume from the existing translated articles.

The completed subset was published on 2026-07-24: Atlantic `2026-07-02` exposes all 13 translated articles, and Wired `2026-07-02` exposes its 49 translated articles. The remaining 8 Wired articles stay in `texts/` with pending status and are filtered out of the website.

The remote crontab was paused on 2026-07-24 so it does not repeatedly hit the Spark quota limit. The backup is:

```text
/root/aicode/runs/multi_language/crontab-before-pause-20260724T100524+0800.txt
```

To resume after quota recovery, restore or uncomment:

```cron
30 23 * * * GIT_REMOTE=origin /root/aicode/multi_language/scripts/run-daily-magazines.sh
```

## Recovery Runs

Recovery should be based on repository state, not only on the current process's `changed` flag. If translated text already exists from a failed run, rerun validation and audit; once they pass, commit and publish the actual git changes.

Generated `public/content/` and `dist/` remain build artifacts. Source text under `texts/` is the durable data that should be committed to the `source` branch after successful validation.
