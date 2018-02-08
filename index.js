/**
 * @module AudiobufferToWav
 */

/**
 * @param {AudioBuffer} buffer 
 * @param {object} opt Nullable
 * @param {number} [opt.float32]
 * @returns {ArrayBuffer}
 */
export function audioBufferToWav (buffer, opt) {
  const leftChannel = buffer.getChannelData(0)
  const rightChannel = buffer.numChannels > 1 ? buffer.getChannelData(1) : null

  return audioChannelDataToWav(leftChannel, rightChannel, opt)
}

/**
 * @param {Float32Array} leftChannel 
 * @param {Float32Array} rightChannel
 * @param {object} opt Nullable
 * @param {number} [opt.float32]
 * @returns {ArrayBuffer}
 */
export function audioChannelDataToWav (leftChannel, rightChannel, opt) {
  opt = opt || {}

  const format = opt.float32 ? 3 : 1
  const bitDepth = format === 3 ? 32 : 16

  let interleavedChannelData
  if (leftChannel && rightChannel) {
    interleavedChannelData = interleaveAudioChannelData(leftChannel, rightChannel)
  } else if (leftChannel) {
    interleavedChannelData = leftChannel
  } else {
    throw Error('Either both L&R (stereo) or left (mono) data has to be passed')
  }

  return encodeWAV(interleaveAudioChannelData, format, sampleRate, 2, bitDepth)
}

/**
 * @param {Float32Array} samples 
 * @param {number} format 1 or 3 (pcm16 (int) or float32)
 * @param {number} sampleRate 
 * @param {number} numChannels 
 * @param {number} bitDepth 32 or 16
 * @returns {ArrayBuffer}
 */
export function encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
  const view = new DataView(buffer)

  /* RIFF identifier */
  writeString(view, 0, 'RIFF')
  /* RIFF chunk length */
  view.setUint32(4, 36 + samples.length * bytesPerSample, true)
  /* RIFF type */
  writeString(view, 8, 'WAVE')
  /* format chunk identifier */
  writeString(view, 12, 'fmt ')
  /* format chunk length */
  view.setUint32(16, 16, true)
  /* sample format (raw) */
  view.setUint16(20, format, true)
  /* channel count */
  view.setUint16(22, numChannels, true)
  /* sample rate */
  view.setUint32(24, sampleRate, true)
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * blockAlign, true)
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, blockAlign, true)
  /* bits per sample */
  view.setUint16(34, bitDepth, true)
  /* data chunk identifier */
  writeString(view, 36, 'data')
  /* data chunk length */
  view.setUint32(40, samples.length * bytesPerSample, true)
  if (format === 1) { // Raw PCM
    floatTo16BitPCM(view, 44, samples)
  } else {
    writeFloat32(view, 44, samples)
  }

  return buffer
}

/**
 * @param {Float32Array} inputL 
 * @param {Float32Array} inputR 
 * @returns {Float32Array}
 */
export function interleaveAudioChannelData (inputL, inputR) {
  const length = inputL.length + inputR.length
  const result = new Float32Array(length)

  let index = 0
  let inputIndex = 0

  while (index < length) {
    result[index++] = inputL[inputIndex]
    result[index++] = inputR[inputIndex]
    inputIndex++
  }
  return result
}

/**
 * 
 * @param {ArrayBuffer} output 
 * @param {number} offset 
 * @param {Float32Array} input 
 */
function writeFloat32 (output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 4) {
    output.setFloat32(offset, input[i], true)
  }
}

function floatTo16BitPCM (output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]))
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
}

function writeString (view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}
