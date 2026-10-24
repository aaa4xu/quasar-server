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

// export const soundLouderDirective = {
//   AnalyticsType: 'sound_louder',
//   IsLedSilent: true,
//   Name: 'sound_louder',
//   Payload: {},
//   Type: 'client_action'
// }

// export const soundQuieterDirective = {
//   AnalyticsType: 'sound_quiter',
//   IsLedSilent: true,
//   Name: 'sound_quiter',
//   Payload: {},
//   Type: 'client_action'
// }

export class BaseDirectiveFunctionProvider extends AbstractDirectiveFunctionProvider {
  constructor () {
    super()

    this.addFunction('bluetooth', 'Enable or disable Bluetooth on smart speaker', z.boolean(),
      (enable) => enable ? bluetoothEnableDirective : bluetoothDisableDirective)
    this.addFunction('set_sound_volume', 'Set volume on smart speaker', z.number().int().min(0).max(10),
      (level) => soundSetLevelDirective(level))
    this.addFunction('play_iot_sound', 'Play IoT power on/power off sound on smart speaker', z.boolean()
      .describe('true if "on" sound, false if "off" sound'), (isPowerOn) => playIotSoundDirective(isPowerOn))
  }
}
