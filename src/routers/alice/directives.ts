import { ProcessorDirectiveFunctions } from '@v3rt3p/types/processor'
import z from 'zod'

import { getLogger } from '../../logger'
import { encodeProtobufStruct } from '../../protobuf'
import proto from '../../protos/protos'

export interface DirectiveCallData {
  arguments: unknown,
  name: string
}

export type DirectiveFunctionHandler<T> = (argument: T) => TDirective

export interface DirectiveFunctionProvider {
  convertToDirective(call: DirectiveCallData): null | TDirective
  getSupportedFunctions(): ProcessorDirectiveFunctions
}

export type TDirective = proto.NAlice.NAliceApi.ITDirective

export class AbstractDirectiveFunctionProvider implements DirectiveFunctionProvider {
  private readonly functionHandlerMap: Map<string, {
    description: string
    handler: DirectiveFunctionHandler<unknown>
    schema: z.ZodType<unknown>
  }> = new Map()

  private readonly logger = getLogger<AbstractDirectiveFunctionProvider>()

  convertToDirective (call: DirectiveCallData): null | TDirective {
    const name = call.name.replace(/^smart_speaker_/, '')

    const handler = this.functionHandlerMap.get(name)
    if (!handler) {
      this.logger.warn(`directive function '${name}' not found`)
      return null
    }

    try {
      return handler.handler(handler.schema.parse(call.arguments))
    } catch (error) {
      this.logger.warn('failed to convert to directive', error)
    }

    return null
  }

  getSupportedFunctions (): ProcessorDirectiveFunctions {
    return Object.fromEntries([...this.functionHandlerMap.entries()].map(
      (item) => [`smart_speaker_${item[0]}`, {
        arguments: item[1].schema.toJSONSchema(),
        description: item[1].description
      }]))
  }

  protected addFunction<T> (name: string, description: string,
    schema: z.ZodType<T>, handler: DirectiveFunctionHandler<T>): void {
    if (this.functionHandlerMap.has(name)) {
      throw new Error(`directive function handler with name '${name}' already registered`)
    }
    this.functionHandlerMap.set(name, {
      description,
      handler: handler as DirectiveFunctionHandler<unknown>,
      schema
    })
  }
}

export const pushUpdateConfigDirective = {
  Name: 'push_update_config',
  Type: 'client_action'
}

export const ttsPlayPlaceholderDirective = (onFinish?: proto.NAlice.NAliceApi.TDirective.ITOnFinishEvent) => ({
  AnalyticsType: 'tts_play_placeholder',
  IsLedSilent: true,
  Name: 'tts_play_placeholder',
  Payload: encodeProtobufStruct({
    channel: 'Dialog'
  }),
  Type: 'client_action',
  ...(onFinish
    ? {
        OnFinish: onFinish
      }
    : {})
})

export const mmSemanticFrame = (payload?: proto.google.protobuf.IStruct, payloadRaw?: Buffer) => ({
  Name: '@@mm_semantic_frame',
  Payload: payload,
  PayloadRaw: payloadRaw,
  Type: 'server_action'
})
