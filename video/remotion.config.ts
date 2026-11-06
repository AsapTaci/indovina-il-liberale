import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setEntryPoint('./src/index.ts');

// In questo ambiente non si può scaricare il browser di Remotion: usiamo il
// Chromium già installato. Se la variabile non c'è, Remotion scarica il suo.
if (process.env.REMOTION_BROWSER) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
}
