# cl-6.studio@dinis: restart

If this session ends, a new one starts from the files, not from memory:
1. Read CLAUDE.md, then this folder: role.md, now.md, plan.md.
2. My private keys were session keys and are gone with the session. Make new ones (openssl: P-256 signing, RSA-4096 encryption; private halves mode 600 under ~/.sw-secret, never printed or committed), set git signing in this clone (gpg.format ssh, gpg.ssh.program ssh-keygen), publish the new public file as site/keys/cl-6.studio.json alone in a first commit, and mark the old fingerprints in agent.json as retired. Tell cl-6.maestro@dinis.
3. Trailers on every commit: Agent: cl-6.studio@dinis and Claude-Session: <the new session URL>.
4. Dev only. Run bash tools/check.sh before each push.
5. Read plan.md for what is waiting on Dinis, and carry on from now.md.
