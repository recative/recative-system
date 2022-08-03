import { build } from './build';
import { start } from './start';

const args = process.argv.slice(2);

const commands: Record<string, () => void> = {
  build,
  start,
};

if (args.length < 1) {
  console.log(`Available Scripts: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
const command = args[0];
if (command in commands) {
  commands[command]();
} else {
  console.log(`Script ${command} not found`);
  console.log(`Available Scripts: ${Object.keys(commands).join(', ')}`);
  process.exit(1);
}
