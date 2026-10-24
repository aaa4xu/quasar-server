import z from 'zod'

import { encodeProtobufStruct } from '../../protobuf'
import { AbstractDirectiveFunctionProvider, WrappedDirective } from './directives'

const bluetoothEnableDirective = {
  quasarDirective: {
    Name: 'start_bluetooth',
    Payload: {},
    Type: 'client_action'
  }
}

const bluetoothDisableDirective = {
  quasarDirective: {
    Name: 'stop_bluetooth',
    Payload: {},
    Type: 'client_action'
  }
}

const soundSetLevelDirective = (level: number) => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_set_level',
    Payload: encodeProtobufStruct({
      new_level: level,
      new_percent_level: level * 10
    }),
    Type: 'client_action'
  }
})

const playIotSoundDirective = (isPowerOn: boolean) => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'local_audio_file_play',
    Payload: encodeProtobufStruct({
      play_times: 1,
      sound_to_play: isPowerOn ? 'AliceIoTSoundsTurnOn' : 'AliceIoTSoundsTurnOff'
    }),
    Type: 'client_action'
  }
})

const soundLouderDirective = {
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_louder',
    Payload: {},
    Type: 'client_action'
  }
}

const soundQuieterDirective = {
  quasarDirective: {
    IsLedSilent: true,
    Name: 'sound_quiter',
    Payload: {},
    Type: 'client_action'
  }
}

export const playerStopDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_stop'
  },
  quasarDirective: {
    IsLedSilent: true,
    Name: 'clear_queue',
    Payload: {},
    Type: 'client_action'
  }
}

const playerStartDirectve: WrappedDirective = {
  internalDirective: {
    type: 'music_play'
  }
}

const playerNextTrackDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_next_track'
  }
}

const playerPreviousTrackDirective: WrappedDirective = {
  internalDirective: {
    type: 'music_previous_track'
  }
}

const playerRewindDirective = (amountMs: number, type: 'Backward' | 'Forward') => ({
  quasarDirective: {
    IsLedSilent: true,
    Name: 'audio_player_rewind',
    Payload: encodeProtobufStruct({
      amount_ms: amountMs,
      type
    }),
    Type: 'client_action'
  }
})

export const textToDirectiveMap: Record<string, WrappedDirective> = {
  громче: soundLouderDirective,
  пауза: playerStopDirective,
  продолжи: playerStartDirectve,
  стоп: playerStopDirective,
  тише: soundQuieterDirective
}

export class BaseDirectiveFunctionProvider extends AbstractDirectiveFunctionProvider {
  constructor () {
    super()

    this.addFunction('player_play', 'Starts music, or continues if was paused', z.unknown(), () => playerStartDirectve)
    this.addFunction('player_pause', 'Pause music if it is playing', z.unknown(), () => playerStopDirective)
    this.addFunction('player_next_track', 'Switch to next track', z.unknown(), () => playerNextTrackDirective)
    this.addFunction('player_previous_track', 'Switch to previous track', z.unknown(), () => playerPreviousTrackDirective)
    this.addFunction('player_rewind', 'Rewind music if it is playing', z.object({
      amountMs: z.number().int().positive().describe('Amount to rewind in ms (always positive)'),
      direction: z.union([z.literal('Forward'), z.literal('Backward')])
    }), (data) => playerRewindDirective(data.amountMs, data.direction))

    this.addFunction('bluetooth', 'Enable or disable Bluetooth on smart speaker', z.object({
      enable: z.boolean()
    }),
    (data) => data.enable ? bluetoothEnableDirective : bluetoothDisableDirective)
    this.addFunction('set_sound_volume_louder', 'Atomically make smart speaker volume louder', z.unknown(),
      () => soundLouderDirective)
    this.addFunction('set_sound_volume_quieter', 'Atomically make smart speaker volume quieter', z.unknown(),
      () => soundQuieterDirective)
    this.addFunction('set_sound_volume', 'Set volume on smart speaker', z.object({
      volume: z.number().int().min(1).max(10)
    }), (data) => soundSetLevelDirective(data.volume))
    this.addFunction('play_iot_sound', 'Play IoT power on/power off sound on smart speaker', z.object({
      isPowerOn: z.boolean()
    })
      .describe('true if "on" sound, false if "off" sound'), (data) => playIotSoundDirective(data.isPowerOn))
  }
}

export function getDirectiveFunctionProvider (_platform: string) {
  return new BaseDirectiveFunctionProvider()
}
