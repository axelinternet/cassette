import sys
from aubio import source, pitch
import pyaudio
import wave

# SETUP
CHUNK = 1024
FORMAT = pyaudio.paInt16
CHANNELS = 2
RATE = 44100
WAVE_OUTPUT_FILENAME = "output.wav"

# TEST SETUP
WAV_FILE = 'data/440_16.wav'

def capture_audio_sample(seconds):
    """
        Listens to audio input, takes a sample of a specific length and returns it as an
            array of samples
    """

    p = pyaudio.PyAudio()

    stream = p.open(format=FORMAT,
        channels=CHANNELS,
        rate=RATE,
        input=True,
        frames_per_buffer=CHUNK)

    print('Started recording')

    frames = []

    for i in range(0, int(RATE / CHUNK * seconds)):
        data = stream.read(CHUNK)
        frames.append(data)

    print('Stopped recording')

    print('Godtycklig frame:', frames[2])
    print('\n\n')
    stream.stop_stream()
    stream.close()
    p.terminate()
    wf = wave.open(WAVE_OUTPUT_FILENAME, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()
    return frames

def detect_pitch(filename):
    """
        Returns detected pitches and averages from a wav file. Should be revamped to take an
        array of samples instead of loading a file itself.
    """
    downsample = 1
    samplerate = 44100 // downsample
    win_s = 4096 // downsample # fft size
    hop_s = 512  // downsample # hop size
    s = source(filename, samplerate, hop_s)
    samplerate = s.samplerate
    tolerance = 0.8
    pitch_o = pitch("yin", win_s, hop_s, samplerate)
    pitch_o.set_unit("midi")
    pitch_o.set_tolerance(tolerance)
    pitches = []
    confidences = []
    while True:
        samples, read = s()
        current_pitch = pitch_o(samples)[0]
        current_pitch = int(round(current_pitch))
        confidence = pitch_o.get_confidence()
        #if confidence < 0.8: current_pitch = 0.
        #print("%i %f" % (current_pitch, confidence))
        pitches += [current_pitch]
        confidences += [confidence]
        if read < hop_s: break

    avg_pitch = round(sum(pitches) / float(len(pitches)))
    avg_confidence = sum(confidences) / float(len(confidences))
    return avg_pitch, avg_confidence, pitches,confidences

if __name__ == '__main__':
    samples = capture_audio_sample(1)
    #a,b,c,d = detect_pitch('out.WAV')
    #print(c)
    #print(samples)