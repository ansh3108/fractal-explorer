export const vertexShaderSource = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_offset;
uniform float u_zoom;
uniform float u_time;

out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    vec2 c = uv / u_zoom + u_offset;
    vec2 z = vec2(0.0);
    
    float iter = 0.0;
    const float max_iter = 400.0;

    for(float i = 0.0; i < max_iter; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if(dot(z, z) > 4.0) break;
        iter++;
    }

    vec3 color = vec3(0.0);
    if(iter < max_iter) {
        float log_z = log(sqrt(dot(z, z)));
        float nu = log(log_z / log(2.0)) / log(2.0);
        float smooth_iter = iter + 1.0 - nu;
        color = palette(smooth_iter * 0.05 - u_time * 0.2);
    }

    fragColor = vec4(color, 1.0);
}
`;
