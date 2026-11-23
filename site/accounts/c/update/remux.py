# Re-master a Reel's sound without re-rendering its picture: the picture is copied, the voice re-mastered as make.py does
# (plain gain to -18 LUFS, 4x-oversampled limiter at -2 dBTP, soxr, mono AAC 192 kb/s). Apache-2.0.
# Usage: python3 remux.py <video.mp4 in> <voice.wav> <lead seconds> <video.mp4 out>
import sys, re, subprocess
vin, voice, lead, vout = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
meas = subprocess.run(["ffmpeg","-hide_banner","-i",voice,"-af","loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True).stderr
gain = -18.0 - float(re.search(r'"input_i"\s*:\s*"(-?[0-9.]+)"', meas).group(1))
af = (f"volume={gain:.2f}dB,aresample=192000:resampler=soxr:precision=28,alimiter=limit=0.7943:attack=5:release=60:level=false,"
      f"aresample=48000:resampler=soxr:precision=28,adelay={round(lead*1000)}:all=1,apad")
subprocess.run(["ffmpeg","-loglevel","error","-y","-i",vin,"-i",voice,"-filter_complex",f"[1:a]{af}[a]","-map","0:v","-map","[a]","-c:v","copy",
                "-c:a","aac","-b:a","192k","-ac","1","-ar","48000","-shortest","-movflags","+faststart",vout],check=True)
tp = subprocess.run(["ffmpeg","-hide_banner","-i",vout,"-af","ebur128=peak=true","-f","null","-"],capture_output=True,text=True).stderr
print("remuxed", vout, re.findall(r"I:\s+(-?[0-9.]+) LUFS", tp)[-1], "LUFS, true peak", re.findall(r"Peak:\s+(-?[0-9.]+)", tp)[-1], "dBFS")
