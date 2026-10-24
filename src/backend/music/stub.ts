import { MusicTrack } from '@v3rt3p/types/music'

import { MusicBackend } from '../backend'

export class StubMusicBackend extends MusicBackend {
  async advanceQueueBackward (): Promise<void> {}

  async advanceQueueForward (): Promise<void> {}

  async getCurrentTrack (): Promise<MusicTrack | null> {
    return null
  }

  async getNextTrack (): Promise<MusicTrack | null> {
    return null
  }
}
