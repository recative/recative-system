export interface IDiagnosisInformation {
  browserVariable: boolean;
  glSupport: boolean;
  stencilSupport: boolean;
  performanceCaveat: boolean;
  summary: boolean;
  device: string;
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

const getGraphicsCardName = () => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('experimental-webgl') || canvas.getContext('webgl');

  if (!gl) return 'Unknown';

  const ext = (gl as WebGLRenderingContext).getExtension(
    'WEBGL_debug_renderer_info',
  );

  if (!ext) return 'Unknown';

  return (gl as WebGLRenderingContext).getParameter(
    ext.UNMASKED_RENDERER_WEBGL,
  ) as string;
};

export const getDiagnosisInformation = () => {
  if (!diagnosisInformation) {
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
      device: getGraphicsCardName(),
    };
  }

  return diagnosisInformation;
};
