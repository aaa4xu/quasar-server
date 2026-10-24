import z from 'zod'

import { encodeProtobufStruct } from '../../protobuf'
import { AbstractDirectiveFunctionProvider } from './directives'

const bluetoothEnableDirective = {
  Name: 'start_bluetooth',
  Payload: {},
  Type: 'client_action'
}

const bluetoothDisableDirective = {
  Name: 'stop_bluetooth',
  Payload: {},
  Type: 'client_action'
}

const soundSetLevelDirective = (level: number) => ({
  AnalyticsType: 'sound_set_level',
  IsLedSilent: true,
  Name: 'sound_set_level',
  Payload: encodeProtobufStruct({
    new_level: level,
    new_percent_level: level * 10
  }),
  Type: 'client_action'
})

const playIotSoundDirective = (isPowerOn: boolean) => ({
  IsLedSilent: true,
  Name: 'local_audio_file_play',
  Payload: encodeProtobufStruct({
    play_times: 1,
    sound_to_play: isPowerOn ? 'AliceIoTSoundsTurnOn' : 'AliceIoTSoundsTurnOff'
  }),
  Type: 'client_action'
})

const soundLouderDirective = {
  AnalyticsType: 'sound_louder',
  IsLedSilent: true,
  Name: 'sound_louder',
  Payload: {},
  Type: 'client_action'
}

const soundQuieterDirective = {
  AnalyticsType: 'sound_quiter',
  IsLedSilent: true,
  Name: 'sound_quiter',
  Payload: {},
  Type: 'client_action'
}

export class BaseDirectiveFunctionProvider extends AbstractDirectiveFunctionProvider {
  constructor () {
    super()

    this.addFunction('bluetooth', 'Enable or disable Bluetooth on smart speaker', z.object({
      enable: z.boolean()
    }),
    (data) => data.enable ? bluetoothEnableDirective : bluetoothDisableDirective)
    this.addFunction('set_sound_volume_louder', 'Atomically make smart speaker volume louder', z.object({}),
      () => soundLouderDirective)
    this.addFunction('set_sound_volume_quieter', 'Atomically make smart speaker volume quieter', z.object({}),
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
