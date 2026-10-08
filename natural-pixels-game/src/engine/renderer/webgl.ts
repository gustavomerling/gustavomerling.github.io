import { ELEMENTS } from '../../elements/registry.ts'
import type { Matter } from '../../elements/types.ts'
import type { Grid } from '../grid.ts'
import { CellColors } from './cellColors.ts'
import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders.ts'
import type { FrameInfo, Renderer } from './types.ts'

/** Kind codes for the shader (must match KIND_* in shaders.ts). */
const KIND: Record<Matter, number> = { empty: 0, static: 1, powder: 2, liquid: 3, gas: 4, energy: 5 }
/** Heat halo: starts at this temperature (°C) and is full this many degrees later. */
const HALO_START = 200
const HALO_RANGE = 800

/**
 * "Smooth" renderer: uploads the grid as two small textures each frame and lets a
 * fragment shader draw it at screen resolution (see shaders.ts).
 */
export class WebGLRenderer implements Renderer {
  readonly mode = 'smooth'
  private readonly canvas: HTMLCanvasElement
  private readonly gl: WebGL2RenderingContext
  private readonly grid: Grid
  private readonly program: WebGLProgram
  private readonly vao: WebGLVertexArrayObject
  private readonly colorTexture: WebGLTexture
  private readonly infoTexture: WebGLTexture
  private readonly colors: Uint32Array
  /** Byte view over `colors` for the texture upload. */
  private readonly colorBytes: Uint8Array
  private readonly info: Uint8Array
  private readonly cellColors: CellColors
  private readonly kinds = Uint8Array.from(ELEMENTS, (el) => KIND[el.matter])
  private readonly uniforms: Record<string, WebGLUniformLocation | null>

  /** Throws if WebGL2 isn't available, so the caller can fall back to Canvas 2D. */
  constructor(canvas: HTMLCanvasElement, grid: Grid) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false })
    if (!gl) throw new Error('WebGL2 is not supported')
    this.canvas = canvas
    this.gl = gl
    this.grid = grid
    this.program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER)
    this.vao = gl.createVertexArray()
    this.colorTexture = createTexture(gl, grid.width, grid.height)
    this.infoTexture = createTexture(gl, grid.width, grid.height)
    this.colors = new Uint32Array(grid.size)
    this.colorBytes = new Uint8Array(this.colors.buffer)
    this.info = new Uint8Array(grid.size * 4)
    this.cellColors = new CellColors(grid)

    const names = ['uColor', 'uInfo', 'uGrid', 'uTime', 'uLight', 'uSun', 'uCellsPerPixel']
    this.uniforms = Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(this.program, n)]))
  }

  resize(cssWidth: number, cssHeight: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr))
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr))
  }

  render({ time, light, sun }: FrameInfo) {
    const { gl, grid, info, kinds, uniforms } = this
    const { width, height, size, type, temp, shade } = grid

    this.cellColors.fill(this.colors)
    for (let i = 0, o = 0; i < size; i++, o += 4) {
      info[o] = kinds[type[i]]
      const heat = (temp[i] - HALO_START) / HALO_RANGE
      info[o + 1] = heat <= 0 ? 0 : heat >= 1 ? 255 : (heat * 255) | 0
      info[o + 2] = shade[i]
    }

    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.program)
    gl.bindVertexArray(this.vao)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.colorTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.colorBytes)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.infoTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, info)

    gl.uniform1i(uniforms.uColor, 0)
    gl.uniform1i(uniforms.uInfo, 1)
    gl.uniform2f(uniforms.uGrid, width, height)
    gl.uniform1f(uniforms.uTime, time)
    gl.uniform1f(uniforms.uLight, light)
    gl.uniform2f(uniforms.uSun, sun.x, sun.y)
    gl.uniform1f(uniforms.uCellsPerPixel, width / this.canvas.width)

    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  destroy() {
    const { gl } = this
    gl.deleteTexture(this.colorTexture)
    gl.deleteTexture(this.infoTexture)
    gl.deleteVertexArray(this.vao)
    gl.deleteProgram(this.program)
  }
}

function createTexture(gl: WebGL2RenderingContext, width: number, height: number): WebGLTexture {
  const texture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  return texture
}

function createProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram()
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Shader link failed: ${gl.getProgramInfoLog(program)}`)
  }
  return program
}

function compile(gl: WebGL2RenderingContext, kind: number, source: string): WebGLShader {
  const shader = gl.createShader(kind)
  if (!shader) throw new Error('Could not create shader')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Shader compile failed: ${gl.getShaderInfoLog(shader)}`)
  }
  return shader
}
