import { getGPUTier, TierType } from 'detect-gpu';

export interface IDiagnosisInformation {
  browserVariable: boolean;
  glSupport: boolean;
  stencilSupport: boolean;
  performanceCaveat: boolean;
  summary: boolean;
  device: string | undefined;
  tier: number;
  type: TierType;
  isMobile?: boolean | undefined;
  fps?: number | undefined;
}

let diagnosisInformation: IDiagnosisInformation | null = null;

const ifSupportWebGL = (options?: WebGLContextAttributes) => {
  if (!window.WebGLRenderingContext) return false;

  try {
    const canvas = document.createElement('canvas');

    let context = (canvas.getContext('webgl', options)
      || canvas.getContext(
        'experimental-webgl',
        options,
      )) as WebGLRenderingContext | null;

    context?.getExtension('WEBGL_lose_context')?.loseContext?.();

    const available = !!context;

    context = null;

    return available;
  } catch (e) {
    return false;
  }
};

export const getDiagnosisInformation = async () => {
  if (!diagnosisInformation) {
    const { gpu: device, ...tier } = await getGPUTier({
      failIfMajorPerformanceCaveat: false
    });

    diagnosisInformation = {
      browserVariable: !!window.WebGLRenderingContext,
      glSupport: ifSupportWebGL(),
      stencilSupport: ifSupportWebGL({ stencil: true }),
      performanceCaveat: ifSupportWebGL({
        failIfMajorPerformanceCaveat: true,
      }),
      summary: ifSupportWebGL({
        stencil: true,
        failIfMajorPerformanceCaveat: true,
      }),
      device,
      ...tier,
    };
  }

  return diagnosisInformation;
};
