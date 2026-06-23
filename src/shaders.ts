export const vertexShaderSource = `#version 300 es
in vec4 a_position;
void main() {
  gl_Position = a_position;
}
`;

export const fragmentShaderSource = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_offset_x;
uniform vec2 u_offset_y;
uniform vec2 u_pixel_step;
uniform float u_time;
uniform float u_max_iter;

out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

vec2 quickTwoSum(float a, float b) {
    float s = a + b;
    float e = b - (s - a);
    return vec2(s, e);
}

vec2 twoSum(float a, float b) {
    float s = a + b;
    float v = s - a;
    float e = (a - (s - v)) + (b - v);
    return vec2(s, e);
}

vec2 twoProd(float a, float b) {
    float p = a * b;
    
    uint ai = floatBitsToUint(a);
    float a_hi = uintBitsToFloat(ai & 0xFFFFF000u);
    float a_lo = a - a_hi;

    uint bi = floatBitsToUint(b);
    float b_hi = uintBitsToFloat(bi & 0xFFFFF000u);
    float b_lo = b - b_hi;

    float err1 = a_hi * b_hi - p;
    float err2 = a_hi * b_lo + a_lo * b_hi;
    float err3 = a_lo * b_lo;

    float err = (err1 + err2) + err3;
    return vec2(p, err);
}

vec2 ds_add(vec2 a, vec2 b) {
    vec2 s = twoSum(a.x, b.x);
    float e = s.y + a.y + b.y;
    return quickTwoSum(s.x, e);
}

vec2 ds_mul(vec2 a, vec2 b) {
    vec2 p = twoProd(a.x, b.x);
    p.y += a.x * b.y + a.y * b.x;
    return quickTwoSum(p.x, p.y);
}

void main() {
    vec2 pixel_offset = gl_FragCoord.xy - 0.5 * u_resolution.xy;
    
    vec2 dx = ds_mul(u_pixel_step, vec2(pixel_offset.x, 0.0));
    vec2 dy = ds_mul(u_pixel_step, vec2(pixel_offset.y, 0.0));
    
    vec2 cx = ds_add(u_offset_x, dx);
    vec2 cy = ds_add(u_offset_y, dy);
    
    vec2 zx = vec2(0.0);
    vec2 zy = vec2(0.0);
    
    float iter = 0.0;

    for(float i = 0.0; i < 5000.0; i++) {
        if(i >= u_max_iter) break;
        
        vec2 zx2 = ds_mul(zx, zx);
        vec2 zy2 = ds_mul(zy, zy);
        
        vec2 z2_sum = ds_add(zx2, zy2);
        if(z2_sum.x > 4.0) break;
        
        vec2 zx_zy = ds_mul(zx, zy);
        vec2 new_zy = ds_add(vec2(zx_zy.x * 2.0, zx_zy.y * 2.0), cy);
        vec2 new_zx = ds_add(ds_add(zx2, vec2(-zy2.x, -zy2.y)), cx);
        
        zx = new_zx;
        zy = new_zy;
        iter++;
    }

    vec3 color = vec3(0.0);
    if(iter < u_max_iter) {
        vec2 z2_sum = ds_add(ds_mul(zx, zx), ds_mul(zy, zy));
        float z_mag = sqrt(max(0.0, z2_sum.x));
        float log_z = log(z_mag);
        float nu = log(log_z / log(2.0)) / log(2.0);
        float smooth_iter = iter + 1.0 - nu;
        color = palette(smooth_iter * 0.05 - u_time * 0.2);
    }

    fragColor = vec4(color, 1.0);
}
`;
