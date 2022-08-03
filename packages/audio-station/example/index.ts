import {
  AudioMixer, AudioSource, getGlobalAudioStation,
} from '../src';

const station = getGlobalAudioStation();

const activate = document.getElementById('activate')!;
const playground = document.getElementById('playground')!;
activate!.addEventListener('click', () => {
  station.activate();
});

const music = 'https://upload.wikimedia.org/wikipedia/commons/5/52/L-E-R-U-O_-_a_m_b_i_e_n_t_%28cc-by-3.0%29.mp3';
const se = 'https://upload.wikimedia.org/wikipedia/commons/1/16/Dropmetalthing.ogg';
Promise.all([
  station.load(music), station.load(se), station.activate(),
]).then(([clip]) => {
  console.log(clip.duration);
  activate.style.display = 'none';
  playground.style.display = '';
  const mixer = new AudioMixer(station);
  const source = new AudioSource(mixer, clip);
  const toggle = document.getElementById('toggle')!;
  const seekZero = document.getElementById('seek_zero')!;
  const seekNeg = document.getElementById('seek_neg')!;
  const seekEnd = document.getElementById('seek_end')!;
  const stop = document.getElementById('stop')!;
  const suspend = document.getElementById('suspend')!;
  const loop = document.getElementById('loop')!;
  const fade = document.getElementById('fade')!;
  const volume = document.getElementById('volume')! as HTMLInputElement;
  let playing = false;
  let suspended = false;
  toggle.addEventListener('click', () => {
    if (playing) {
      toggle.innerText = 'Play';
      source.pause();
    } else {
      toggle.innerText = 'Pause';
      source.play();
    }
    playing = !playing;
  });
  seekZero.addEventListener('click', () => {
    source.time = 0;
  });
  seekNeg.addEventListener('click', () => {
    source.time = -1;
  });
  seekEnd.addEventListener('click', () => {
    source.time = clip.duration - 1;
  });
  stop.addEventListener('click', () => {
    source.stop();
    playing = false;
    toggle.innerText = 'Play';
  });
  suspend.innerText = 'Suspend';
  suspend.addEventListener('click', () => {
    if (suspended) {
      suspend.innerText = 'Suspend';
      mixer.resume();
    } else {
      suspend.innerText = 'Resume';
      mixer.suspend();
    }
    suspended = !suspended;
  });
  loop.innerText = 'Loop: false';
  loop.addEventListener('click', () => {
    source.loop = !source.loop;
    loop.innerText = `Loop: ${source.loop}`;
  });
  fade.addEventListener('click', () => {
    source.fade(1, 0, 5);
  });
  volume.value = `${source.volume}`;
  volume.addEventListener('input', () => {
    source.volume = parseFloat(volume.value);
  });
  source.addEndHandler(() => {
    console.log('end');
    playing = false;
    toggle.innerText = 'Play';
  });
});
