export interface NpcDialogue {
  defaultMessage: string;

  startedFlag?: string;
  startedMessage?: string;

  completedFlag?: string;
  completedMessage?: string;

  setFlag?: string;
}
