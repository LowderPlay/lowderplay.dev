import {gl} from '../glContext.ts';

export class Program {
  private readonly program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation>;

  constructor(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.program = createProgram(vertexShader, fragmentShader);
    this.uniforms = getUniforms(this.program);
  }

  bind() {
    gl.useProgram(this.program);
  }
}

function createProgram(vertexShader: WebGLShader, fragmentShader: WebGLShader) {
  let program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    console.trace(gl.getProgramInfoLog(program));

  return program;
}

function getUniforms(program: WebGLProgram) {
  let uniforms: Record<string, WebGLUniformLocation> = {};
  let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < uniformCount; i++) {
    let uniformName = gl.getActiveUniform(program, i)!.name;
    uniforms[uniformName] = gl.getUniformLocation(program, uniformName)!;
  }
  return uniforms;
}