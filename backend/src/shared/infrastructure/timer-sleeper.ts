import { SleeperPort } from '../ports/sleeper.port';

export class TimerSleeper implements SleeperPort {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}