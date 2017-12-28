import alsaaudio
import numpy as np
import aubio
import requests as r
import time
"""
    TODO: 
    - Add args for host.

    Nice to have: 
    - Better frequency filtering. 
"""

HOST = 'http://localhost:8080/'


def send_detected_frequency(frequency):
    """
        Sends detected frequency to Node backend.
    """
    try: 
        r.get(HOST + '?frequency=' + str(frequency))
    except r.exceptions.ConnectionError:
        print('\033[91m Could not connect to host:\033[39m \t{} '.format(HOST))

def listen():
    """ 
        Listens to default audio input and detects the frequency. 
        Keeps track of the 10 latest samples and takes an average
        that can be sent to Node backend.
    """
    latest_freqs = [0,0,0,0,0,0,0,0,0,0]
    
    # constants
    samplerate = 44100
    win_s = 2048
    hop_s = win_s // 2
    framesize = hop_s

    # set up audio input
    recorder = alsaaudio.PCM(type=alsaaudio.PCM_CAPTURE)
    recorder.setperiodsize(framesize)
    recorder.setrate(samplerate)
    recorder.setformat(alsaaudio.PCM_FORMAT_FLOAT_LE)
    recorder.setchannels(1)

    # create aubio pitch detection (first argument is method, "default" is
    # "yinfft", can also be "yin", "mcomb", fcomb", "schmitt").
    pitcher = aubio.pitch("default", win_s, hop_s, samplerate)
    # set output unit (can be 'midi', 'cent', 'Hz', ...)
    pitcher.set_unit("Hz")
    # ignore frames under this level (dB)
    pitcher.set_silence(-40)

    print("Starting to listen, press Ctrl+C to stop")

    # main loop
    i = 0
    old_average = 0
    t = 0
    while True:
        try:
            # read data from audio input
            _, data = recorder.read()
            # convert data to aubio float samples
            samples = np.fromstring(data, dtype=aubio.float_type)
            # pitch of current frame
            freq = pitcher(samples)[0]
            latest_freqs[i] = freq

            i += 1
            i = 0 if i == 10 else i
            # 
            new_average = sum(latest_freqs) // 10
            if abs(new_average - old_average) > 20 and new_average > 300:
                if time.time() - t > 2: # Add a timeout
                    t = time.time()
                    old_average = new_average
                    print(old_average)
                    send_detected_frequency(old_average)
        except KeyboardInterrupt:
            print("Ctrl+C pressed, exiting")
            break

if __name__ == '__main__':
    listen()