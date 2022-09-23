import { Clip, mp3Adapter } from '../src/index';

const clip = new Clip({
  url: '/demo/deepnote.mp3',
  adapter: mp3Adapter,
});

clip.buffer().then(() => {
  const play = document.querySelector('#play') as HTMLButtonElement;
  const pause = document.querySelector('#pause') as HTMLButtonElement;
  const progress = document.querySelector('#progress') as HTMLSpanElement;

  play.disabled = false;
  pause.disabled = false;

  play.addEventListener('click', () => {
    clip.play();
  });

  pause.addEventListener('click', () => {
    clip.pause();
  });

  const updateProgress=()=>{
    progress.innerText=`${clip.currentTime}`
  }

  clip.on('play',updateProgress)
  clip.on('pause',updateProgress)
  clip.on('ended',updateProgress)

  const loop=()=>{
    updateProgress()
    requestAnimationFrame(loop)
  }
  loop()
});

(window as any).clip=clip;