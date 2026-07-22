# Session Record: Remote Sync Dependency Install

- Time: 2026-07-22T15:45:21+08:00 Asia/Shanghai
- Window: exclusive after `.agent/records/2026-07-22T14-03-36+08-00-magazine-backfill-sync.md` to inclusive 2026-07-22T15:45:21+08:00 Asia/Shanghai
- Previous Record: `.agent/records/2026-07-22T14-03-36+08-00-magazine-backfill-sync.md`
- Commit: pending commit
- Branch: `master`
- Task: Diagnose why SSH to `8.219.229.52` became unavailable after manually starting magazine sync, then reduce the cron wrapper's avoidable memory pressure.
- Source Sessions: Harness: Codex. Harness Evidence: runtime/developer context identifies Codex and Codex tools. Session Sources Checked: current conversation, project entry docs, project memory, git status/diff, local test output, remote journal and process output from `root@8.219.229.52`. Session Sources Used: current conversation, `README.md`, `AGENTS.md`, `project-memory/index.md`, `project-memory/status/current-status.md`, `project-memory/project/content-pipeline.md`, local tests, remote `journalctl`, process, memory, and sync-log output. Unavailable Sources: no additional bounded transcript files were read because project-local records and the current conversation covered the commit window.

## Outcome

- Confirmed SSH to `root@8.219.229.52` recovered after the user's reboot; the current boot had low load and available memory.
- Found that the failed manual sync log stopped during `npm ci` and recorded `npm ERR! signal SIGHUP`.
- Previous-boot logs showed memory pressure, SSH/DNS degradation, and OOM activity around the failed access window.
- Changed `scripts/run-daily-magazines.sh` so `MAGAZINE_INSTALL_DEPS=auto` is the default dependency policy.
- The wrapper now installs dependencies only when `node_modules` is absent, `node_modules/.package-lock.json` is absent, or `package-lock.json` is newer than the installed lockfile. `MAGAZINE_INSTALL_DEPS=always` forces reinstall, and `MAGAZINE_INSTALL_DEPS=never` skips install.
- Updated README and project memory with the dependency-install policy and the remote SSH incident finding.

## Files And Context Read

- `README.md`
- `AGENTS.md`
- `project-memory/index.md`
- `project-memory/status/current-status.md`
- `project-memory/project/content-pipeline.md`
- `/Users/haha/.codex/skills/project-workflow/SKILL.md`
- `/Users/haha/.codex/skills/project-workflow/references/development-loop.md`
- `/Users/haha/.codex/skills/project-workflow/references/session-record.md`
- `/Users/haha/.codex/skills/project-workflow/references/harness-detection.md`
- `/Users/haha/.codex/skills/project-workflow/references/memory-policy.md`
- `/Users/haha/.codex/skills/gitlab-remote-run/SKILL.md`
- `scripts/run-daily-magazines.sh`
- Remote `journalctl -b -1`, SSH status, memory, process list, and sync log from `root@8.219.229.52`.

## Engineering Facts Learned

- After reboot at approximately 2026-07-22T15:15:02+08:00, SSH banner and login to `8.219.229.52` worked again.
- The interrupted manual sync was started at 2026-07-22T14:54:32+08:00 and did not reach magazine selection or translation; it died during dependency installation.
- Previous boot logs showed `systemd-journald` and `systemd-resolved` flushing caches under memory pressure, repeated SSH session DNS failures for `chatgpt.com` and `ab.chatgpt.com`, and OOM activity.
- Remote `node_modules` was left as a partial 20K directory after the interrupted install, so one controlled dependency install is still needed before the remote can run the full website build/export path again.

## Mistakes And Corrections

- The first manual launch used the wrapper while it still ran `npm ci` unconditionally. The wrapper now avoids repeated high-memory installs during ordinary cron runs.

## Project Memory Candidates

- For small remote machines, scheduled content sync should keep dependency installation on an auto/changed-only path and reserve forced installs for explicit recovery or lockfile changes.
- If SSH becomes reachable at TCP level but does not send an SSH banner during a sync run, check previous boot memory pressure, OOM, and `npm ci` logs before assuming a network or `sshd_config` problem.

## Open Questions And Risks

- The remote server still needs one successful dependency installation because `node_modules` is currently partial after the reboot-interrupted `npm ci`.
- Translation through Codex Spark may still be resource-intensive; the first remote run after this fix should be monitored for memory and process state.
