# The agent's side of the productions feedback lane: configure, drain (read), reply, grant a sign-in. It holds no
# secret: it reads them from files under ~/.sg-send/lanes/ and ~/.sw-secret/ and never prints them. Grown by trial in
# the first session (the probe and test commands are kept as a record of how the API was learnt), so it is rough.
# Commands: read [--keep] | reply <browser fingerprint> <text> | grant <PK1 code> <name> <role> <out file> | selftest
# Vaults were made with: sgit --base-url https://dev.send.sgraph.ai --token "$SG_SEND_ACCESS_TOKEN" create <name> > private.log 2>&1
# (never to the screen: the output holds the vault key), then a README, sgit commit, sgit push. Apache-2.0.
import hashlib, json, os, re, subprocess, sys, urllib.request, urllib.error
D = os.path.expanduser('~/.sg-send/lanes'); V = os.path.join(D, 'productions-inbox'); HOST = 'https://dev.send.sgraph.ai'
def red(o):
    if isinstance(o, dict): return {k: red(v) for k, v in o.items()}
    if isinstance(o, list): return [red(x) for x in o[:5]]
    if isinstance(o, str) and len(o) >= 16 and re.fullmatch(r'[A-Za-z0-9+/=_:-]+', o): return f'<{len(o)} chars>'
    return o
def keys():
    vk = subprocess.run(['sgit', 'vault', 'show-key'], cwd=V, capture_output=True, text=True).stdout
    m = re.search(r'([A-Za-z0-9]{12,}:[a-z0-9]{6,12})', vk); assert m, 'no vault key found'
    out = subprocess.run(['sgit', 'vault', 'derive-keys', m.group(1)], capture_output=True, text=True).stdout
    kv = dict(re.findall(r'(\w+)\s*[:=]\s*([0-9a-f]{8,}|[a-z0-9]{6,12})', out)); return m.group(1), kv, out
def call(op, body, headers):
    vid = keys()[1].get('vault_id') or re.search(r':([a-z0-9]+)$', keys()[0]).group(1)
    req = urllib.request.Request(f'{HOST}/api/vault/append/{op}/{vid}', data=json.dumps(body).encode(), headers={'Content-Type': 'application/json', **headers})
    try: r = urllib.request.urlopen(req, timeout=30); return r.status, json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        t = e.read().decode(errors='replace')
        try: return e.code, json.loads(t)
        except Exception: return e.code, t[:200]
if __name__ == '__main__':
    vk, kv, out = keys(); print('derived fields:', sorted(kv.keys()))
    if sys.argv[1] == 'configure':
        body = json.loads(sys.argv[2]); h = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv.get('write_key', '')}
        st, resp = call('configure', body, h); open(os.path.join(D, 'productions.configure.json'), 'w').write(json.dumps(resp)); os.chmod(os.path.join(D, 'productions.configure.json'), 0o600)
        print(st, json.dumps(red(resp))[:900])
    if sys.argv[1] == 'probe':
        import secrets
        p = os.path.join(D, 'productions.lane.json')
        L = json.load(open(p)) if os.path.exists(p) else {'host': HOST, 'vault_id': kv['vault_id'], 'enum_key': secrets.token_hex(32), 'append_token': secrets.token_hex(32)}
        open(p, 'w').write(json.dumps(L)); os.chmod(p, 0o600)
        A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}
        E = {'x-sgraph-vault-enum-key': L['enum_key']}
        print('stats before :', *[json.dumps(red(x))[:300] for x in call('stats', {}, E)])
        print('write before :', *[json.dumps(red(x))[:300] for x in call('write', {'append_token': L['append_token'], 'payload': 'cHJvYmU='}, {})])
        for body in json.loads(sys.argv[2]):
            b = json.loads(json.dumps(body).replace('ENUM', L['enum_key']).replace('TOKEN', L['append_token']))
            print('configure', json.dumps(red(b)), '->', *[json.dumps(red(x))[:300] for x in call('configure', b, A)])
            print('   stats :', *[json.dumps(red(x))[:400] for x in call('stats', {}, E)])
            print('   write :', *[json.dumps(red(x))[:300] for x in call('write', {'append_token': L['append_token'], 'payload': 'cHJvYmU='}, {})])
    if sys.argv[1] == 'names':
        A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}
        st, r = call('configure', {n: None for n in sys.argv[2].split(',')}, A); print(st, json.dumps(red(r))[:1500])
    if sys.argv[1] == 'raw':
        A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}
        for b in json.loads(sys.argv[2]): print(json.dumps(b)[:120], '->', *[json.dumps(red(x))[:500] for x in call('configure', b, A)])
    if sys.argv[1] == 'setup':
        import hashlib
        L = json.load(open(os.path.join(D, 'productions.lane.json')))
        A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}; E = {'x-sgraph-vault-enum-key': L['enum_key']}
        h = lambda s: hashlib.sha256(s.encode()).hexdigest()
        print('configure:', *[json.dumps(red(x))[:300] for x in call('configure', {'enum_key_hash': h(L['enum_key']), 'lanes': {h(L['append_token']): {}}}, A)])
        print('stats    :', *[json.dumps(red(x))[:500] for x in call('stats', {}, E)])
        print('write    :', *[json.dumps(red(x))[:300] for x in call('write', {'append_token': L['append_token'], 'payload': 'cHJvYmU='}, {})])
        print('list     :', *[json.dumps(red(x))[:500] for x in call('list', {'include_content': False}, E)])
    if sys.argv[1] == 'wtest':
        L = json.load(open(os.path.join(D, 'productions.lane.json')))
        for hdr in ({'User-Agent': 'Mozilla/5.0', 'Origin': 'https://studio.agents.sovereignweb.site'}, {'User-Agent': 'curl/8'}, {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN']}):
            for body in ({'append_token': L['append_token'], 'payload': 'cHJvYmU='}, {'inbox': L['append_token'], 'payload': 'cHJvYmU='}):
                print(sorted(hdr), sorted(body), '->', *[json.dumps(red(x))[:160] for x in call('write', body, hdr)])
    if sys.argv[1] == 'w1':
        L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
        print('write:', *[json.dumps(red(x))[:300] for x in call('write', {'append_token': L['append_token'], 'payload': 'cHJvYmU='}, {})])
        print('list :', *[json.dumps(red(x))[:600] for x in call('list', {'include_content': False}, E)])
        print('stats:', *[json.dumps(red(x))[:600] for x in call('stats', {'inbox': L['append_token']}, E)])
def seal(text):
    import base64
    from cryptography.hazmat.primitives import serialization, hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    b = json.load(open(os.path.expanduser('~/.sw-secret/bundle.json'))); pem = b['encrypt'] if isinstance(b['encrypt'], str) else b['encrypt'].get('public_key') or b['encrypt'].get('pem')
    pub = serialization.load_pem_public_key(pem.encode()); k = AESGCM.generate_key(256); iv = os.urandom(12)
    c = AESGCM(k).encrypt(iv, text.encode(), None); w = pub.encrypt(k, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    e = lambda x: base64.b64encode(x).decode()
    return e(e(json.dumps({'v': 2, 'w': e(w), 'i': e(iv), 'c': e(c)}).encode()).encode())
if __name__ == '__main__' and sys.argv[1] == 'w2':
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
    print('bundle encrypt type:', type(json.load(open(os.path.expanduser('~/.sw-secret/bundle.json')))['encrypt']).__name__)
    print('write:', *[json.dumps(red(x))[:300] for x in call('write', {'append_token': L['append_token'], 'payload': seal(json.dumps({'type': 'probe', 'text': 'lane test from c.productions'}))}, {})])
    print('list :', *[json.dumps(red(x))[:600] for x in call('list', {'include_content': False}, E)])
if __name__ == '__main__' and sys.argv[1] == 'w3':
    import hashlib, time
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
    A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}
    print('stats bogus inbox:', *[json.dumps(red(x))[:120] for x in call('stats', {'inbox': 'ab' * 32}, E)])
    hb = hashlib.sha256(bytes.fromhex(L['append_token'])).hexdigest()
    print('configure bytes-hash:', *[json.dumps(red(x))[:200] for x in call('configure', {'lanes': {hb: {}}}, A)])
    time.sleep(35)
    print('write:', *[json.dumps(red(x))[:200] for x in call('write', {'append_token': L['append_token'], 'payload': seal('{"type":"probe"}')}, {})])
    print('list :', *[json.dumps(red(x))[:400] for x in call('list', {'include_content': False}, E)])
if __name__ == '__main__' and sys.argv[1] == 'w4':
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
    for hdr in ({'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Safari/605.1.15', 'Origin': 'https://studio.agents.sovereignweb.site', 'Referer': 'https://studio.agents.sovereignweb.site/'}, {'User-Agent': 'Mozilla/5.0'}):
        print(sorted(hdr), 'write:', *[json.dumps(red(x))[:200] for x in call('write', {'append_token': L['append_token'], 'payload': seal('{"type":"probe"}')}, hdr)])
    print('list :', *[json.dumps(red(x))[:500] for x in call('list', {'include_content': False}, E)])
    print('list processed:', *[json.dumps(red(x))[:300] for x in call('list', {'include_content': False, 'processed': True}, E)])
if __name__ == '__main__' and sys.argv[1] == 'anchors':
    import hashlib, time
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
    A = {'x-sgraph-access-token': os.environ['SG_SEND_ACCESS_TOKEN'], 'x-sgraph-vault-write-key': kv['write_key']}
    h = lambda s: hashlib.sha256(s.encode()).hexdigest()
    print('configure:', *[json.dumps(red(x))[:200] for x in call('configure', {'append_anchors': [h(L['append_token'])], 'enum_key_hash': h(L['enum_key'])}, A)])
    for wait in (2, 35):
        time.sleep(wait)
        print(f'write after {wait}s:', *[json.dumps(red(x))[:200] for x in call('write', {'append_token': L['append_token'], 'payload': seal(json.dumps({'type': 'probe', 'text': 'lane test from c.productions'}))}, {})])
    print('list :', *[json.dumps(red(x))[:500] for x in call('list', {'include_content': False}, E)])
def open_env(content_b64):
    import base64, glob
    from cryptography.hazmat.primitives import serialization, hashes
    from cryptography.hazmat.primitives.asymmetric import padding
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    b = json.load(open(os.path.expanduser('~/.sw-secret/bundle.json'))); d = glob.glob(os.path.expanduser(f"~/.sg-send/keys/{b['fingerprint'].replace(':', '_')}"))[0]
    pw = open(os.path.expanduser('~/.sw-secret/sgit-pass'), 'rb').read().strip()
    f = 'private_key.pem'
    key = serialization.load_pem_private_key(open(os.path.join(d, f), 'rb').read(), password=pw)
    raw = base64.b64decode(content_b64)
    for _ in range(3):
        try: e = json.loads(raw); break
        except Exception: raw = base64.b64decode(raw)
    k = key.decrypt(base64.b64decode(e['w']), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    return AESGCM(k).decrypt(base64.b64decode(e['i']), base64.b64decode(e['c']), None).decode()
def drain(mark=True):
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); E = {'x-sgraph-vault-enum-key': L['enum_key']}
    st, r = call('list', {'include_content': False}, E); ids = [x['file_id'] for x in r.get('entries', []) if x.get('inbox') == L['append_token']]; out = []
    for i in range(0, len(ids), 20):
        st, f = call('fetch', {'inbox': L['append_token'], 'file_ids': ids[i:i + 20]}, E)
        for x in f.get('files', []):
            try: out.append({'file_id': x['file_id'], 'message': json.loads(open_env(x['content']))})
            except Exception as ex: out.append({'file_id': x['file_id'], 'error': str(ex)[:120]})
    if mark and ids: call('mark-processed', {'inbox': L['append_token'], 'file_ids': ids}, E)
    return out
if __name__ == '__main__' and sys.argv[1] == 'drain':
    msgs = drain('--keep' not in sys.argv); p = os.path.join(D, 'productions.inbox.jsonl'); open(p, 'a').write(''.join(json.dumps(m) + '\n' for m in msgs)); os.chmod(p, 0o600)
    print(json.dumps(msgs, indent=1)[:3000])

if __name__ == '__main__' and sys.argv[1] == 'selftest':
    L = json.load(open(os.path.join(D, 'productions.lane.json')))
    print('write:', call('write', {'append_token': L['append_token'], 'payload': seal(json.dumps({'type': 'probe', 'text': 'lane test from c.productions'}))}, {}))
    print(json.dumps(drain(True), indent=1))
def verify(m):
    import base64
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
    s = m['signed']; pub = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(s['sign_raw'])); sig = base64.b64decode(s['sig'])
    try: pub.verify(encode_dss_signature(int.from_bytes(sig[:32], 'big'), int.from_bytes(sig[32:], 'big')), m['body'].encode(), ec.ECDSA(hashes.SHA256())); return True
    except Exception: return False
def reply(fingerprint, dh_raw_b64, text, re_=''):
    # seal a reply to one browser's key (ECDH P-256, HKDF 'ws-ecies-1', AES-GCM) into the site's replies folder
    import base64, datetime
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    import re as _re
    assert _re.fullmatch(r'[0-9a-f]{16}', fingerprint)
    peer = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(dh_raw_b64)); eph = ec.generate_private_key(ec.SECP256R1())
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'', info=b'ws-ecies-1').derive(eph.exchange(ec.ECDH(), peer)); iv = os.urandom(12)
    at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'); e = lambda x: base64.b64encode(x).decode()
    import uuid
    ct = AESGCM(key).encrypt(iv, json.dumps({'id': str(uuid.uuid4()), 're_id': re_, 'text': text, 'from': 'c.productions@SovereignWebsite.dinis'}).encode(), None)
    p = f'/home/user/Site__Agent__Studio/site/productions/send/replies/{fingerprint}.json'; L = json.load(open(p)) if os.path.exists(p) else []
    L.append({'at': at, 'epk': e(eph.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)), 'iv': e(iv), 'ct': e(ct)})
    open(p, 'w').write(json.dumps(L, indent=1) + '\n'); return p
if __name__ == '__main__' and sys.argv[1] == 'read':
    out = []
    for x in drain('--keep' not in sys.argv):
        m = x.get('message') or {}
        if m.get('type') == 'productions.message/v1': b = json.loads(m['body']); pp = os.path.join(D, 'productions.people.json'); who = (json.load(open(pp)) if os.path.exists(pp) else {}).get(m['signed']['key']); out.append({'file_id': x['file_id'], 'signature_valid': verify(m), 'signed_in_as': (who or {}).get('name') if who and who['sign_raw'] == m['signed']['sign_raw'] else None, 'key': m['signed']['key'], 'dh_raw': m['signed']['dh_raw'], 'sign_raw': m['signed']['sign_raw'], **b})
        else: out.append(x)
    p = os.path.join(D, 'productions.inbox.jsonl'); open(p, 'a').write(''.join(json.dumps(m) + '\n' for m in out)); os.chmod(p, 0o600)
    print(json.dumps([{k: v for k, v in m.items() if k not in ('dh_raw', 'sign_raw', 'record', 'public_key')} for m in out], indent=1))
if __name__ == '__main__' and sys.argv[1] == 'reply':
    rows = [json.loads(l) for l in open(os.path.join(D, 'productions.inbox.jsonl'))]; m = [r for r in rows if r.get('key') == sys.argv[2]][-1]
    re_ = m.get('id') or ''
    print(reply(sys.argv[2], m['dh_raw'], sys.argv[3], re_))
if __name__ == '__main__' and sys.argv[1] == 'browsertest':
    L = json.load(open(os.path.join(D, 'productions.lane.json')))
    r = subprocess.run(['node', sys.argv[2]], env={**os.environ, 'LANE_K': L['append_token']}, capture_output=True, text=True); print((r.stdout + r.stderr).replace(L['append_token'], '<token>')[-1500:])

def grant(code, name, role):
    # seal the lane token to one browser's key and sign the grant with my key: G1.<base64url(JSON)>
    import base64, datetime
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    assert code.startswith('PK1.'); raw = base64.urlsafe_b64decode(code[4:] + '=' * (-len(code[4:]) % 4)); assert len(raw) == 130, 'the key code is incomplete'
    sign_raw, dh_raw = raw[:65], raw[65:]; fp = hashlib.sha256(sign_raw).hexdigest()[:16]
    L = json.load(open(os.path.join(D, 'productions.lane.json'))); peer = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), dh_raw); eph = ec.generate_private_key(ec.SECP256R1())
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b'', info=b'ws-ecies-1').derive(eph.exchange(ec.ECDH(), peer)); iv = os.urandom(12); e = lambda x: base64.b64encode(x).decode()
    at = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    g = {'epk': e(eph.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint)), 'iv': e(iv), 'ct': e(AESGCM(key).encrypt(iv, json.dumps({'k': L['append_token'], 'name': name, 'role': role, 'at': at}).encode(), None))}
    sk = serialization.load_ssh_private_key(open(os.path.expanduser('~/.sw-secret/signing'), 'rb').read(), password=None)
    r, s_ = decode_dss_signature(sk.sign(f"{g['epk']}.{g['iv']}.{g['ct']}".encode(), ec.ECDSA(hashes.SHA256()))); g['sig'] = e(r.to_bytes(32, 'big') + s_.to_bytes(32, 'big'))
    pp = os.path.join(D, 'productions.people.json'); P = json.load(open(pp)) if os.path.exists(pp) else {}
    P[fp] = {'name': name, 'role': role, 'at': at, 'sign_raw': e(sign_raw), 'dh_raw': e(dh_raw)}; open(pp, 'w').write(json.dumps(P, indent=1)); os.chmod(pp, 0o600)
    return fp, 'G1.' + base64.urlsafe_b64encode(json.dumps(g).encode()).decode().rstrip('=')
if __name__ == '__main__' and sys.argv[1] == 'grant':
    import hashlib
    fp, code = grant(sys.argv[2], sys.argv[3], sys.argv[4]); open(sys.argv[5], 'w').write(code); print('grant for browser key', fp, 'written to', sys.argv[5], len(code), 'chars')
