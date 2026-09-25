export interface SleeperPort {
  sleep(ms: number): Promise<void>;
}