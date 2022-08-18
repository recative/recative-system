import { ComponentFunctions, Core, CoreFunctions } from '../src';

const core = new Core({ initialEnvVariable: {} });

const contents = new Map<string, CoreFunctions>();
const progressElement = document.getElementById('progress')!;
const stateElement = document.getElementById('state')!;

const stageFunctions: Partial<ComponentFunctions> = {
  createContent: (id) => {
    contents.set(id, core.registerComponent(id, {
      showItself: () => {
        setTimeout(() => {
          contents.get(id)!.finishItself();
        }, 2000);
      },
      hideItself: () => {
      },
      destroyItself: () => {
        setTimeout(() => {
          contents.get(id)!.updateContentState('destroyed');
          core.unregisterComponent(id);
        }, 2000);
      },
    }));
    contents.get(id)!.updateContentState('preloading');
    setTimeout(() => {
      contents.get(id)!.updateContentState('ready');
    }, 1000);
  },
};
core.registerComponent('stage', stageFunctions);
core.play();
core.progress.subscribe((progress) => {
  progressElement.innerText = `${progress.segment}:${progress.progress}`;
});
core.managedCoreState.subscribe((states) => {
  stateElement.innerText = JSON.stringify(states);
});
setTimeout(() => {
  core.initializeEpisode({
    resources: [],
    assets: [{
      id: 'demo1',
      duration: Infinity,
      spec: {
        contentExtensionId: 'interaction',
        src: 'placeholder',
      },
      preloadDisabled: true,
      earlyDestroyOnSwitch: false,
    }, {
      id: 'demo2',
      duration: Infinity,
      spec: {
        contentExtensionId: 'interaction',
        src: 'placeholder',
      },
      preloadDisabled: true,
      earlyDestroyOnSwitch: false,
    }],
    preferredUploaders: [],
    trustedUploaders: [],
  });
}, 1000);
