import sys, json, wave, numpy as np
from faster_whisper import WhisperModel
wav, out = sys.argv[1:3]
with wave.open(wav) as w: sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
idx = np.arange(0, len(a), sr/16000); a16 = np.interp(idx, np.arange(len(a)), a).astype(np.float32)
m = WhisperModel("base.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a16, word_timestamps=True)
w = [(x.word.strip(), round(x.start,2), round(x.end,2)) for s in segs for x in s.words]
json.dump(w, open(out,"w")); print(len(w), w[:8])
