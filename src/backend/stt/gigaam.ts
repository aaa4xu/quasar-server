import { getTraceData, Span, startInactiveSpan } from '@sentry/node'
import { WebSocket } from 'ws'

import { OpusProcessor } from '../../codecs/opus-processor'
import { getLogger } from '../../logger'
import { STTBackend, STTBackendSession } from '../backend'

interface GigaAMMessage {
  end_of_utt: boolean;
  text: string;
}

class GigaAMSTTSession extends STTBackendSession {
  private readonly logger = getLogger<GigaAMSTTSession>()
  private readonly opusProcessor: OpusProcessor
  private spanEnded = false
  private stopped = false

  constructor (private readonly webSocket: WebSocket, private readonly span?: Span) {
    super()
    this.opusProcessor = new OpusProcessor(
      data => this.send(data, true),
      sampleRate => this.send(JSON.stringify({ sample_rate: sampleRate }), false)
    )

    webSocket.on('message', (message) => {
      if (this.stopped) return
      const simplifiedMessage = Array.isArray(message) ? Buffer.concat(message) : Buffer.from(message as ArrayBuffer)
      const response = JSON.parse(simplifiedMessage.toString('utf8')) as GigaAMMessage
      if (!this.stopped) {
        this.chunkTranscribed({
          endOfUtt: response.end_of_utt,
          text: response.text
        })
      }
    })
    webSocket.on('close', () => {
      this.stopped = true
    })
  }

  close (): void {
    if (this.stopped) return
    this.stopped = true
    if (!this.spanEnded) {
      this.spanEnded = true
      this.span?.end()
    }
    if (this.webSocket.readyState === this.webSocket.OPEN) {
      this.webSocket.close()
    }
  }

  async transcribeChunk (chunk: Buffer): Promise<void> {
    if (this.stopped) return
    await this.opusProcessor.handleAudioData(chunk)
  }

  private send (data: Buffer | string, binary: boolean): Promise<void> {
    if (this.stopped || this.webSocket.readyState !== this.webSocket.OPEN) {
      return Promise.resolve()
    }
    return new Promise(resolve => {
      this.webSocket.send(data, { binary }, error => {
        if (error && !this.stopped) {
          this.logger.warn({ error: String(error), event: 'gigaam_socket_send_failed' })
        }
        resolve()
      })
    })
  }
}

export class GigaAMSTTBackend implements STTBackend {
  constructor (private readonly endpoint: string) {}

  startTranscribing (parentSpan?: Span): Promise<STTBackendSession> {
    let span: Span | undefined
    if (parentSpan) {
      span = startInactiveSpan({
        name: 'GigaAM STT transcribing',
        op: 'gigaam-stt',
        parentSpan
      })
    }
    const webSocket = new WebSocket(this.endpoint, span
      ? {
          headers: {
            ...getTraceData({
              span: startInactiveSpan({
                name: 'GigaAM STT transcribing connection',
                op: 'gigaam-stt-connection',
                parentSpan: span
              })
            })
          }
        }
      : {})
    return new Promise((resolve, reject) => {
      let opened = false
      webSocket.on('error', error => {
        if (!opened) reject(error)
      })
      webSocket.on('close', () => {
        if (!opened) reject(new Error('Unexpected close'))
      })
      webSocket.on('open', () => {
        opened = true
        resolve(new GigaAMSTTSession(webSocket, span))
      })
    })
  }
}
